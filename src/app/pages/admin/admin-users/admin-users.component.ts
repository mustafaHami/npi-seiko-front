import { Component, OnInit } from "@angular/core";
import { CardModule } from "primeng/card";
import { PrimeTemplate } from "primeng/api";
import { RoutingService } from "../../../services/Routing.service";
import { RouteId } from "../../../models/enums/routes-id";
import { TableColsTitle } from "../../../models/enums/table-cols-title";
import { Icons } from "../../../models/enums/icons";
import { Button } from "primeng/button";

import { SearchInputComponent } from "../../../components/search-input/search-input.component";
import { TableLazyLoadEvent, TableModule } from "primeng/table";
import { TooltipModule } from "primeng/tooltip";
import { UserRepo } from "../../../repositories/user.repo";
import { CheckboxModule } from "primeng/checkbox";
import { FormsModule } from "@angular/forms";
import { HandleToastMessageService } from "../../../services/handle-toast-message.service";
import { ModalService } from "../../../services/components/modal.service";
import { UserTypePipe } from "../../../pipes/user/user-type.pipe";
import { UserRolePipe } from "../../../pipes/user/user-role.pipe";
import { SelectButtonModule } from "primeng/selectbutton";
import { UserActiveFilterPipe } from "../../../pipes/user/user-active-filter.pipe";
import { AuthenticationService } from "../../../security/authentication.service";
import { CustomTitleComponent } from "../../../components/custom-title/custom-title.component";
import {
  ActiveFilter,
  User,
  UsersPaginated,
  UserType,
} from "../../../../client/npiSeiko";
import { NoDoubleClickDirective } from "../../../directives/no-double-click.directive";
import { BaseListComponent } from "../../../models/classes/base-list-component";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Component({
  selector: "app-admin-users",
  imports: [
    CardModule,
    PrimeTemplate,
    Button,
    SearchInputComponent,
    TableModule,
    TooltipModule,
    CheckboxModule,
    FormsModule,
    UserTypePipe,
    UserRolePipe,
    SelectButtonModule,
    CustomTitleComponent,
    NoDoubleClickDirective,
  ],
  templateUrl: "./admin-users.component.html",
  styleUrl: "./admin-users.component.scss",
  providers: [UserActiveFilterPipe],
})
export class AdminUsersComponent extends BaseListComponent implements OnInit {
  users: User[] = [];
  activeFilterSelected: ActiveFilter = ActiveFilter.ACTIVE_ONLY;
  allActiveFilters: any[] = [];
  protected readonly TableColsTitle = TableColsTitle;
  protected readonly Icons = Icons;
  protected readonly UserType = UserType;

  constructor(
    private readonly userRepo: UserRepo,
    private readonly handleMessage: HandleToastMessageService,
    private readonly modalService: ModalService,
    private readonly authenticationService: AuthenticationService,
  ) {
    super();
    this.title = RoutingService.getRouteTitle(RouteId.ADMIN_USERS);
  }

  ngOnInit() {
    this.loading = true;
    this.allActiveFilters = [
      { label: "Active", value: ActiveFilter.ACTIVE_ONLY },
      { label: "Inactive", value: ActiveFilter.INACTIVE_ONLY },
    ];
  }

  override loadData(event: TableLazyLoadEvent): void {
    super.loadData(event);
    this.userRepo
      .searchUsers(
        event.first,
        event.rows,
        this.searchText,
        this.activeFilterSelected ?? ActiveFilter.ALL,
      )
      .subscribe((results: UsersPaginated) => {
        this.users = results.results;
        this.totalRecords = results.total;
        this.loading = false;
      });
  }

  filterChanged() {
    this.loadData(this.lastTableLazyLoadEvent);
  }

  activateUser(activeValue: boolean, user: User) {
    this.userRepo
      .manageUserActivation(user.uid, activeValue)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          if (activeValue) {
            this.handleMessage.successMessage(`User ${user.login} activated`);
          } else {
            this.handleMessage.successMessage(`User ${user.login} deactivated`);
          }
          this.loadData(this.lastTableLazyLoadEvent);
        },
        error: (error: any) => {
          user.active = false;
        },
      });
  }

  createUser() {
    this.userRepo
      .checkLicenseValidity()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((valid: boolean) => {
        if (valid) {
          this.modalService
            .showUserCreateEditModal(false)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((created?: boolean) => {
              if (created) {
                this.loadData(this.lastTableLazyLoadEvent);
              }
            });
        } else {
          this.handleMessage.errorMessage(
            "License limit (10 active users) reached.",
          );
        }
      });
  }

  editUser(user: User) {
    this.modalService
      .showUserCreateEditModal(true, user)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadData(this.lastTableLazyLoadEvent);
      });
  }

  resendValidationEmail(user: User) {
    this.userRepo
      .resendUserEmailForCreation(user.uid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.handleMessage.successMessage(
          `Validation email resent for ${user.login}`,
        );
      });
  }

  cannotDeactivateOneself(login: string): boolean {
    return this.authenticationService.getLogin() === login;
  }
}
