import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { CardModule } from "primeng/card";
import { Button } from "primeng/button";
import { InputTextModule } from "primeng/inputtext";
import { InputNumberModule } from "primeng/inputnumber";
import { DatePickerModule } from "primeng/datepicker";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  NpiOrder,
  NpiOrderCreate,
  NpiOrderUpdate,
} from "../../../../client/npiSeiko";
import { BaseModal } from "../../../models/classes/base-modal";
import { InputContainerComponent } from "../../../components/input-container/input-container.component";
import { NpiOrderRepo } from "../../../repositories/npi-order.repo";
import { NpiOrderFormField } from "../../../models/enums/form-field-names/npi-order-form-field";
import { Icons } from "../../../models/enums/icons";
import { NpiService } from "../../../services/npi.service";
import { RegexPatterns } from "../../../services/utils/regex-patterns";

@Component({
  selector: "app-npi-order-create-edit-dialog",
  imports: [
    CardModule,
    FormsModule,
    ReactiveFormsModule,
    Button,
    InputTextModule,
    InputNumberModule,
    DatePickerModule,
    InputContainerComponent,
  ],
  templateUrl: "./npi-order-create-edit-dialog.component.html",
  styleUrl: "./npi-order-create-edit-dialog.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NpiOrderCreateEditDialogComponent
  extends BaseModal
  implements OnInit
{
  editMode = signal<boolean>(false);
  npiOrderSelected = signal<NpiOrder | null>(null);
  npiOrderForm = this.formService.buildNpiOrderForm();
  protected readonly Icons = Icons;
  protected readonly NpiOrderFormField = NpiOrderFormField;
  private npiOrderRepo = inject(NpiOrderRepo);
  private npiService = inject(NpiService);
  readonly = computed(() => {
    const status = this.npiOrderSelected()?.status;
    if (!status) return false;
    return this.npiService.isFinalOrder(status!);
  });

  ngOnInit(): void {
    if (this.config.data) {
      this.editMode.set(this.config.data.editMode);
      if (this.editMode() && this.config.data.npiOrder) {
        this.npiOrderSelected.set(this.config.data.npiOrder!);
        this.npiOrderForm = this.formService.buildNpiOrderForm(
          this.npiOrderSelected()!,
        );
        if (
          this.npiOrderSelected()!.status &&
          this.npiService.isFinalOrder(this.npiOrderSelected()!.status)
        ) {
          this.npiOrderForm.disable();
        }
      }
    }
  }

  submit(): void {
    if (this.npiOrderForm.invalid) {
      return;
    }
    this.formService.trimFormStringValues(this.npiOrderForm);

    if (this.editMode()) {
      this.updateNpiOrder();
    } else {
      this.createNpiOrder();
    }
  }

  private createNpiOrder(): void {
    this.npiOrderRepo
      .createNpiOrder(this.buildBody())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.handleMessage.successMessage("NPI Order created");
          this.closeDialog(true);
        },
      });
  }

  private updateNpiOrder(): void {
    this.npiOrderRepo
      .updateNpiOrder(this.npiOrderSelected()!.uid, this.buildBody())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.handleMessage.successMessage("NPI Order updated");
          this.closeDialog(true);
        },
      });
  }

  private buildBody(): any {
    const form = this.npiOrderForm;
    const orderDateValue: Date | null =
      form.get(NpiOrderFormField.ORDER_DATE)?.value ?? null;
    const targetDeliveryDateValue: Date | null =
      form.get(NpiOrderFormField.TARGET_DELIVERY_DATE)?.value ?? null;
    return {
      purchaseOrderNumber: form.get(NpiOrderFormField.PURCHASE_ORDER_NUMBER)
        ?.value,
      workOrderId: form.get(NpiOrderFormField.WORK_ORDER_ID)?.value,
      partNumber: form.get(NpiOrderFormField.PART_NUMBER)?.value,
      quantity: form.get(NpiOrderFormField.QUANTITY)?.value,
      orderDate: orderDateValue
        ? RegexPatterns.enDateFormatToString(orderDateValue)
        : new Date().toISOString().split("T")[0],
      targetDeliveryDate: targetDeliveryDateValue
        ? RegexPatterns.enDateFormatToString(targetDeliveryDateValue)
        : new Date().toISOString().split("T")[0],
      customerName:
        form.get(NpiOrderFormField.CUSTOMER_NAME)?.value || undefined,
      productName: form.get(NpiOrderFormField.PRODUCT_NAME)?.value || undefined,
      materialPurchasePlanTimeInHours: form.get(
        NpiOrderFormField.MATERIAL_PURCHASE_PLAN_TIME_IN_HOURS,
      )?.value,
      materialReceivingPlanTimeInHours: form.get(
        NpiOrderFormField.MATERIAL_RECEIVING_PLAN_TIME_IN_HOURS,
      )?.value,
      productionPlanTimeInHours: form.get(
        NpiOrderFormField.PRODUCTION_PLAN_TIME_IN_HOURS,
      )?.value,
      testingPlanTimeInHours: form.get(
        NpiOrderFormField.TESTING_PLAN_TIME_IN_HOURS,
      )?.value,
      shippingPlanTimeInHours: form.get(
        NpiOrderFormField.SHIPPING_PLAN_TIME_IN_HOURS,
      )?.value,
      customerApprovalPlanTimeInHours: form.get(
        NpiOrderFormField.CUSTOMER_APPROVAL_PLAN_TIME_IN_HOURS,
      )?.value,
    } as NpiOrderCreate | NpiOrderUpdate;
  }
}
