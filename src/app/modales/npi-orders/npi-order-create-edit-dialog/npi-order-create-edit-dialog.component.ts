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
  Customer,
  FileInfo,
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
import { Select } from "primeng/select";
import { CustomerRepo } from "../../../repositories/customer.repo";
import { OverlayBadge } from "primeng/overlaybadge";
import { environment } from "../../../../environments/environment";
import { ModalService } from "../../../services/components/modal.service";

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
    Select,
    OverlayBadge,
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
  customers = signal<Customer[]>([]);
  filesInfo = signal<FileInfo[]>([]);
  protected readonly Icons = Icons;
  protected readonly NpiOrderFormField = NpiOrderFormField;
  private npiOrderRepo = inject(NpiOrderRepo);
  private customerRepo = inject(CustomerRepo);
  private npiService = inject(NpiService);
  private modalService = inject(ModalService);

  isFinalized = computed(() => {
    if (!this.npiOrderSelected() || !this.editMode()) return false;
    return this.npiService.isFinalOrder(this.npiOrderSelected()?.status!);
  });

  readonly = computed(() => {
    const status = this.npiOrderSelected()?.status;
    if (!status) return false;
    return !this.npiService.isUpdatable(status!);
  });

  /** Minimum selectable date for material purchase: order date */
  minMaterialPurchaseDate = signal<Date | null>(null);

  /** Minimum selectable date for shipping: materialPurchaseDate + receiving + production + testing days */
  minShippingDate = signal<Date | null>(null);

  /** Minimum selectable date for customer approval: shippingEstimatedDate + 1 day */
  minCustomerApprovalDate = signal<Date | null>(null);

  /** Shipping date is only enabled when all 4 upstream fields are filled */
  shippingDateDisabled = signal<boolean>(true);

  /** Customer approval date is only enabled when shipping date is set */
  customerApprovalDateDisabled = signal<boolean>(true);

  ngOnInit(): void {
    if (this.config.data) {
      this.editMode.set(this.config.data.editMode);
      if (this.editMode() && this.config.data.npiOrder) {
        this.npiOrderSelected.set(this.config.data.npiOrder!);
        this.npiOrderForm = this.formService.buildNpiOrderForm(
          this.npiOrderSelected()!,
        );
        if (this.npiOrderSelected()!.status && this.readonly()) {
          this.npiOrderForm.disable();
        }
      }
    }
    this.loadCustomers();
    if (this.editMode()) {
      this.loadFiles();
    }
    this.watchOrderDateConstraints();
    this.watchShippingConstraints();
    this.watchCustomerApprovalConstraints();
    this.computeInitialMinDates();
  }

  manageFiles() {
    let url = `${environment.backendUrl}/temporary-files`;
    if (this.editMode()) {
      url = `${environment.backendUrl}/npi-orders/${this.npiOrderSelected()?.uid}/files`;
    }
    this.modalService
      .showManageFileModal(url, this.filesInfo(), this.readonly(), true, false)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((returnedFiles?: FileInfo[]) => {
        if (returnedFiles) {
          this.filesInfo.set(returnedFiles);
        }
      });
  }

  loadFiles() {
    this.npiOrderRepo
      .getAllNpiOrdersFiles(this.npiOrderSelected()?.uid!)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((returnedFiles?: FileInfo[]) => {
        if (returnedFiles) {
          this.filesInfo.set(returnedFiles);
        }
      });
  }

  loadCustomers() {
    this.customerRepo
      .listAllCustomers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((customers) => {
        this.customers.set(customers);
        this.setSelectedCustomer();
      });
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

  private computeInitialMinDates(): void {
    this.updateMinMaterialPurchaseDate();
    this.updateMinShippingDate();
    this.updateMinCustomerApprovalDate();
    this.updateShippingDateDisabled();
    this.updateCustomerApprovalDateDisabled();
  }

  /**
   * Watch orderDate to update the minimum material purchase date,
   * and cascade-clear downstream dates if they become invalid.
   */
  private watchOrderDateConstraints(): void {
    this.npiOrderForm
      .get(NpiOrderFormField.ORDER_DATE)
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateMinMaterialPurchaseDate();
        this.clearMaterialPurchaseDateIfInvalid();
      });
  }

  /**
   * Watch fields that affect the minimum shipping date:
   * materialPurchaseEstimatedDate, materialReceivingPlanTimeInDays,
   * productionPlanTimeInDays, testingPlanTimeInDays.
   * Any change always resets both shipping and customer approval dates.
   */
  private watchShippingConstraints(): void {
    const shippingConstraintFields = [
      NpiOrderFormField.MATERIAL_PURCHASE_ESTIMATED_DATE,
      NpiOrderFormField.MATERIAL_RECEIVING_PLAN_TIME_IN_DAYS,
      NpiOrderFormField.PRODUCTION_PLAN_TIME_IN_DAYS,
      NpiOrderFormField.TESTING_PLAN_TIME_IN_DAYS,
    ];

    shippingConstraintFields.forEach((field) => {
      this.npiOrderForm
        .get(field)
        ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.updateMinShippingDate();
          this.updateShippingDateDisabled();
          this.resetShippingAndCustomerApprovalDates();
        });
    });
  }

  /**
   * Watch shippingEstimatedDate to update the minimum customer approval date
   * and its disabled state.
   */
  private watchCustomerApprovalConstraints(): void {
    this.npiOrderForm
      .get(NpiOrderFormField.SHIPPING_ESTIMATED_DATE)
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateMinCustomerApprovalDate();
        this.updateCustomerApprovalDateDisabled();
      });
  }

  private updateMinMaterialPurchaseDate(): void {
    const orderDate: Date | null = this.npiOrderForm.get(
      NpiOrderFormField.ORDER_DATE,
    )?.value;
    this.minMaterialPurchaseDate.set(orderDate ?? null);
  }

  /** Reset material purchase date (and cascade) if it is before the order date */
  private clearMaterialPurchaseDateIfInvalid(): void {
    const purchaseDate: Date | null = this.npiOrderForm.get(
      NpiOrderFormField.MATERIAL_PURCHASE_ESTIMATED_DATE,
    )?.value;
    const minDate = this.minMaterialPurchaseDate();

    if (purchaseDate && minDate && purchaseDate < minDate) {
      this.npiOrderForm
        .get(NpiOrderFormField.MATERIAL_PURCHASE_ESTIMATED_DATE)
        ?.setValue(null);
      // cascade: shipping and customer approval will be cleared via their own watchers
    }
  }

  private updateMinShippingDate(): void {
    const purchaseDate: Date | null = this.npiOrderForm.get(
      NpiOrderFormField.MATERIAL_PURCHASE_ESTIMATED_DATE,
    )?.value;
    const receivingDays: number | null = this.npiOrderForm.get(
      NpiOrderFormField.MATERIAL_RECEIVING_PLAN_TIME_IN_DAYS,
    )?.value;
    const productionDays: number | null = this.npiOrderForm.get(
      NpiOrderFormField.PRODUCTION_PLAN_TIME_IN_DAYS,
    )?.value;
    const testingDays: number | null = this.npiOrderForm.get(
      NpiOrderFormField.TESTING_PLAN_TIME_IN_DAYS,
    )?.value;

    if (
      purchaseDate == null ||
      receivingDays == null ||
      productionDays == null ||
      testingDays == null
    ) {
      this.minShippingDate.set(null);
      return;
    }

    const totalDays = receivingDays + productionDays + testingDays;
    const minDate = this.addBusinessDays(new Date(purchaseDate), totalDays + 1);
    this.minShippingDate.set(minDate);
  }

  private updateMinCustomerApprovalDate(): void {
    const shippingDate: Date | null = this.npiOrderForm.get(
      NpiOrderFormField.SHIPPING_ESTIMATED_DATE,
    )?.value;

    if (shippingDate == null) {
      this.minCustomerApprovalDate.set(null);
      return;
    }

    const minDate = new Date(shippingDate);
    minDate.setDate(minDate.getDate() + 1);
    this.minCustomerApprovalDate.set(minDate);
  }

  /**
   * Always reset both shipping and customer approval dates when any upstream
   * field (material purchase, receiving, production, testing) changes.
   */
  private resetShippingAndCustomerApprovalDates(): void {
    this.npiOrderForm
      .get(NpiOrderFormField.SHIPPING_ESTIMATED_DATE)
      ?.setValue(null, { emitEvent: false });
    this.npiOrderForm
      .get(NpiOrderFormField.CUSTOMER_APPROVAL_ESTIMATED_DATE)
      ?.setValue(null, { emitEvent: false });
    this.minCustomerApprovalDate.set(null);
    this.customerApprovalDateDisabled.set(true);
  }

  private updateShippingDateDisabled(): void {
    const purchaseDate: Date | null = this.npiOrderForm.get(
      NpiOrderFormField.MATERIAL_PURCHASE_ESTIMATED_DATE,
    )?.value;
    const receivingDays: number | null = this.npiOrderForm.get(
      NpiOrderFormField.MATERIAL_RECEIVING_PLAN_TIME_IN_DAYS,
    )?.value;
    const productionDays: number | null = this.npiOrderForm.get(
      NpiOrderFormField.PRODUCTION_PLAN_TIME_IN_DAYS,
    )?.value;
    const testingDays: number | null = this.npiOrderForm.get(
      NpiOrderFormField.TESTING_PLAN_TIME_IN_DAYS,
    )?.value;

    const allFilled =
      purchaseDate != null &&
      receivingDays != null &&
      productionDays != null &&
      testingDays != null;

    this.shippingDateDisabled.set(!allFilled);
  }

  /** Adds business days (Mon–Fri) to a date, skipping weekends. */
  private addBusinessDays(date: Date, days: number): Date {
    const result = new Date(date);
    let remaining = days;
    while (remaining > 0) {
      result.setDate(result.getDate() + 1);
      const day = result.getDay();
      if (day !== 0 && day !== 6) {
        remaining--;
      }
    }
    return result;
  }

  private updateCustomerApprovalDateDisabled(): void {
    const shippingDate: Date | null = this.npiOrderForm.get(
      NpiOrderFormField.SHIPPING_ESTIMATED_DATE,
    )?.value;
    this.customerApprovalDateDisabled.set(shippingDate == null);
  }

  private setSelectedCustomer() {
    if (!this.npiOrderSelected()?.customer) return;
    const defaultCustomer = this.customers().find(
      (customer) => customer.uid === this.npiOrderSelected()?.customer.uid,
    );
    this.npiOrderForm
      .get(NpiOrderFormField.CUSTOMER)
      ?.setValue(defaultCustomer);
  }

  private createNpiOrder(): void {
    const body = this.buildBody();
    if (!body) return;
    if (this.filesInfo() && this.filesInfo().length > 0) {
      body.filesIds = this.filesInfo().map((file) => file.uid);
    }
    this.npiOrderRepo
      .createNpiOrder(body)
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
    const materialPurchaseDateValue: Date | null =
      form.get(NpiOrderFormField.MATERIAL_PURCHASE_ESTIMATED_DATE)?.value ??
      null;
    const shippingDateValue: Date | null =
      form.get(NpiOrderFormField.SHIPPING_ESTIMATED_DATE)?.value ?? null;
    const customerApprovalDateValue: Date | null =
      form.get(NpiOrderFormField.CUSTOMER_APPROVAL_ESTIMATED_DATE)?.value ??
      null;
    const customerId: Customer | null =
      form.get(NpiOrderFormField.CUSTOMER)?.value?.uid ?? null;

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
      customerId: customerId || undefined,
      productName: form.get(NpiOrderFormField.PRODUCT_NAME)?.value || undefined,
      materialPurchaseEstimatedDate: materialPurchaseDateValue
        ? RegexPatterns.enDateFormatToString(materialPurchaseDateValue)
        : undefined,
      materialReceivingPlanTimeInDays: form.get(
        NpiOrderFormField.MATERIAL_RECEIVING_PLAN_TIME_IN_DAYS,
      )?.value,
      productionPlanTimeInDays: form.get(
        NpiOrderFormField.PRODUCTION_PLAN_TIME_IN_DAYS,
      )?.value,
      testingPlanTimeInDays: form.get(
        NpiOrderFormField.TESTING_PLAN_TIME_IN_DAYS,
      )?.value,
      shippingEstimatedDate: shippingDateValue
        ? RegexPatterns.enDateFormatToString(shippingDateValue)
        : undefined,
      customerApprovalEstimatedDate: customerApprovalDateValue
        ? RegexPatterns.enDateFormatToString(customerApprovalDateValue)
        : undefined,
    } as NpiOrderCreate | NpiOrderUpdate;
  }
}
