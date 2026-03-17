import {
  ChangeDetectionStrategy,
  Component,
  input,
} from "@angular/core";
import { DatePipe } from "@angular/common";
import { Tag } from "primeng/tag";
import { DashboardWorstNpiOrder } from "../../../../../client/npiSeiko";
import { Icons } from "../../../../models/enums/icons";

@Component({
  selector: "app-dashboard-worst-orders",
  imports: [DatePipe, Tag],
  templateUrl: "./dashboard-worst-orders.component.html",
  styleUrl: "./dashboard-worst-orders.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardWorstOrdersComponent {
  orders = input<DashboardWorstNpiOrder[]>([]);

  protected readonly Icons = Icons;

  delaySeverity(
    delayInDays: number | undefined,
  ): "danger" | "warn" | "success" {
    if (!delayInDays || delayInDays <= 0) return "success";
    if (delayInDays <= 7) return "warn";
    return "danger";
  }
}
