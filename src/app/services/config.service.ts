import { DestroyRef, Injectable, signal } from "@angular/core";
import { HttpClient, HttpContext } from "@angular/common/http";
import { catchError, EMPTY, firstValueFrom, switchMap, timer } from "rxjs";
import { environment } from "../../environments/environment";
import { MessageService } from "primeng/api";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { SKIP_ERROR_TOAST } from "../configs/interceptors/http-context-tokens";

interface AppConfig {
  apiUrl: string;
  version: string;
  buildTimestamp: string;
}

@Injectable({
  providedIn: "root",
})
export class ConfigService {
  private currentVersion: string | null = null;
  private backendUp = signal<boolean>(false);

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private destroyRef: DestroyRef,
  ) {}

  async loadConfig() {
    const configObject: AppConfig = await firstValueFrom(this.loadAppConfig());
    environment.backendUrl = configObject.apiUrl;
    this.currentVersion = configObject.version;
    this.backendUp.set(true);
    this.initVersion();
    this.openBroadcastForReload();
  }

  updateBackendUp(backendUp: boolean) {
    this.backendUp.set(backendUp);
  }

  openBroadcastForReload() {
    const channel = new BroadcastChannel("app_channel");

    channel.onmessage = (msg) => {
      if (msg.data === "reload") {
        console.debug("Reload received from another tab");
        location.reload();
      }
    };
  }

  private initVersion() {
    const initialDelay = this.getDelayUntilNextMinute();
    timer(initialDelay, 60_000)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() => this.loadAppConfig()),
      )
      .subscribe((configObject) => {
        if (!configObject) {
          return;
        }
        this.checkVersion(configObject);
      });
  }

  private getDelayUntilNextMinute(): number {
    const now = Date.now(); // number
    const remainder = now % 60_000; // 0..59999
    return (60_000 - remainder) % 60_000; // 0..59999 (0 si déjà pile)
  }

  private checkVersion(configObject: AppConfig) {
    const version = configObject.version;
    if (!this.currentVersion) {
      this.currentVersion = version;
      return;
    }
    if (this.currentVersion !== version) {
      this.notifyUser();
      // No need to update currentVersion
      // because after reloading page,
      // current version will be updated again in loadConfig.
    }
  }

  private loadAppConfig() {
    return this.http
      .get<AppConfig>(environment.configUrlPath, {
        headers: { "Cache-Control": "no-cache" },
        context: new HttpContext().set(SKIP_ERROR_TOAST, true),
      })
      .pipe(
        catchError((err) => {
          console.error("Error reloading config file", err);
          return EMPTY;
        }),
      );
  }

  private notifyUser() {
    this.messageService.clear("updateToast");
    if (this.backendUp()) {
      this.messageService.add({
        key: "updateToast",
        severity: "info",
        summary: "New version available!",
        detail: "Click on this message to load the new version",
        sticky: true,
        closable: false,
      });
    }
  }
}
