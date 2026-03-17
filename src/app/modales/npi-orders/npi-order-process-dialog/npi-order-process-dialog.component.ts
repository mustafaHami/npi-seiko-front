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
import { TooltipModule } from "primeng/tooltip";
import { TimelineModule } from "primeng/timeline";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
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
import { ManageFileComponent } from "../../../components/manage-file/manage-file.component";
import { ExcelUtilsService } from "../../../services/utils/excel-utils.service";
import { environment } from "../../../../environments/environment";

@Component({
  selector: "app-npi-order-process-dialog",
  imports: [
    NgTemplateOutlet,
    FormsModule,
    DatePickerModule,
    InputNumberModule,
    Button,
    Tag,
    TooltipModule,
    TimelineModule,
    DatePipe,
    NpiOrderProcessLinePipe,
    ManageFileComponent,
  ],
  templateUrl: "./npi-order-process-dialog.component.html",
  styleUrl: "./npi-order-process-dialog.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  /** UID of the line currently in edit (reset) mode */
  editingLineUid = signal<string | null>(null);

  /** Remaining time inline update */
  remainingTimeLineUid = signal<string | null>(null);
  remainingTimeInput: number | null = null;
  updatingRemainingTime = signal<boolean>(false);

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
  protected npiService = inject(NpiService);
  readonly = computed(() => {
    const status = this.npiOrder()?.status;
    if (!status) return true;
    return this.npiService.isFinalOrder(status!);
  });
  protected excelUtils = inject(ExcelUtilsService);
  private npiOrderRepo = inject(NpiOrderRepo);

  availableStatuses(line: ProcessLine): ProcessLineStatus[] {
    const all = [
      ProcessLineStatus.NOT_STARTED,
      ProcessLineStatus.IN_PROGRESS,
      ProcessLineStatus.COMPLETED,
    ].filter((s) => s !== line.status);

    // Lines requiring extra fields on IN_PROGRESS must go through IN_PROGRESS first
    if (
      line.status === ProcessLineStatus.NOT_STARTED &&
      (line.isMaterialPurchase || line.isProduction || line.isTesting)
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
      !!line.isMaterialPurchase &&
      targetStatus! === ProcessLineStatus.IN_PROGRESS
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
    if (!this.requiresExtraFields(line, status)) {
      this.doUpdateStatus(line, status);
      return;
    }
    this.pendingLineIndex.set(lineIndex);
    this.pendingTargetStatus.set(status);
    this.pendingLatestDeliveryDate = null;
    this.importMode.set(false);
    this.importedFileUid.set(null);
    this.importSheetDisplay = 1;
    this.importColumnDisplay = 1;
    this.importRowDisplay = 1;
  }

  confirmPendingUpdate(line: ProcessLine): void {
    const target = this.pendingTargetStatus();
    if (!target || !this.canConfirmPending(line)) return;
    this.doUpdateStatus(line, target);
  }

  backToStatusSelection(): void {
    this.clearPending();
  }

  toggleEditMode(line: ProcessLine): void {
    const uid = line.uid!;
    this.editingLineUid.set(this.editingLineUid() === uid ? null : uid);
  }

  selectResetStatus(line: ProcessLine, status: ProcessLineStatus): void {
    this.editingLineUid.set(null);
    this.doUpdateStatus(line, status);
  }

  toggleRemainingTime(line: ProcessLine): void {
    const uid = line.uid!;
    if (this.remainingTimeLineUid() === uid) {
      this.remainingTimeLineUid.set(null);
      this.remainingTimeInput = null;
    } else {
      this.remainingTimeLineUid.set(uid);
      this.remainingTimeInput = line.remainingTimeInHours ?? null;
    }
  }

  confirmRemainingTimeUpdate(line: ProcessLine): void {
    if (this.remainingTimeInput === null) return;
    const uid = this.npiOrder()!.uid;
    const lineUid = line.uid!;
    const body: ProcessLineRemainingTimeUpdate = {
      remainingTimeInHours: this.remainingTimeInput,
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
          this.remainingTimeLineUid.set(null);
          this.remainingTimeInput = null;
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
    this.importSheetDisplay = 1;
    this.importColumnDisplay = 1;
    this.importRowDisplay = 1;
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
    if (this.lineHistories().has(lineUid)) {
      return;
    }
    this.historyLoading.set(true);
    this.npiOrderRepo
      .getNpiOrderProcessLineHistory(this.npiOrder()!.uid, lineUid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (history) => {
          const updated = new Map(this.lineHistories());
          updated.set(lineUid, history);
          this.lineHistories.set(updated);
          this.historyLoading.set(false);
        },
        error: () => {
          this.historyLoading.set(false);
        },
      });
  }

  private clearPending(): void {
    this.pendingLineIndex.set(null);
    this.pendingTargetStatus.set(null);
    this.pendingLatestDeliveryDate = null;
    this.importMode.set(false);
    this.importedFileUid.set(null);
    this.importedDeliveryDate.set(null);
    this.extracting.set(false);
    this.importSheetDisplay = 1;
    this.importColumnDisplay = 1;
    this.importRowDisplay = 1;
  }

  private handleStatusUpdateSuccess(
    line: ProcessLine,
    targetStatus: ProcessLineStatus,
    updatedLines: ProcessLine[],
  ): void {
    this.handleMessage.successMessage(
      `${line.processName} updated to ${targetStatus}`,
    );
    const current = this.process();
    if (current) {
      this.process.set({ ...current, lines: updatedLines });
    }
    this.clearPending();
    const allCompleted = updatedLines.every(
      (l) => l.status === ProcessLineStatus.COMPLETED,
    );
    if (allCompleted) {
      this.handleMessage.successMessage("NPI process completed!");
      this.closeDialog(true);
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
      body.materialLatestDeliveryDate = this.pendingLatestDeliveryDate
        .toISOString()
        .split("T")[0];
    }

    this.npiOrderRepo
      .updateNpiOrderProcessLineStatus(uid, lineUid, body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) =>
          this.handleStatusUpdateSuccess(line, targetStatus, result),
      });
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
}
