import { Pipe, PipeTransform } from "@angular/core";
import { NpiOrderStatus } from "../../client/costSeiko";

@Pipe({
  name: "npiOrderStatus",
  standalone: true,
})
export class NpiOrderStatusPipe implements PipeTransform {
  transform(
    value: NpiOrderStatus,
    returnType: "label" | "severity" = "label",
  ): any {
    if (returnType === "severity") {
      return this.getSeverity(value);
    }
    return this.getLabel(value);
  }

  private getLabel(value: NpiOrderStatus): string {
    switch (value) {
      case NpiOrderStatus.READY_TO_PRODUCTION:
        return "Ready to Production";
      case NpiOrderStatus.STARTED:
        return "Started";
      case NpiOrderStatus.COMPLETED:
        return "Completed";
      case NpiOrderStatus.ABORTED:
        return "Aborted";
      default:
        return "";
    }
  }

  private getSeverity(
    value: NpiOrderStatus,
  ): "success" | "warn" | "danger" | "secondary" | "info" | "contrast" {
    switch (value) {
      case NpiOrderStatus.READY_TO_PRODUCTION:
        return "info";
      case NpiOrderStatus.STARTED:
        return "warn";
      case NpiOrderStatus.COMPLETED:
        return "success";
      case NpiOrderStatus.ABORTED:
        return "danger";
      default:
        return "secondary";
    }
  }
}
