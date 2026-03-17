import { Injectable } from "@angular/core";
import {
  NpiOrder2 as NpiOrderSdk,
  NpiOrder,
  NpiOrderCreate,
  NpiOrderUpdate,
  NpiOrdersPaginated,
  NpiOrderSearch,
  ArchivedFilter,
} from "../../client/costSeiko";
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
}
