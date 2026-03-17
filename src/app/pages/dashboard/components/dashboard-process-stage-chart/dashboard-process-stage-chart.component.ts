import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { NgxEchartsDirective } from "ngx-echarts";
import { EChartsOption } from "echarts";
import { DashboardProcessStageKpi } from "../../../../../client/npiSeiko";
import { Icons } from "../../../../models/enums/icons";

@Component({
  selector: "app-dashboard-process-stage-chart",
  imports: [NgxEchartsDirective],
  templateUrl: "./dashboard-process-stage-chart.component.html",
  styleUrl: "./dashboard-process-stage-chart.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardProcessStageChartComponent {
  data = input<DashboardProcessStageKpi[]>([]);

  chartOptions = computed<EChartsOption>(() => {
    const items = this.data();
    const categories = items.map((d) => d.processName ?? "");
    const notStarted = items.map((d) => d.notStartedCount ?? 0);
    const inProgress = items.map((d) => d.inProgressCount ?? 0);

    return {
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: "#ffffff",
        borderColor: "#e2e8f0",
        borderWidth: 1,
        textStyle: { color: "#334155", fontSize: 12 },
      },
      legend: {
        top: 0,
        right: 0,
        icon: "roundRect",
        itemWidth: 12,
        itemHeight: 8,
        textStyle: { fontSize: 11, color: "#64748b" },
      },
      grid: {
        top: 36,
        left: 4,
        right: 8,
        bottom: 4,
        containLabel: true,
      },
      xAxis: {
        type: "value",
        minInterval: 1,
        axisLabel: { fontSize: 10, color: "#94a3b8" },
        splitLine: {
          lineStyle: { color: "#f1f5f9" },
        },
      },
      yAxis: {
        type: "category",
        data: categories,
        axisLabel: {
          fontSize: 10,
          color: "#64748b",
          width: 110,
          overflow: "truncate",
        },
        axisTick: { show: false },
        axisLine: { show: false },
      },
      series: [
        {
          name: "Not Started",
          type: "bar",
          data: notStarted,
          barMaxWidth: 16,
          itemStyle: {
            color: "#cbd5e1",
            borderRadius: [0, 4, 4, 0],
          },
          emphasis: {
            itemStyle: { color: "#94a3b8" },
          },
        },
        {
          name: "In Progress",
          type: "bar",
          data: inProgress,
          barMaxWidth: 16,
          itemStyle: {
            color: "#f97316",
            borderRadius: [0, 4, 4, 0],
          },
          emphasis: {
            itemStyle: { color: "#ea580c" },
          },
        },
      ],
    };
  });

  protected readonly Icons = Icons;
}
