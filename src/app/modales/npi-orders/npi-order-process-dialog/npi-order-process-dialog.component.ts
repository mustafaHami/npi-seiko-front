import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from "@angular/core";
import { DatePipe, NgTemplateOutlet } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { DatePickerModule } from "primeng/datepicker";
import { InputNumberModule } from "primeng/inputnumber";
import { Button } from "primeng/button";
import { Tag } from "primeng/tag";
import { Chip } from "primeng/chip";
import { TooltipModule } from "primeng/tooltip";
import { OverlayBadge } from "primeng/overlaybadge";
import { TimelineModule } from "primeng/timeline";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { finalize, Observable, switchMap, tap } from "rxjs";
import {
  FileInfo,
  NpiOrder,
  Process,
  ProcessLine,
  ProcessLineMaterialDeliveryDateImport,
  ProcessLineRemainingTimeUpdate,
  ProcessLineStatus,
  ProcessLineStatusHistory,
  ProcessLineStatusUpdateBody,
} from "../../../../client/npiSeiko";
import { BaseModal } from "../../../models/classes/base-modal";
import { NpiOrderRepo } from "../../../repositories/npi-order.repo";
import { NpiOrderProcessLinePipe } from "../../../pipes/npi-order-process-line.pipe";
import { Icons } from "../../../models/enums/icons";
import { NpiService } from "../../../services/npi.service";
import {
  FileSelected,
  ManageFileComponent,
} from "../../../components/manage-file/manage-file.component";
import { ExcelUtilsService } from "../../../services/utils/excel-utils.service";
import { environment } from "../../../../environments/environment";
import { RegexPatterns } from "../../../services/utils/regex-patterns";
import { NoDoubleClickDirective } from "../../../directives/no-double-click.directive";
import { ModalService } from "../../../services/components/modal.service";
import { FileManageRepo } from "../../../repositories/file-manage-repo";

@Component({
  selector: "app-npi-order-process-dialog",
  imports: [
    NgTemplateOutlet,
    FormsModule,
    DatePickerModule,
    InputNumberModule,
    Button,
    Tag,
    Chip,
    TooltipModule,
    TimelineModule,
    DatePipe,
    NpiOrderProcessLinePipe,
    ManageFileComponent,
    NoDoubleClickDirective,
    OverlayBadge,
  ],
  templateUrl: "./npi-order-process-dialog.component.html",
  styleUrl: "./npi-order-process-dialog.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [NpiOrderProcessLinePipe],
})
export class NpiOrderProcessDialogComponent
  extends BaseModal
  implements OnInit
{
  npiOrder = signal<NpiOrder | undefined>(undefined);
  process = signal<Process | undefined>(undefined);
  loading = signal<boolean>(true);

  /** Index of the line currently in the extra-fields confirmation step */
  pendingLineIndex = signal<number | null>(null);
  /** Target status waiting for extra field confirmation */
  pendingTargetStatus = signal<ProcessLineStatus | null>(null);
  /** Manual date for material purchase */
  pendingLatestDeliveryDate: Date | null = null;
  /** Manual date for shipment completion */
  pendingShippingDate: Date | null = null;
  /** Customer approval start date (when moving to IN_PROGRESS) */
  pendingStartingCustomerApprovalDate: Date | null = null;
  /** Customer approval final date (when decision is YES) */
  pendingApprovalCustomerDate: Date | null = null;
  /** Decision when customer approval is completed */
  pendingCustomerApprovalDecision: "YES" | "NO" | null = null;
  /** Action chosen when customer approval decision is NO */
  pendingCustomerApprovalNoAction:
    | "RETURN_TO_MATERIAL_PURCHASE"
    | "ABORT_NPI"
    | null = null;

  /** Minimum date for material delivery date: today */
  readonly minDeliveryDate: Date = new Date();

  /** Minimum date for shipping date: max(materialLatestDeliveryDate, today) */
  minShippingDateProcess = signal<Date | null>(null);

  /** Minimum date for starting customer approval: shippingDate from the shipment line */
  minStartingCustomerApprovalDate = signal<Date | null>(null);

  /** Minimum date for approval customer date: startingCustomerApprovalDate from the customer approval line */
  minApprovalCustomerDate = signal<Date | null>(null);

  /** UID of the line currently in edit (reset) mode */
  editingLineUid = signal<string | null>(null);

  /** Remaining time inline update */
  remainingTimeLineUid = signal<string | null>(null);
  remainingTimeInput: number | null = null;
  updatingRemainingTime = signal<boolean>(false);
  hasRemainingTimeEditorOpen = computed(
    () => this.remainingTimeLineUid() !== null,
  );

  /** Number of files uploaded for the testing completion step */
  testingFileSelected = signal<FileSelected | null>(null);

  /** Import mode for material purchase delivery date */
  importMode = signal<boolean>(false);
  importedFileUid = signal<string | null>(null);
  /** Date extracted from the file — shown read-only, sent on confirm */
  importedDeliveryDate = signal<string | null>(null);
  extracting = signal<boolean>(false);
  /** 1-based display values — converted to 0-based before API call */
  importSheetDisplay: number = 1;
  importColumnDisplay: number = 1;
  importRowDisplay: number = 1;

  /** UID of the line whose history panel is currently open */
  historyLineUid = signal<string | null>(null);
  /** Cached histories per line UID */
  lineHistories = signal<Map<string, ProcessLineStatusHistory[]>>(new Map());
  /** Whether a history fetch is in progress */
  historyLoading = signal<boolean>(false);

  /** Lines that can be edited: first line, or line whose predecessor is COMPLETED */
  editableLineIndices = computed<Set<number>>(() => {
    const lines = this.process()?.lines ?? [];
    const editable = new Set<number>();
    lines.forEach((line, i) => {
      if (line.status === ProcessLineStatus.COMPLETED) {
        return;
      }
      if (i === 0 || lines[i - 1].status === ProcessLineStatus.COMPLETED) {
        editable.add(i);
      }
    });
    return editable;
  });
  readonly temporaryFilesUrl = `${environment.backendUrl}/temporary-files`;
  protected readonly ProcessLineStatus = ProcessLineStatus;
  protected readonly Icons = Icons;
  protected readonly orderedProcessLineStatuses = [
    ProcessLineStatus.NOT_STARTED,
    ProcessLineStatus.IN_PROGRESS,
    ProcessLineStatus.COMPLETED,
  ];
  protected excelUtils = inject(ExcelUtilsService);
  private npiOrderRepo = inject(NpiOrderRepo);
  private fileManageRepo = inject(FileManageRepo);
  private modalService = inject(ModalService);
  private npiService = inject(NpiService);
  readonly = computed(() => {
    const status = this.npiOrder()?.status;
    if (!status) return true;
    return this.npiService.isFinalOrder(status!);
  });
  private processLineStatusPipe = inject(NpiOrderProcessLinePipe);

  availableStatuses(line: ProcessLine): ProcessLineStatus[] {
    const all = [
      ProcessLineStatus.NOT_STARTED,
      ProcessLineStatus.IN_PROGRESS,
      ProcessLineStatus.COMPLETED,
    ].filter((s) => s !== line.status);

    // Lines requiring extra fields on IN_PROGRESS must go through IN_PROGRESS first
    if (
      line.status === ProcessLineStatus.NOT_STARTED &&
      (line.isMaterialPurchase || line.isCustomerApproval)
    ) {
      return all.filter((s) => s !== ProcessLineStatus.COMPLETED);
    }

    return all;
  }

  requiresExtraFields(
    line: ProcessLine,
    targetStatus: ProcessLineStatus,
  ): boolean {
    if (!line) return false;
    return (
      (!!line.isMaterialPurchase &&
        targetStatus === ProcessLineStatus.IN_PROGRESS) ||
      (!!line.isCustomerApproval &&
        targetStatus === ProcessLineStatus.IN_PROGRESS) ||
      (!!line.isShipment && targetStatus === ProcessLineStatus.COMPLETED) ||
      (!!line.isTesting && targetStatus === ProcessLineStatus.COMPLETED) ||
      (!!line.isCustomerApproval &&
        targetStatus === ProcessLineStatus.COMPLETED)
    );
  }

  canConfirmPending(line: ProcessLine): boolean {
    const target = this.pendingTargetStatus();
    if (!target) return false;
    if (line.isMaterialPurchase && target === ProcessLineStatus.IN_PROGRESS) {
      if (this.importMode()) {
        return this.importedDeliveryDate() !== null;
      }
      return this.pendingLatestDeliveryDate !== null;
    }
    if (line.isShipment && target === ProcessLineStatus.COMPLETED) {
      return this.pendingShippingDate !== null;
    }
    if (line.isTesting && target === ProcessLineStatus.COMPLETED) {
      return this.testingFileSelected() !== null;
    }
    if (line.isCustomerApproval && target === ProcessLineStatus.IN_PROGRESS) {
      return this.pendingStartingCustomerApprovalDate !== null;
    }
    if (line.isCustomerApproval && target === ProcessLineStatus.COMPLETED) {
      if (this.pendingCustomerApprovalDecision === null) {
        return false;
      }
      if (this.pendingCustomerApprovalDecision === "YES") {
        return this.pendingApprovalCustomerDate !== null;
      }
      if (this.pendingCustomerApprovalDecision === "NO") {
        return this.pendingCustomerApprovalNoAction !== null;
      }
      return true;
    }
    return true;
  }

  ngOnInit(): void {
    this.npiOrder.set(this.dataConfig.npiOrder as NpiOrder);
    this.loadProcess();
  }

  selectTargetStatus(
    line: ProcessLine,
    status: ProcessLineStatus,
    lineIndex: number,
  ): void {
    if (this.hasRemainingTimeEditorOpen()) {
      this.handleMessage.infoMessage(
        "Close remaining time editor before changing status",
      );
      return;
    }
    if (!this.requiresExtraFields(line, status)) {
      this.doUpdateStatus(line, status);
      return;
    }
    this.pendingLineIndex.set(lineIndex);
    this.pendingTargetStatus.set(status);
    this.pendingLatestDeliveryDate = null;
    this.pendingShippingDate = null;
    this.pendingStartingCustomerApprovalDate = null;
    this.pendingApprovalCustomerDate = null;
    this.pendingCustomerApprovalDecision = null;
    this.pendingCustomerApprovalNoAction = null;
    this.importMode.set(false);
    this.importedFileUid.set(null);
    this.importSheetDisplay = 1;
    this.importColumnDisplay = 1;
    this.importRowDisplay = 1;
    this.resolvePendingMinDates(line, status);
  }

  confirmPendingUpdate(line: ProcessLine): void {
    const target = this.pendingTargetStatus();
    if (!target || !this.canConfirmPending(line)) return;
    if (line.isCustomerApproval && target === ProcessLineStatus.COMPLETED) {
      this.handleCustomerApprovalCompletion(line);
      return;
    }
    this.doUpdateStatus(line, target);
  }

  backToStatusSelection(): void {
    this.clearPending();
  }

  toggleEditMode(line: ProcessLine): void {
    if (this.hasRemainingTimeEditorOpen()) {
      this.handleMessage.infoMessage(
        "Close remaining time editor before changing status",
      );
      return;
    }
    const uid = line.uid!;
    this.editingLineUid.set(this.editingLineUid() === uid ? null : uid);
  }

  selectResetStatus(
    line: ProcessLine,
    status: ProcessLineStatus,
    lineIndex: number,
  ): void {
    if (this.hasRemainingTimeEditorOpen()) {
      this.handleMessage.infoMessage(
        "Close remaining time editor before changing status",
      );
      return;
    }
    if (this.requiresExtraFields(line, status)) {
      this.editingLineUid.set(null);
      this.pendingLineIndex.set(lineIndex);
      this.pendingTargetStatus.set(status);
      this.importMode.set(false);
      this.importedFileUid.set(null);
      this.importedDeliveryDate.set(null);
      this.extracting.set(false);
      this.importSheetDisplay = 1;
      this.importColumnDisplay = 1;
      this.importRowDisplay = 1;
      this.pendingLatestDeliveryDate = line.materialLatestDeliveryDate
        ? new Date(line.materialLatestDeliveryDate)
        : null;
      this.pendingShippingDate = null;
      this.pendingStartingCustomerApprovalDate = null;
      this.pendingApprovalCustomerDate = null;
      this.pendingCustomerApprovalDecision = null;
      this.pendingCustomerApprovalNoAction = null;
      this.resolvePendingMinDates(line, status);
      return;
    }
    this.editingLineUid.set(null);
    this.doUpdateStatus(line, status);
  }

  toggleRemainingTime(line: ProcessLine): void {
    const uid = line.uid!;
    if (this.remainingTimeLineUid() === uid) {
      this.closeRemainingTimeEditor();
    } else {
      this.clearPending();
      this.editingLineUid.set(null);
      this.remainingTimeLineUid.set(uid);
      this.remainingTimeInput =
        line.remainingTimeInDays ?? line.planTimeInDays ?? null;
    }
  }

  confirmRemainingTimeUpdate(line: ProcessLine): void {
    if (this.remainingTimeInput === null) return;
    const uid = this.npiOrder()!.uid;
    const lineUid = line.uid!;
    const body: ProcessLineRemainingTimeUpdate = {
      remainingTimeInDays: this.remainingTimeInput,
    };
    this.updatingRemainingTime.set(true);
    this.npiOrderRepo
      .updateProcessLineRemainingTime(uid, lineUid, body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedLine) => {
          const current = this.process();
          if (current) {
            const updatedLines = current.lines.map((l) =>
              l.uid === updatedLine.uid ? updatedLine : l,
            );
            this.process.set({ ...current, lines: updatedLines });
          }
          this.closeRemainingTimeEditor();
          this.updatingRemainingTime.set(false);
          this.handleMessage.successMessage("Remaining time updated");
        },
        error: () => {
          this.updatingRemainingTime.set(false);
        },
      });
  }

  setImportMode(value: boolean): void {
    this.importMode.set(value);
    this.importedFileUid.set(null);
    this.importedDeliveryDate.set(null);
    this.pendingLatestDeliveryDate = null;
    this.pendingShippingDate = null;
    this.pendingStartingCustomerApprovalDate = null;
    this.pendingApprovalCustomerDate = null;
    this.pendingCustomerApprovalDecision = null;
    this.pendingCustomerApprovalNoAction = null;
    this.importSheetDisplay = 1;
    this.importColumnDisplay = 1;
    this.importRowDisplay = 1;
  }

  selectCustomerApprovalDecision(value: "YES" | "NO"): void {
    this.pendingCustomerApprovalDecision = value;
    if (value === "YES") {
      this.pendingCustomerApprovalNoAction = null;
    }
  }

  onTemporaryFileUploaded(event: any): void {
    const values = Object.values(event);
    if (values.length > 0) {
      this.importedFileUid.set((values[0] as FileInfo).uid);
    }
  }

  canExtractDate(): boolean {
    return (
      this.importedFileUid() !== null &&
      this.importSheetDisplay >= 1 &&
      this.importColumnDisplay >= 1 &&
      this.importRowDisplay >= 1
    );
  }

  extractDeliveryDate(line: ProcessLine): void {
    const uid = this.npiOrder()!.uid;
    const lineUid = line.uid!;
    const importBody: ProcessLineMaterialDeliveryDateImport = {
      fileUid: this.importedFileUid()!,
      sheetIndex: this.importSheetDisplay,
      column: this.importColumnDisplay,
      row: this.importRowDisplay,
    };
    this.extracting.set(true);
    this.npiOrderRepo
      .importNpiOrderProcessLineMaterialDeliveryDate(uid, lineUid, importBody)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (date) => {
          this.importedDeliveryDate.set(date ?? null);
          this.extracting.set(false);
        },
        error: () => {
          this.extracting.set(false);
        },
      });
  }

  toggleHistory(line: ProcessLine): void {
    const lineUid = line.uid!;
    if (this.historyLineUid() === lineUid) {
      this.historyLineUid.set(null);
      return;
    }
    this.historyLineUid.set(lineUid);
    this.historyLoading.set(true);
    this.npiOrderRepo
      .getNpiOrderProcessLineHistory(this.npiOrder()!.uid, lineUid)
      .pipe(
        finalize(() => {
          setTimeout(() => {
            this.historyLoading.set(false);
          }, 600);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (history) => {
          const updated = new Map(this.lineHistories());
          updated.set(lineUid, history);
          this.lineHistories.set(updated);
        },
      });
  }

  public closeRemainingTimeEditor(): void {
    this.remainingTimeLineUid.set(null);
    this.remainingTimeInput = null;
  }

  manageFilesForNpiProcessLine(
    npiOrder: NpiOrder,
    line: ProcessLine,
  ): Observable<FileInfo[] | undefined> {
    const url = `${environment.backendUrl}/npi-orders/${npiOrder.uid}/process/lines/${line.uid}`;
    return this.npiOrderRepo
      .getAllNpiOrdersProcessLineFiles(npiOrder.uid, line.uid!)
      .pipe(
        switchMap((files) =>
          this.modalService.showManageFileModal(url, files, true, true, false),
        ),
      );
  }

  downloadTestingFilesUploaded(filesUids: string[]) {
    const url = `${this.temporaryFilesUrl}/download`;
    this.fileManageRepo.downloadFile(url, filesUids);
  }

  deletionTestingFilesUploaded(filesUids: string[]) {
    const url = `${this.temporaryFilesUrl}/delete`;
    this.fileManageRepo
      .deleteFile(url, filesUids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.testingFileSelected.set(null);
          this.handleMessage.successMessage("File(s) deleted");
        },
      });
  }

  onTestingFileUploaded(event: any): void {
    if (!event || event.length === 0) return;
    const body: FileSelected = {
      ...event[0],
    };
    this.testingFileSelected.set(body ?? null);
  }

  viewTestingFiles(line: ProcessLine): void {
    this.manageFilesForNpiProcessLine(this.npiOrder()!, line)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  /**
   * Resolves the appropriate minDate signals based on which line/status
   * is entering the extra-fields step.
   */
  private resolvePendingMinDates(
    line: ProcessLine,
    targetStatus: ProcessLineStatus,
  ): void {
    if (line.isShipment && targetStatus === ProcessLineStatus.COMPLETED) {
      this.minShippingDateProcess.set(this.getMaterialDeliveryDateFromProcess());
    }
    if (
      line.isCustomerApproval &&
      targetStatus === ProcessLineStatus.IN_PROGRESS
    ) {
      this.minStartingCustomerApprovalDate.set(
        this.getShippingDateFromProcess(),
      );
    }
    if (
      line.isCustomerApproval &&
      targetStatus === ProcessLineStatus.COMPLETED
    ) {
      const raw = line.startingCustomerApprovalDate;
      this.minApprovalCustomerDate.set(raw ? new Date(raw) : null);
    }
  }

  private getMaterialDeliveryDateFromProcess(): Date {
    const materialLine = this.process()?.lines.find((l) => l.isMaterialPurchase);
    const today = new Date();
    if (!materialLine?.materialLatestDeliveryDate) return today;
    const deliveryDate = new Date(materialLine.materialLatestDeliveryDate);
    return deliveryDate > today ? deliveryDate : today;
  }

  private getShippingDateFromProcess(): Date | null {
    const shipmentLine = this.process()?.lines.find((l) => l.isShipment);
    if (!shipmentLine?.shippingDate) return null;
    return new Date(shipmentLine.shippingDate);
  }

  private clearPending(): void {
    this.pendingLineIndex.set(null);
    this.pendingTargetStatus.set(null);
    this.pendingLatestDeliveryDate = null;
    this.pendingShippingDate = null;
    this.pendingStartingCustomerApprovalDate = null;
    this.pendingApprovalCustomerDate = null;
    this.pendingCustomerApprovalDecision = null;
    this.pendingCustomerApprovalNoAction = null;
    this.importMode.set(false);
    this.importedFileUid.set(null);
    this.importedDeliveryDate.set(null);
    this.extracting.set(false);
    this.importSheetDisplay = 1;
    this.importColumnDisplay = 1;
    this.importRowDisplay = 1;
    this.testingFileSelected.set(null);
  }

  private handleStatusUpdateSuccess(
    line: ProcessLine,
    targetStatus: ProcessLineStatus,
    updatedLines: ProcessLine[],
  ): void {
    const current = this.process();
    if (current) {
      this.process.set({ ...current, lines: updatedLines });
    }
    this.clearPending();
    const allCompleted = updatedLines.every(
      (l) => l.status === ProcessLineStatus.COMPLETED,
    );
    if (allCompleted) {
      this.handleMessage.successMessage("NPI process completed.");
      this.closeDialog(true);
    } else {
      this.handleMessage.successMessage(
        `${line.processName} updated to ${this.processLineStatusPipe.transform(targetStatus)}`,
      );
    }
  }

  private doUpdateStatus(
    line: ProcessLine,
    targetStatus: ProcessLineStatus,
  ): void {
    const uid = this.npiOrder()!.uid;
    const lineUid = line.uid!;
    // Import mode: date already extracted — send it with the status update
    if (
      line.isMaterialPurchase &&
      targetStatus === ProcessLineStatus.IN_PROGRESS &&
      this.importMode()
    ) {
      this.npiOrderRepo
        .updateNpiOrderProcessLineStatus(uid, lineUid, {
          status: targetStatus,
          materialLatestDeliveryDate: this.importedDeliveryDate()!,
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (result) =>
            this.handleStatusUpdateSuccess(line, targetStatus, result),
        });
      return;
    }

    // Manual mode
    const body: ProcessLineStatusUpdateBody = { status: targetStatus };

    if (
      line.isMaterialPurchase &&
      targetStatus === ProcessLineStatus.IN_PROGRESS &&
      this.pendingLatestDeliveryDate
    ) {
      body.materialLatestDeliveryDate = RegexPatterns.enDateFormatToString(
        this.pendingLatestDeliveryDate!,
      )!;
    }

    if (
      line.isShipment &&
      targetStatus === ProcessLineStatus.COMPLETED &&
      this.pendingShippingDate
    ) {
      body.shippingDate = RegexPatterns.enDateFormatToString(
        this.pendingShippingDate!,
      )!;
    }

    if (
      line.isCustomerApproval &&
      targetStatus === ProcessLineStatus.IN_PROGRESS &&
      this.pendingStartingCustomerApprovalDate
    ) {
      body.startingCustomerApprovalDate = RegexPatterns.enDateFormatToString(
        this.pendingStartingCustomerApprovalDate!,
      )!;
    }

    if (
      line.isCustomerApproval &&
      targetStatus === ProcessLineStatus.COMPLETED &&
      this.pendingApprovalCustomerDate
    ) {
      body.approvalCustomerDate = RegexPatterns.enDateFormatToString(
        this.pendingApprovalCustomerDate!,
      )!;
    }
    if (line.isTesting && targetStatus == ProcessLineStatus.COMPLETED) {
      body.fileUid = this.testingFileSelected()?.uid;
    }
    this.npiOrderRepo
      .updateNpiOrderProcessLineStatus(uid, lineUid, body)
      .pipe(
        tap(() => {
          if (targetStatus === ProcessLineStatus.COMPLETED) {
            this.historyLineUid.set(null);
          }
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result) =>
          this.handleStatusUpdateSuccess(line, targetStatus, result),
      });
  }

  private finalStatus(status: ProcessLineStatus) {
    return (
      status === ProcessLineStatus.COMPLETED ||
      status === ProcessLineStatus.ABORTED
    );
  }

  private loadProcess(): void {
    const uid = this.dataConfig.npiOrder?.uid;
    if (!uid) return;
    this.npiOrderRepo
      .getNpiOrderProcess(uid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (process) => {
          this.process.set(process);
          this.loading.set(false);
        },
      });
  }

  private handleCustomerApprovalCompletion(line: ProcessLine): void {
    if (this.pendingCustomerApprovalDecision === "YES") {
      this.doUpdateStatus(line, ProcessLineStatus.COMPLETED);
      return;
    }

    if (this.pendingCustomerApprovalNoAction === "ABORT_NPI") {
      const uid = this.npiOrder()!.uid;
      const lineUid = line.uid!;
      const body: ProcessLineStatusUpdateBody = {
        status: ProcessLineStatus.ABORTED,
      };
      this.npiOrderRepo
        .updateNpiOrderProcessLineStatus(uid, lineUid, body)
        .pipe(
          switchMap(() =>
            this.npiOrderRepo.abortNpiOrder(this.npiOrder()!.uid),
          ),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: () => {
            this.handleMessage.successMessage("NPI order aborted");
            this.closeDialog(true);
          },
        });
      return;
    }

    const currentLineIndex = this.pendingLineIndex() ?? 0;
    const firstLine = this.process()!.lines[0];
    this.selectResetStatus(
      firstLine,
      ProcessLineStatus.NOT_STARTED,
      currentLineIndex,
    );
  }
}
