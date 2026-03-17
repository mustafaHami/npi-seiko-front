import { Injectable } from "@angular/core";
import {
  ArchivedFilter,
  NpiOrder,
  NpiOrder2 as NpiOrderSdk,
  NpiOrderCreate,
  NpiOrderSearch,
  NpiOrdersPaginated,
  NpiOrderUpdate,
  OutputProcessLineUpdate,
  Process,
  ProcessLineMaterialDeliveryDateImport,
  ProcessLineStatusesHistory,
  ProcessLineStatusUpdateBody,
} from "../../client/npiSeiko";
import { Observable } from "rxjs";
import { fromRequest } from "../services/utils/api-utils";

@Injectable({
  providedIn: "root",
})
export class NpiOrderRepo {
  constructor(private npiOrderService: NpiOrderSdk) {}

  searchNpiOrders(
    offset?: number | null,
    limit?: number | null,
    search?: string,
    archivedFilter: ArchivedFilter = ArchivedFilter.NON_ARCHIVED_ONLY,
  ): Observable<NpiOrdersPaginated> {
    const body: NpiOrderSearch = {
      searchText: search ?? "",
      statuses: [],
    };
    return fromRequest(
      this.npiOrderService.searchNpiOrders({
        body,
        query: {
          offset: offset ?? 0,
          limit: limit ?? 10,
          archivedFilter,
        },
      }),
    ) as Observable<NpiOrdersPaginated>;
  }

  getNpiOrder(uid: string): Observable<NpiOrder> {
    return fromRequest(
      this.npiOrderService.retrieveNpiOrder({
        path: { uid },
      }),
    ) as Observable<NpiOrder>;
  }

  createNpiOrder(body: NpiOrderCreate): Observable<NpiOrder> {
    return fromRequest(
      this.npiOrderService.createNpiOrder({ body }),
    ) as Observable<NpiOrder>;
  }

  updateNpiOrder(uid: string, body: NpiOrderUpdate): Observable<NpiOrder> {
    return fromRequest(
      this.npiOrderService.updateNpiOrder({
        path: { uid },
        body,
      }),
    ) as Observable<NpiOrder>;
  }

  abortNpiOrder(uid: string): Observable<NpiOrder> {
    return fromRequest(
      this.npiOrderService.abortNpiOrder({
        path: { uid },
      }),
    ) as Observable<NpiOrder>;
  }

  getNpiOrderProcess(uid: string): Observable<Process> {
    return fromRequest(
      this.npiOrderService.retriveNpiOrderProcess({
        path: { uid },
      }),
    ) as Observable<Process>;
  }

  getNpiOrderProcessLineHistory(
    uid: string,
    lineUid: string,
  ): Observable<ProcessLineStatusesHistory> {
    return fromRequest(
      this.npiOrderService.retrieveNpiOrderStatusesHistory({
        path: { uid, lineUid },
      }),
    ) as Observable<ProcessLineStatusesHistory>;
  }

  updateNpiOrderProcessLineStatus(
    uid: string,
    lineUid: string,
    body: ProcessLineStatusUpdateBody,
  ): Observable<OutputProcessLineUpdate> {
    return fromRequest(
      this.npiOrderService.updateNpiOrderProcessLineStatus({
        path: { uid, lineUid },
        body,
      }),
    ) as Observable<OutputProcessLineUpdate>;
  }

  importNpiOrderProcessLineMaterialDeliveryDate(
    uid: string,
    lineUid: string,
    body: ProcessLineMaterialDeliveryDateImport,
  ): Observable<string> {
    return fromRequest(
      this.npiOrderService.importMaterialLatestDeliveryDate({
        path: { uid, lineUid },
        body,
      }),
    ) as Observable<string>;
  }
}
