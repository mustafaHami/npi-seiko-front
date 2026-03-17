import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { NgxEchartsDirective } from "ngx-echarts";
import { EChartsOption } from "echarts";
import {
  DashboardNpiCountByStatus,
  NpiOrderStatus,
} from "../../../../../client/npiSeiko";
import { Icons } from "../../../../models/enums/icons";

const STATUS_COLORS: Record<string, string> = {
  [NpiOrderStatus.READY_TO_PRODUCTION]: "#3b82f6",
  [NpiOrderStatus.STARTED]: "#f97316",
  [NpiOrderStatus.COMPLETED]: "#48b461",
  [NpiOrderStatus.ABORTED]: "#dc3545",
};

const STATUS_LABELS: Record<string, string> = {
  [NpiOrderStatus.READY_TO_PRODUCTION]: "Ready to Production",
  [NpiOrderStatus.STARTED]: "Started",
  [NpiOrderStatus.COMPLETED]: "Completed",
  [NpiOrderStatus.ABORTED]: "Aborted",
};

@Component({
  selector: "app-dashboard-status-chart",
  imports: [NgxEchartsDirective],
  templateUrl: "./dashboard-status-chart.component.html",
  styleUrl: "./dashboard-status-chart.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardStatusChartComponent {
  data = input<DashboardNpiCountByStatus[]>([]);

  chartOptions = computed<EChartsOption>(() => {
    const items = this.data();
    const series = items
      .filter((d) => d.status && d.count != null)
      .map((d) => ({
        name: STATUS_LABELS[d.status!] ?? d.status!,
        value: d.count!,
        itemStyle: {
          color: STATUS_COLORS[d.status!] ?? "#94a3b8",
        },
      }));

    return {
      tooltip: {
        trigger: "item",
        formatter: "{b}: {c} ({d}%)",
        backgroundColor: "#ffffff",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        textStyle: { color: "#334155", fontSize: 12 },
      },
      legend: {
        orient: "vertical",
        right: "0%",
        top: "middle",
        icon: "circle",
        itemWidth: 10,
        itemHeight: 10,
        textStyle: {
          fontSize: 11,
          color: "#64748b",
        },
        formatter: (name: string) => {
          const found = series.find((s) => s.name === name);
          return `${name}  (${found?.value ?? 0})`;
        },
      },
      series: [
        {
          type: "pie",
          radius: ["45%", "75%"],
          center: ["35%", "50%"],
          avoidLabelOverlap: false,
          label: { show: false },
          emphasis: {
            label: { show: false },
            itemStyle: {
              shadowBlur: 12,
              shadowColor: "rgba(0,0,0,0.12)",
            },
          },
          data: series,
        },
      ],
    };
  });

  protected readonly Icons = Icons;
}
