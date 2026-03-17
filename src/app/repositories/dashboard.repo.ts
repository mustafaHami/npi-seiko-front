import { inject, Injectable } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";
import { Dashboard as DashboardSdk } from "../../client/npiSeiko/sdk.gen";
import { Dashboard } from "../../client/npiSeiko";
import { fromRequest } from "../services/utils/api-utils";
import { environment } from "../../environments/environment";
import { FileService } from "../services/file.service";
import { HandleToastMessageService } from "../services/handle-toast-message.service";

@Injectable({
  providedIn: "root",
})
export class DashboardRepo {
  private npiOrderPath = `${environment.backendUrl}/npi-orders`;
  private dashboardSdk = inject(DashboardSdk);
  private http = inject(HttpClient);
  private fileService = inject(FileService);
  private handleMessage = inject(HandleToastMessageService);

  getDashboard(): Observable<Dashboard> {
    return fromRequest(
      this.dashboardSdk.retrieveDashboard(),
    ) as Observable<Dashboard>;
  }

  exportInProgress() {
    const url = `${this.npiOrderPath}/in-progress/export`;
    return this.http.post(url, null, {
      responseType: "blob",
      observe: "response",
      headers: new HttpHeaders({
        Accept: "application/json",
      }),
    });
  }

  exportArchived() {
    const url = `${this.npiOrderPath}/archived/export`;
    return this.http.post(url, null, {
      responseType: "blob",
      observe: "response",
      headers: new HttpHeaders({
        Accept: "application/json",
      }),
    });
  }
}
