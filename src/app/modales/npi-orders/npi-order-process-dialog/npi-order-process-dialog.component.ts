import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DatePickerModule } from "primeng/datepicker";
import { InputNumberModule } from "primeng/inputnumber";
import { Button } from "primeng/button";
import { Tag } from "primeng/tag";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  NpiOrder,
  Process,
  ProcessLine,
  ProcessLineStatus,
  ProcessLineStatusUpdateBody,
} from "../../../../client/npiSeiko";
import { BaseModal } from "../../../models/classes/base-modal";
import { NpiOrderRepo } from "../../../repositories/npi-order.repo";
import { NpiOrderProcessLinePipe } from "../../../pipes/npi-order-process-line.pipe";
import { Icons } from "../../../models/enums/icons";

@Component({
  selector: "app-npi-order-process-dialog",
  imports: [
    FormsModule,
    DatePickerModule,
    InputNumberModule,
    Button,
    Tag,
    NpiOrderProcessLinePipe,
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
  /** Index of the line currently in status-change mode */
  editingLineIndex = signal<number | null>(null);
  /** The target status the user selected (before confirming with extra fields) */
  pendingTargetStatus = signal<ProcessLineStatus | null>(null);
  /** Extra field values */
  pendingLatestDeliveryDate: Date | null = null;
  pendingRemainingTime: number | null = null;
  /** Lines that can be edited: first line, or line whose predecessor is COMPLETED */
  editableLineIndices = computed<Set<number>>(() => {
    const lines = this.process()?.lines ?? [];
    const editable = new Set<number>();
    lines.forEach((line, i) => {
      if (
        line.status === ProcessLineStatus.COMPLETED ||
        line.status === ProcessLineStatus.ABORTED
      ) {
        return;
      }
      if (i === 0 || lines[i - 1].status === ProcessLineStatus.COMPLETED) {
        editable.add(i);
      }
    });
    return editable;
  });
  protected readonly ProcessLineStatus = ProcessLineStatus;
  protected readonly Icons = Icons;
  private npiOrderRepo = inject(NpiOrderRepo);

  availableStatuses(line: ProcessLine): ProcessLineStatus[] {
    return [
      ProcessLineStatus.NOT_STARTED,
      ProcessLineStatus.IN_PROGRESS,
      ProcessLineStatus.COMPLETED,
      ProcessLineStatus.ABORTED,
    ].filter((s) => s !== line.status);
  }

  requiresExtraFields(
    line: ProcessLine,
    targetStatus: ProcessLineStatus,
  ): boolean {
    if (
      line.isMaterialPurchase &&
      targetStatus === ProcessLineStatus.IN_PROGRESS
    ) {
      return true;
    }
    if (
      (line.isProduction || line.isTesting) &&
      targetStatus === ProcessLineStatus.IN_PROGRESS
    ) {
      return true;
    }
    return false;
  }

  canConfirmPending(line: ProcessLine): boolean {
    const target = this.pendingTargetStatus();
    if (!target) return false;
    if (line.isMaterialPurchase && target === ProcessLineStatus.IN_PROGRESS) {
      return this.pendingLatestDeliveryDate !== null;
    }
    if (
      (line.isProduction || line.isTesting) &&
      target === ProcessLineStatus.IN_PROGRESS
    ) {
      return this.pendingRemainingTime !== null;
    }
    return true;
  }

  ngOnInit(): void {
    this.npiOrder.set(this.dataConfig.npiOrder as NpiOrder);
    this.loadProcess();
  }

  openEditPanel(index: number): void {
    if (this.editingLineIndex() === index) {
      this.cancelEdit();
      return;
    }
    this.editingLineIndex.set(index);
    this.pendingTargetStatus.set(null);
    this.pendingLatestDeliveryDate = null;
    this.pendingRemainingTime = null;
  }

  selectTargetStatus(line: ProcessLine, status: ProcessLineStatus): void {
    if (!this.requiresExtraFields(line, status)) {
      this.doUpdateStatus(line, status);
      return;
    }
    this.pendingTargetStatus.set(status);
    this.pendingLatestDeliveryDate = null;
    this.pendingRemainingTime = null;
  }

  confirmPendingUpdate(line: ProcessLine): void {
    const target = this.pendingTargetStatus();
    if (!target || !this.canConfirmPending(line)) return;
    this.doUpdateStatus(line, target);
  }

  backToStatusSelection(): void {
    this.pendingTargetStatus.set(null);
    this.pendingLatestDeliveryDate = null;
    this.pendingRemainingTime = null;
  }

  cancelEdit(): void {
    this.editingLineIndex.set(null);
    this.pendingTargetStatus.set(null);
    this.pendingLatestDeliveryDate = null;
    this.pendingRemainingTime = null;
  }

  private doUpdateStatus(
    line: ProcessLine,
    targetStatus: ProcessLineStatus,
  ): void {
    const uid = this.npiOrder()!.uid;
    const lineUid = line.uid!;

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

    if (
      (line.isProduction || line.isTesting) &&
      targetStatus === ProcessLineStatus.IN_PROGRESS &&
      this.pendingRemainingTime !== null
    ) {
      body.remainingTime = this.pendingRemainingTime;
    }

    this.npiOrderRepo
      .updateNpiOrderProcessLineStatus(uid, lineUid, body)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.handleMessage.successMessage(
            `${line.processName} updated to ${targetStatus}`,
          );
          const current = this.process();
          if (current) {
            const updatedLines = current.lines.map((l) =>
              l.uid === result.updatedProcessLine.uid
                ? result.updatedProcessLine
                : l,
            );
            this.process.set({ ...current, lines: updatedLines });
          }
          this.cancelEdit();
          if (result.processIsCompleted) {
            this.handleMessage.successMessage("NPI process completed!");
            this.closeDialog(true);
          }
        },
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
