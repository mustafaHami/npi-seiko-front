import {
  ChangeDetectionStrategy,
  Component,
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
import { NpiOrder, NpiOrderCreate, NpiOrderUpdate } from "../../../../client/costSeiko";
import { BaseModal } from "../../../models/classes/base-modal";
import { InputContainerComponent } from "../../../components/input-container/input-container.component";
import { NpiOrderRepo } from "../../../repositories/npi-order.repo";
import { NpiOrderFormField } from "../../../models/enums/form-field-names/npi-order-form-field";
import { Icons } from "../../../models/enums/icons";

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
export class NpiOrderCreateEditDialogComponent extends BaseModal implements OnInit {
  editMode = signal<boolean>(false);
  npiOrderEdited?: NpiOrder;

  protected readonly Icons = Icons;
  protected readonly NpiOrderFormField = NpiOrderFormField;

  private npiOrderRepo = inject(NpiOrderRepo);

  npiOrderForm = this.formService.buildNpiOrderForm();

  ngOnInit(): void {
    if (this.config.data) {
      this.editMode.set(this.config.data.editMode);
      if (this.editMode() && this.config.data.npiOrder) {
        this.npiOrderEdited = this.config.data.npiOrder;
        this.npiOrderForm = this.formService.buildNpiOrderForm(this.npiOrderEdited);
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
      .updateNpiOrder(this.npiOrderEdited!.uid, this.buildBody())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.handleMessage.successMessage("NPI Order updated");
          this.closeDialog(true);
        },
      });
  }

  private buildBody(): NpiOrderCreate | NpiOrderUpdate {
    const form = this.npiOrderForm;
    const orderDateValue: Date | null = form.get(NpiOrderFormField.ORDER_DATE)?.value ?? null;
    return {
      purchaseOrderNumber: form.get(NpiOrderFormField.PURCHASE_ORDER_NUMBER)?.value,
      workOrderId: form.get(NpiOrderFormField.WORK_ORDER_ID)?.value,
      partNumber: form.get(NpiOrderFormField.PART_NUMBER)?.value,
      quantity: form.get(NpiOrderFormField.QUANTITY)?.value,
      orderDate: orderDateValue
        ? orderDateValue.toISOString().split("T")[0]
        : undefined,
      targetDeliveryDate:
        form.get(NpiOrderFormField.TARGET_DELIVERY_DATE)?.value || undefined,
      customerName:
        form.get(NpiOrderFormField.CUSTOMER_NAME)?.value || undefined,
      productName:
        form.get(NpiOrderFormField.PRODUCT_NAME)?.value || undefined,
    } as NpiOrderCreate | NpiOrderUpdate;
  }
}
