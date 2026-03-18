import { RouteId } from "../app/models/enums/routes-id";
import { RouteEnv } from "../app/models/interfaces/env/RouteEnv";

export const routeEnvironment: RouteEnv[] = [
  {
    id: RouteId.LOGIN,
    path: "login",
    enable: true,
    title: "Login",
  },
  {
    id: RouteId.FORGOT_PASSWORD,
    path: "forgot-password",
    enable: true,
    title: "Forgot password",
  },
  {
    id: RouteId.RESET_PASSWORD,
    path: "reset-password",
    enable: true,
    title: "Reset password",
  },
  {
    id: RouteId.SET_FIRST_PASSWORD,
    path: "set-first-password",
    enable: true,
    title: "Set first password",
  },
  {
    id: RouteId.DASHBOARD,
    path: "dashboard",
    enable: true,
    isPrincipal: true,
    title: "Dashboard",
  },
  {
    id: RouteId.NPI_ORDERS,
    path: "npi-orders",
    enable: true,
    isPrincipal: true,
    title: "NPI Orders",
  },
  {
    id: RouteId.ADMIN,
    path: "administration",
    enable: true,
    isPrincipal: true,
    title: "Admin",
    children: [
      {
        id: RouteId.ADMIN_USERS,
        path: "users",
        title: "Users",
        detailBackLink: RouteId.ADMIN,
        enable: true,
      },
    ],
  },
];
