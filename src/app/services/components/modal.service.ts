import { Injectable } from "@angular/core";
import { DialogService, DynamicDialogRef } from "primeng/dynamicdialog";
import { FileInfo, NpiOrder, User } from "../../../client/npiSeiko";
import { Observable, race, take } from "rxjs";
import { map } from "rxjs/operators";
import { FileSelected } from "../../components/manage-file/manage-file.component";
import { ManagePreviewFileComponent } from "../../components/manage-preview-file/manage-preview-file.component";
import { NpiOrderCreateEditDialogComponent } from "../../modales/npi-orders/npi-order-create-edit-dialog/npi-order-create-edit-dialog.component";
import { NpiOrderProcessDialogComponent } from "../../modales/npi-orders/npi-order-process-dialog/npi-order-process-dialog.component";
import { ManageFileDialogComponent } from "../../components/manage-file-dialog/manage-file-dialog.component";
import { UserCreateEditDialogComponent } from "../../modales/admin/user-create-edit-dialog/user-create-edit-dialog.component";

@Injectable({
  providedIn: "root",
})
export class ModalService {
  ref: DynamicDialogRef | undefined | null;

  constructor(private dialogService: DialogService) {}

  showUserCreateEditModal(editMode: boolean, user?: User) {
    this.ref = this.dialogService.open(UserCreateEditDialogComponent, {
      header: `${editMode ? "Edit" : "Create"} user`,
      draggable: false,
      modal: true,
      closable: true,
      resizable: false,
      width: "55%",
      data: {
        editMode: editMode,
        user: user,
      },
    });
    return this.waitForDialogResult<boolean>(this.ref);
  }

  showManageFileModal(
    defaultUrl: string,
    files?: FileInfo[],
    onlyDownloadable: boolean = false,
    showDownloadBtn: boolean = true,
    showGlobalDownloadBtn: boolean = true,
  ) {
    this.ref = this.dialogService.open(ManageFileDialogComponent, {
      header: "Manage Files",
      draggable: false,
      modal: true,
      closable: false,
      resizable: false,
      width: "70%",
      data: {
        defaultUrl: defaultUrl,
        files: files || [],
        onlyDownloadable: onlyDownloadable,
        showDownloadBtn: showDownloadBtn,
        showGlobalDownloadBtn: showGlobalDownloadBtn,
      },
    });
    return this.waitForDialogResult<FileInfo[] | undefined>(this.ref);
  }

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
      width: "75%",
      data: {
        editMode,
        npiOrder,
      },
    });
    return this.waitForDialogResult<boolean>(this.ref);
  }

  showNpiOrderProcessModal(npiOrder: NpiOrder) {
    this.ref = this.dialogService.open(NpiOrderProcessDialogComponent, {
      header: `Process${npiOrder.purchaseOrderNumber ? ` — ${npiOrder.purchaseOrderNumber}` : ""}`,
      draggable: false,
      modal: true,
      closable: true,
      resizable: false,
      width: "50rem",
      data: { npiOrder },
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
