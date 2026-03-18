import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
} from "@angular/core";
import { FormGroup, FormsModule, ReactiveFormsModule } from "@angular/forms";
import { CardModule } from "primeng/card";
import { CheckboxModule } from "primeng/checkbox";
import { UserTypePipe } from "../../../pipes/user/user-type.pipe";
import { Icons } from "../../../models/enums/icons";
import { Button } from "primeng/button";
import { InputTextModule } from "primeng/inputtext";
import { UserFormField } from "../../../models/enums/form-field-names/user-form-field";
import { PasswordModule } from "primeng/password";
import { UserRolePipe } from "../../../pipes/user/user-role.pipe";
import { TableModule } from "primeng/table";
import { Subject, takeUntil } from "rxjs";
import { UserRepo } from "../../../repositories/user.repo";
import { User, UserRole, UserType } from "../../../../client/npiSeiko";
import { Select } from "primeng/select";
import { BaseModal } from "../../../models/classes/base-modal";
import { InputContainerComponent } from "../../../components/input-container/input-container.component";
import { RegexPatterns } from "../../../services/utils/regex-patterns";

@Component({
  selector: "app-user-create-edit-dialog",
  imports: [
    CardModule,
    CheckboxModule,
    FormsModule,
    InputTextModule,
    ReactiveFormsModule,
    PasswordModule,
    Button,
    TableModule,
    Select,
    InputContainerComponent,
  ],
  templateUrl: "./user-create-edit-dialog.component.html",
  styleUrl: "./user-create-edit-dialog.component.scss",
  providers: [UserTypePipe, UserRolePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCreateEditDialogComponent
  extends BaseModal
  implements OnInit, OnDestroy
{
  userForm!: FormGroup;
  types: any[] = [];
  roles: any[] = [];
  typeSelected?: any;
  roleSelected?: any;
  userEditedSelect?: User;
  $destroyed = new Subject<void>();
  editMode: boolean = false;
  protected readonly Icons = Icons;
  protected readonly UserFormFieldName = UserFormField;
  protected readonly UserType = UserType;
  protected readonly UserRepo = UserRepo;
  protected readonly UserRole = UserRole;
  protected readonly RegexPatterns = RegexPatterns;

  constructor(
    private readonly userTypePipe: UserTypePipe,
    private readonly userRolePipe: UserRolePipe,
    private readonly userRepo: UserRepo,
  ) {
    super();
  }

  ngOnInit() {
    this.initializeDropDownValues();

    if (this.config.data) {
      const config = this.config.data;
      this.editMode = config.editMode;
      if (this.editMode) {
        this.userEditedSelect = this.config.data.user;
        this.updatedEditableUserForm();
      }
    }
  }

  ngOnDestroy(): void {
    this.$destroyed.next();
    this.$destroyed.complete();
  }

  updatedEditableUserForm() {
    if (this.config.data.user) {
      this.typeSelected = this.types.filter(
        (type) => type.value === this.userEditedSelect!.type,
      )[0];
      const role = this.roles.filter(
        (role) => role.value === this.userEditedSelect!.role,
      )[0];
      this.updatedUserForm();
      if (this.userEditedSelect!.type === UserType.USERNAME) {
        this.userForm.patchValue({
          [UserFormField.USERNAME]: this.userEditedSelect!.login,
          [UserFormField.PASSWORD]: "",
        });
        this.userForm.get(UserFormField.USERNAME)?.disable();
      } else {
        this.userForm.patchValue({
          [UserFormField.EMAIL]: this.userEditedSelect!.login,
        });
        this.userForm.get(UserFormField.EMAIL)?.disable();
      }
      this.userForm.patchValue({
        [UserFormField.ROLE]: role,
      });
      this.roleSelected = role.value;
    }
  }

  initializeDropDownValues() {
    this.types = Object.values(UserType).map((type: UserType) => ({
      value: type,
      label: this.userTypePipe.transform(type),
    }));
    this.roles = Object.values(UserRole)
      .filter((role: UserRole) => role !== UserRole.SUPER_ADMINISTRATOR)
      .map((role: UserRole) => ({
        value: role,
        label: this.userRolePipe.transform(role),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  changedType() {
    this.updatedUserForm();
  }

  changedRole() {
    this.roleSelected = this.userForm.get(UserFormField.ROLE)?.value.value;
  }

  editPassword() {
    const password = this.userForm.get(UserFormField.PASSWORD)?.value;
    this.userRepo
      .updateUserPassword(this.userEditedSelect!.uid, password)
      .pipe(takeUntil(this.$destroyed))
      .subscribe((result: User) => {
        this.handleMessage.successMessage(
          `Password updated for ${result.login}`,
        );
      });
  }

  createEditUser() {
    const role = this.userForm.get(UserFormField.ROLE)?.value.value;
    if (this.editMode) {
      this.editUser(role);
    } else {
      this.createUser(role);
    }
  }

  createUser(role: UserRole) {
    if (this.typeSelected.value === UserType.USERNAME) {
      const username = this.userForm.get(UserFormField.USERNAME)?.value;
      const password = this.userForm.get(UserFormField.PASSWORD)?.value;
      this.userRepo
        .createUserWithUsername(username, password, role)
        .pipe(takeUntil(this.$destroyed))
        .subscribe({
          next: () => {
            this.handleMessage.successMessage("User created");
            this.closeDialog(true);
          },
        });
    } else {
      const email = this.userForm.get(UserFormField.EMAIL)?.value;
      this.userRepo
        .createUserWithEmail(email, role)
        .pipe(takeUntil(this.$destroyed))
        .subscribe({
          next: (response: any) => {
            this.handleMessage.successMessage(
              "User created and a registration email has been sent",
            );
            this.closeDialog(true);
          },
        });
    }
  }

  editUser(role: UserRole) {
    let apiUpdateUser: any;
    if (this.typeSelected.value === UserType.USERNAME) {
      apiUpdateUser = this.userRepo.updateUserWithUsername(
        this.userEditedSelect!.uid,
        role,
      );
    } else {
      apiUpdateUser = this.userRepo.updateUserWithEmail(
        this.userEditedSelect!.uid,
        role,
      );
    }
    apiUpdateUser.pipe(takeUntil(this.$destroyed)).subscribe({
      next: () => {
        this.handleMessage.successMessage(
          `User ${this.userEditedSelect?.login} updated`,
        );
        this.closeDialog(true);
      },
    });
  }

  updatedUserForm() {
    this.userForm = this.formService.buildUserForm(
      this.typeSelected.value!,
      this.userForm,
    );
  }
}
