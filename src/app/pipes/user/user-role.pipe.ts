import { Pipe, PipeTransform } from "@angular/core";
import { UserRole } from "../../../client/npiSeiko";

@Pipe({
  name: "userRole",
})
export class UserRolePipe implements PipeTransform {
  transform(value: UserRole): string {
    switch (value) {
      case UserRole.ADMINISTRATOR:
        return "Administrator";
      case UserRole.SUPER_ADMINISTRATOR:
        return "Super Admin";
      default:
        return "Unknown";
    }
  }
}
