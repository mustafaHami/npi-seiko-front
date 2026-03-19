import { Injectable } from "@angular/core";
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators,
} from "@angular/forms";
import { NpiOrderFormField } from "../../models/enums/form-field-names/npi-order-form-field";
import { recordToMap } from "../../models/recordToMap";
import {
  Customer,
  NpiOrder,
  UserRole,
  UserType,
} from "../../../client/npiSeiko";
import { DateFormField } from "../../models/enums/date-form-field";
import { UserFormField } from "../../models/enums/form-field-names/user-form-field";
import { CustomerFormField } from "../../models/enums/form-field-names/customer-form-field";

@Injectable({
  providedIn: "root",
})
export class FormService {
  constructor(private fb: FormBuilder) {}

  trimFormStringValues(form: FormGroup): void {
    Object.keys(form.controls).forEach((key) => {
      const control = form.get(key);
      if (control) {
        if (control instanceof FormGroup) {
          this.trimFormStringValues(control);
        } else if (typeof control.value === "string") {
          const trimmedValue = control.value.trim();
          control.setValue(trimmedValue === "" ? undefined : trimmedValue, {
            emitEvent: false,
          });
        }
      }
    });
  }

  buildCustomerForm(customer?: Customer): FormGroup {
    return this.fb.group({
      [CustomerFormField.NAME]: new FormControl<string>(customer?.name ?? "", [
        Validators.required,
      ]),
      [CustomerFormField.CODE]: new FormControl<string>(customer?.code ?? "", [
        Validators.required,
      ]),
    });
  }

  buildUserForm(type: UserType, form?: FormGroup): FormGroup {
    let role = null;
    if (form) {
      role = form.get(UserFormField.ROLE)?.value ?? "";
    }
    const formGroup: FormGroup = this.fb.group({
      [UserFormField.ROLE]: new FormControl<UserRole | null>(role, [
        Validators.required,
      ]),
    });
    if (type === UserType.USERNAME) {
      formGroup.addControl(
        UserFormField.USERNAME,
        new FormControl<string>("", [Validators.required]),
      );
      formGroup.addControl(
        UserFormField.PASSWORD,
        new FormControl<string>("", [Validators.required]),
      );
    } else {
      formGroup.addControl(
        UserFormField.EMAIL,
        new FormControl<string>("", [Validators.required, Validators.email]),
      );
    }
    return formGroup;
  }

  buildDateForm() {
    const today = new Date();
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(today.getDate() - 14);
    return this.fb.group({
      [DateFormField.START_DATE]: new FormControl<Date | null>(twoWeeksAgo, [
        Validators.required,
      ]),
      [DateFormField.END_DATE]: new FormControl<Date | null>(today, [
        Validators.required,
      ]),
    });
  }

  buildNpiOrderForm(npiOrder?: NpiOrder): FormGroup {
    return this.fb.group({
      [NpiOrderFormField.PURCHASE_ORDER_NUMBER]: new FormControl<string>(
        npiOrder?.purchaseOrderNumber ?? "",
        [Validators.required],
      ),
      [NpiOrderFormField.WORK_ORDER_ID]: new FormControl<string>(
        npiOrder?.workOrderId ?? "",
        [Validators.required],
      ),
      [NpiOrderFormField.PART_NUMBER]: new FormControl<string>(
        npiOrder?.partNumber ?? "",
        [Validators.required],
      ),
      [NpiOrderFormField.QUANTITY]: new FormControl<number | null>(
        npiOrder?.quantity ?? null,
        [Validators.required, Validators.min(1)],
      ),
      [NpiOrderFormField.ORDER_DATE]: new FormControl<Date | null>(
        npiOrder?.orderDate ? new Date(npiOrder.orderDate) : new Date(),
        [Validators.required],
      ),
      [NpiOrderFormField.TARGET_DELIVERY_DATE]: new FormControl<Date | null>(
        npiOrder?.targetDeliveryDate
          ? new Date(npiOrder.targetDeliveryDate)
          : null,
      ),
      [NpiOrderFormField.CUSTOMER]: new FormControl<Customer | null>(null),
      [NpiOrderFormField.PRODUCT_NAME]: new FormControl<string>(
        npiOrder?.productName ?? "",
      ),
      [NpiOrderFormField.MATERIAL_PURCHASE_ESTIMATED_DATE]:
        new FormControl<Date | null>(
          npiOrder?.materialPurchaseEstimatedDate
            ? new Date(npiOrder.materialPurchaseEstimatedDate)
            : null,
          [Validators.required],
        ),
      [NpiOrderFormField.MATERIAL_RECEIVING_PLAN_TIME_IN_DAYS]: new FormControl<
        number | null
      >(npiOrder?.materialReceivingPlanTimeInDays ?? null, [
        Validators.required,
        Validators.min(0),
      ]),
      [NpiOrderFormField.PRODUCTION_PLAN_TIME_IN_DAYS]: new FormControl<
        number | null
      >(npiOrder?.productionPlanTimeInDays ?? null, [
        Validators.required,
        Validators.min(0),
      ]),
      [NpiOrderFormField.TESTING_PLAN_TIME_IN_DAYS]: new FormControl<
        number | null
      >(npiOrder?.testingPlanTimeInDays ?? null, [
        Validators.required,
        Validators.min(0),
      ]),
      [NpiOrderFormField.SHIPPING_ESTIMATED_DATE]: new FormControl<Date | null>(
        npiOrder?.shippingEstimatedDate
          ? new Date(npiOrder.shippingEstimatedDate)
          : null,
        [Validators.required],
      ),
      [NpiOrderFormField.CUSTOMER_APPROVAL_ESTIMATED_DATE]:
        new FormControl<Date | null>(
          npiOrder?.customerApprovalEstimatedDate
            ? new Date(npiOrder.customerApprovalEstimatedDate)
            : null,
          [Validators.required],
        ),
    });
  }

  formatEnumToReadableLabels(
    enumObj: Record<string, string>,
  ): Map<string, string> {
    const record = Object.values(enumObj).reduce(
      (acc, value) => {
        acc[value] = value
          .replace(/([A-Z])/g, " $1")
          .toLowerCase()
          .replace(/^./, (str) => str.toUpperCase());
        return acc;
      },
      {} as Record<string, string>,
    );
    return recordToMap(record);
  }

  clearValidators(control: AbstractControl | null) {
    if (control) {
      control.clearValidators();
      control.clearAsyncValidators();
      control.setErrors(null);
      control.updateValueAndValidity();
    }
  }

  setRequired(control: AbstractControl | null) {
    if (control) {
      control.setValidators([Validators.required]);
      control.updateValueAndValidity();
    }
  }

  getFormValueExistId(key: any, formGroup: FormGroup): boolean {
    const moldId = formGroup.get(key)?.value;
    return moldId && moldId.trim() !== "";
  }

  private atLeastOneItemRequired(
    control: AbstractControl,
  ): ValidationErrors | null {
    if (control instanceof Array || !control) return null; // sécurité

    const array = control as any;
    return array.controls.length > 0 ? null : { required: true };
  }
}
