import { Pipe, PipeTransform } from "@angular/core";
import { ProcessLineStatus } from "../../client/npiSeiko";

@Pipe({
  name: "processLineStatus",
  standalone: true,
})
export class NpiOrderProcessLinePipe implements PipeTransform {
  transform(
    value: ProcessLineStatus,
    returnType: "label" | "severity" = "label",
  ): any {
    if (returnType === "severity") {
      return this.getSeverity(value);
    }
    return this.getLabel(value);
  }

  private getLabel(value: ProcessLineStatus): string {
    switch (value) {
      case ProcessLineStatus.NOT_STARTED:
        return "NOT STARTED";
      case ProcessLineStatus.IN_PROGRESS:
        return "IN PROGRESS";
      case ProcessLineStatus.COMPLETED:
        return "COMPLETED";
      case ProcessLineStatus.ABORTED:
        return "ABORTED";
      default:
        return "";
    }
  }

  private getSeverity(
    value: ProcessLineStatus,
  ): "success" | "warn" | "danger" | "secondary" | "info" | "contrast" {
    switch (value) {
      case ProcessLineStatus.NOT_STARTED:
        return "secondary";
      case ProcessLineStatus.IN_PROGRESS:
        return "warn";
      case ProcessLineStatus.COMPLETED:
        return "success";
      case ProcessLineStatus.ABORTED:
        return "danger";
      default:
        return "secondary";
    }
  }
}
