import { inject } from "@angular/core";
import { Routes } from "@angular/router";

import { RouteId } from "../../models/enums/routes-id";
import { RoutingService } from "../../services/Routing.service";
import { RoleGuard } from "../../security/role.guard";
import { AdminUsersComponent } from "./admin-users/admin-users.component";

export const adminRoutes: Routes = [
  {
    path: "",
    pathMatch: "full",
    redirectTo: RoutingService.getRouteEnv(RouteId.ADMIN_USERS).path,
  },
  {
    path: RoutingService.getRouteEnv(RouteId.ADMIN_USERS).path,
    component: AdminUsersComponent,
    canActivate: [() => inject(RoleGuard).canActivate(RouteId.ADMIN_USERS)],
  },
];
