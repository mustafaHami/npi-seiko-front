import { Routes } from "@angular/router";
import { LoginComponent } from "./pages/public/login/login.component";
import { AuthGuardService } from "./security/auth.guard.service";
import { inject } from "@angular/core";
import { RoleGuard } from "./security/role.guard";
import { RoutingService } from "./services/Routing.service";
import { RouteId } from "./models/enums/routes-id";
import { ForgotPasswordComponent } from "./pages/public/forgot-password/forgot-password.component";
import { ResetPasswordComponent } from "./pages/public/reset-password/reset-password.component";
import { SetFirstPasswordComponent } from "./pages/public/set-first-password/set-first-password.component";

export const routes: Routes = [
  {
    path: "",
    redirectTo: RoutingService.getRouteEnv(RouteId.LOGIN).path,
    pathMatch: "full",
  },
  {
    path: RoutingService.getRouteEnv(RouteId.LOGIN).path,
    component: LoginComponent,
    canActivate: [() => inject(AuthGuardService).redirectToDashboardIfLogged()],
  },
  {
    path: RoutingService.getRouteEnv(RouteId.FORGOT_PASSWORD).path,
    component: ForgotPasswordComponent,
    canActivate: [() => inject(AuthGuardService).redirectToDashboardIfLogged()],
  },
  {
    path: RoutingService.getRouteEnv(RouteId.RESET_PASSWORD).path,
    component: ResetPasswordComponent,
    canActivate: [() => inject(AuthGuardService).redirectToDashboardIfLogged()],
  },
  {
    path: RoutingService.getRouteEnv(RouteId.SET_FIRST_PASSWORD).path,
    component: SetFirstPasswordComponent,
    canActivate: [() => inject(AuthGuardService).redirectToDashboardIfLogged()],
  },
  {
    path: RoutingService.getRouteEnv(RouteId.NPI_ORDERS).path,
    loadChildren: () =>
      import("./pages/npi-orders/npi-orders.routes").then(
        (m) => m.npiOrdersRoutes,
      ),
    canActivate: [
      () => inject(AuthGuardService).canActivate(),
      () => inject(RoleGuard).canActivate(RouteId.NPI_ORDERS),
    ],
  },
  {
    path: RoutingService.getRouteEnv(RouteId.DASHBOARD).path,
    loadChildren: () =>
      import("./pages/dashboard/dashboard.routes").then(
        (m) => m.dashboardRoutes,
      ),
    canActivate: [() => inject(AuthGuardService).canActivate()],
  },
  // WILDCARD: MUST BE LAST ROUTE IN THE LIST
  {
    path: "**",
    redirectTo: RoutingService.getRouteEnv(RouteId.LOGIN).path,
  },
];
