import { Injectable } from "@angular/core";
import { DialogService, DynamicDialogRef } from "primeng/dynamicdialog";
import {
  FileInfo,
  NpiOrder,
  User,
} from "../../../client/costSeiko";
import { Observable, race, take } from "rxjs";
import { map } from "rxjs/operators";
import { FormGroup } from "@angular/forms";
import { FileSelected } from "../../components/manage-file/manage-file.component";
import { ManagePreviewFileComponent } from "../../components/manage-preview-file/manage-preview-file.component";
import { OnlyImportFileDialogComponent } from "../../components/only-import-file-dialog/only-import-file-dialog.component";
import { NpiOrderCreateEditDialogComponent } from "../../modales/npi-orders/npi-order-create-edit-dialog/npi-order-create-edit-dialog.component";

@Injectable({
  providedIn: "root",
})
export class ModalService {
  ref: DynamicDialogRef | undefined | null;

  constructor(private dialogService: DialogService) {}

  showPreviewFileDialog(fileSelected: FileSelected, downloadFileUrl: string) {
    this.ref = this.dialogService.open(ManagePreviewFileComponent, {
      header: `Preview: ${fileSelected.fileName}`,
      draggable: false,
      modal: true,
      resizable: false,
      appendTo: "body",
      baseZIndex: 10000,
      maximizable: true,
      closable: true,
      width: "80vw",
      height: "85vh",
      data: {
        fileSelected: fileSelected,
        downloadFileUrl: downloadFileUrl,
      },
    });
    return this.waitForDialogResult<boolean>(this.ref);
  }

  showNpiOrderCreateEditModal(editMode: boolean, npiOrder?: NpiOrder) {
    this.ref = this.dialogService.open(NpiOrderCreateEditDialogComponent, {
      header: `${editMode ? "Edit" : "Create"} NPI Order`,
      draggable: false,
      modal: true,
      closable: true,
      resizable: false,
      width: "65%",
      data: {
        editMode,
        npiOrder,
      },
    });
    return this.waitForDialogResult<boolean>(this.ref);
  }

  private waitForDialogResult<T>(
    ref: DynamicDialogRef | undefined | null,
  ): Observable<T | undefined> {
    if (!ref) {
      throw new Error("Dialog ref not initialized");
    }
    const close$ = ref.onClose.pipe(
      take(1),
      map((v) => v as T | undefined),
    );

    const destroy$ = ref.onDestroy.pipe(
      take(1),
      map(() => undefined as T | undefined),
    );

    return race(close$, destroy$);
  }
}
