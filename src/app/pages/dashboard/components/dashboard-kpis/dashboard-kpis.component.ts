import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { DashboardGlobalKpis } from "../../../../../client/npiSeiko";
import { Icons } from "../../../../models/enums/icons";

interface KpiGroup {
  title: string;
  theme: "danger" | "success";
  count: number;
  countLabel: string;
  leadTime: string;
}

interface StandaloneKpi {
  label: string;
  value: string | number;
  theme: "info" | "warn";
}

@Component({
  selector: "app-dashboard-kpis",
  imports: [],
  templateUrl: "./dashboard-kpis.component.html",
  styleUrl: "./dashboard-kpis.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardKpisComponent {
  kpis = input<DashboardGlobalKpis | undefined>(undefined);

  groups = computed<KpiGroup[]>(() => {
    const k = this.kpis();
    return [
      {
        title: "Open",
        theme: "danger",
        count: k?.openNpiCount ?? 0,
        countLabel: "NPI Orders",
        leadTime:
          k?.averageLeadTimeDaysOpenNpiOrders != null
            ? Number(k.averageLeadTimeDaysOpenNpiOrders).toFixed(1)
            : "—",
      },
      {
        title: "Finalized",
        theme: "success",
        count: k?.completedNpiCount ?? 0,
        countLabel: "NPI Orders",
        leadTime:
          k?.averageLeadTimeDaysCompletedNpiOrders != null
            ? Number(k.averageLeadTimeDaysCompletedNpiOrders).toFixed(1)
            : "—",
      },
    ];
  });

  standaloneKpis = computed<StandaloneKpi[]>(() => {
    const k = this.kpis();
    return [
      {
        label: "Total Open Qty",
        value: k?.totalOpenQuantity ?? 0,
        theme: "info",
      },
      {
        label: "Pending Approval",
        value: k?.customerApprovalPendingCount ?? 0,
        theme: "warn",
      },
    ];
  });

  protected readonly Icons = Icons;
}
