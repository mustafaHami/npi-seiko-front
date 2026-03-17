import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class ExcelUtilsService {
  columnToLetter(col: number | null | undefined): string {
    if (col == null || col < 1) return "";
    let result = "";
    let n = col;
    while (n > 0) {
      const rem = (n - 1) % 26;
      result = String.fromCharCode(65 + rem) + result;
      n = Math.floor((n - 1) / 26);
    }
    return result;
  }
}
