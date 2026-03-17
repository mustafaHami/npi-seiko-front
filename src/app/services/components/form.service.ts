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
  NpiOrder,
  FileInfo,
  UserRole,
  UserType,
} from "../../../client/costSeiko";
import { DateFormField } from "../../models/enums/date-form-field";
import { LeadTimeType } from "../../models/lead-time-type";

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
          npiOrder?.orderDate ? new Date(npiOrder.orderDate) : null,
      ),
      [NpiOrderFormField.TARGET_DELIVERY_DATE]: new FormControl<string>(
          npiOrder?.targetDeliveryDate ?? "",
      ),
      [NpiOrderFormField.CUSTOMER_NAME]: new FormControl<string>(
          npiOrder?.customerName ?? "",
      ),
      [NpiOrderFormField.PRODUCT_NAME]: new FormControl<string>(
          npiOrder?.productName ?? "",
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
