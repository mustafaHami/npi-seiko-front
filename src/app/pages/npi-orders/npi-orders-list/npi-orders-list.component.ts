import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from "@angular/core";
import { CardModule } from "primeng/card";
import { PrimeTemplate } from "primeng/api";
import { Button } from "primeng/button";
import { SearchInputComponent } from "../../../components/search-input/search-input.component";
import { TableLazyLoadEvent, TableModule } from "primeng/table";
import { TooltipModule } from "primeng/tooltip";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { HandleToastMessageService } from "../../../services/handle-toast-message.service";
import { ModalService } from "../../../services/components/modal.service";
import { CustomTitleComponent } from "../../../components/custom-title/custom-title.component";
import { NpiOrder, NpiOrdersPaginated, NpiOrderStatus } from "../../../../client/costSeiko";
import { NoDoubleClickDirective } from "../../../directives/no-double-click.directive";
import { BaseListComponent } from "../../../models/classes/base-list-component";
import { NpiOrderRepo } from "../../../repositories/npi-order.repo";
import { Icons } from "../../../models/enums/icons";
import { TableColsTitle } from "../../../models/enums/table-cols-title";
import { RoutingService } from "../../../services/Routing.service";
import { RouteId } from "../../../models/enums/routes-id";
import { NpiOrderStatusPipe } from "../../../pipes/npi-order-status.pipe";
import { Tag } from "primeng/tag";
import { switchMap } from "rxjs";

@Component({
  selector: "app-npi-orders-list",
  imports: [
    CardModule,
    PrimeTemplate,
    Button,
    SearchInputComponent,
    TableModule,
    TooltipModule,
    CustomTitleComponent,
    NoDoubleClickDirective,
    NpiOrderStatusPipe,
    Tag,
  ],
  templateUrl: "./npi-orders-list.component.html",
  styleUrl: "./npi-orders-list.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NpiOrdersListComponent extends BaseListComponent implements OnInit {
  npiOrders = signal<NpiOrder[]>([]);

  protected readonly TableColsTitle = TableColsTitle;
  protected readonly Icons = Icons;
  protected readonly NpiOrderStatus = NpiOrderStatus;

  private npiOrderRepo = inject(NpiOrderRepo);
  private handleMessage = inject(HandleToastMessageService);
  private modalService = inject(ModalService);

  constructor() {
    super();
    this.title = RoutingService.getRouteTitle(RouteId.NPI_ORDERS);
  }

  ngOnInit(): void {
    this.loading = true;
  }

  override loadData(event: TableLazyLoadEvent): void {
    super.loadData(event);
    this.npiOrderRepo
      .searchNpiOrders(event.first, event.rows, this.searchText)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((results: NpiOrdersPaginated) => {
        this.npiOrders.set(results.results);
        this.totalRecords = results.total;
        this.loading = false;
      });
  }

  createNpiOrder(): void {
    this.modalService
      .showNpiOrderCreateEditModal(false)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((created?: boolean) => {
        if (created) {
          this.loadData(this.lastTableLazyLoadEvent);
        }
      });
  }

  editNpiOrder(npiOrder: NpiOrder): void {
    this.npiOrderRepo
      .getNpiOrder(npiOrder.uid)
      .pipe(
        switchMap((order) =>
          this.modalService.showNpiOrderCreateEditModal(true, order),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((updated?: boolean) => {
        if (updated) {
          this.loadData(this.lastTableLazyLoadEvent);
        }
      });
  }

  abortNpiOrder(npiOrder: NpiOrder): void {
    this.npiOrderRepo
      .abortNpiOrder(npiOrder.uid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.handleMessage.successMessage(
            `NPI Order ${npiOrder.purchaseOrderNumber} aborted`,
          );
          this.loadData(this.lastTableLazyLoadEvent);
        },
      });
  }

  canAbort(npiOrder: NpiOrder): boolean {
    return (
      npiOrder.status === NpiOrderStatus.READY_TO_PRODUCTION ||
      npiOrder.status === NpiOrderStatus.STARTED
    );
  }
}
