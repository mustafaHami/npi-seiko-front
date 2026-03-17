import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Button } from "primeng/button";
import {
  Dashboard,
  DashboardGlobalKpis,
  DashboardNpiCountByStatus,
  DashboardProcessStageKpi,
  DashboardWorstNpiOrder,
} from "../../../client/npiSeiko";
import { DashboardRepo } from "../../repositories/dashboard.repo";
import { DashboardKpisComponent } from "./components/dashboard-kpis/dashboard-kpis.component";
import { DashboardWorstOrdersComponent } from "./components/dashboard-worst-orders/dashboard-worst-orders.component";
import { DashboardStatusChartComponent } from "./components/dashboard-status-chart/dashboard-status-chart.component";
import { DashboardProcessStageChartComponent } from "./components/dashboard-process-stage-chart/dashboard-process-stage-chart.component";
import { Icons } from "../../models/enums/icons";
import { CustomTitleComponent } from "../../components/custom-title/custom-title.component";
import { Card } from "primeng/card";
import { PrimeTemplate } from "primeng/api";
import { finalize } from "rxjs";
import { RoutingService } from "../../services/Routing.service";
import { RouteId } from "../../models/enums/routes-id";
import { DatePipe } from "@angular/common";
import { LoaderService } from "../../services/components/loader.service";
import { HandleToastMessageService } from "../../services/handle-toast-message.service";
import { FileService } from "../../services/file.service";

@Component({
  selector: "app-dashboard",
  imports: [
    Button,
    DashboardKpisComponent,
    DashboardWorstOrdersComponent,
    DashboardStatusChartComponent,
    DashboardProcessStageChartComponent,
    CustomTitleComponent,
    Card,
    PrimeTemplate,
    DatePipe,
  ],
  templateUrl: "./dashboard.component.html",
  styleUrl: "./dashboard.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  title = RoutingService.getRouteTitle(RouteId.DASHBOARD);
  lastRefreshedAt = signal<Date | undefined>(undefined);
  loading = signal<boolean>(true);
  exportingInProgress = signal<boolean>(false);
  exportingArchived = signal<boolean>(false);
  globalKpis = signal<DashboardGlobalKpis | undefined>(undefined);
  worstNpiOrders = signal<DashboardWorstNpiOrder[]>([]);
  npiCountByStatus = signal<DashboardNpiCountByStatus[]>([]);
  processStageKpis = signal<DashboardProcessStageKpi[]>([]);
  protected readonly Icons = Icons;
  private dashboardRepo = inject(DashboardRepo);
  private destroyRef = inject(DestroyRef);
  private loaderService = inject(LoaderService);
  private handleMessage = inject(HandleToastMessageService);
  private fileService = inject(FileService);

  ngOnInit(): void {
    this.loadDashboard();
  }

  refresh(): void {
    this.loadDashboard();
  }

  exportInProgress(): void {
    this.loaderService.showLoader("Exporting open request for quotation...");
    this.dashboardRepo
      .exportInProgress()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          setTimeout(() => {
            this.loaderService.hideLoader();
          }, 800);
        }),
      )
      .subscribe({
        next: (response) => {
          setTimeout(() => {
            this.fileService.downloadFile(
              response.body,
              response,
              "in-progress-npi-orders.xlsx",
            );
            this.handleMessage.successMessage("Export downloaded successfully");
          }, 800);
        },
      });
  }

  exportArchived(): void {
    this.loaderService.showLoader(
      "Exporting archived request for quotation...",
    );
    this.dashboardRepo
      .exportArchived()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          setTimeout(() => {
            this.loaderService.hideLoader();
          }, 800);
        }),
      )
      .subscribe({
        next: (response) => {
          setTimeout(() => {
            this.fileService.downloadFile(
              response.body,
              response,
              "archived-npi-orders.xlsx",
            );
            this.handleMessage.successMessage("Export downloaded successfully");
          }, 800);
        },
      });
  }

  private loadDashboard(): void {
    this.dashboardRepo
      .getDashboard()
      .pipe(
        finalize(() => {
          setTimeout(() => {
            this.loading.set(false);
            this.lastRefreshedAt.set(new Date());
          }, 600);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (data: Dashboard) => {
          this.globalKpis.set(data.globalKpis);
          this.worstNpiOrders.set(data.worstNpiOrders ?? []);
          this.npiCountByStatus.set(data.npiCountByStatus ?? []);
          this.processStageKpis.set(data.processStageKpis ?? []);
        },
      });
  }
}
