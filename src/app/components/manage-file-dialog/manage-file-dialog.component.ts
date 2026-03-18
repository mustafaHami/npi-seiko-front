import { Component, OnInit, signal, WritableSignal } from "@angular/core";
import {
  FileSelected,
  ManageFileComponent,
} from "../../../components/manage-file/manage-file.component";
import { BaseModal } from "../../../models/classes/base-modal";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FileManageRepo } from "../../../repositories/file-manage-repo";
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionPanel,
} from "primeng/accordion";
import { Icons } from "../../../models/enums/icons";
import { Button } from "primeng/button";
import { FileInfo, FileType } from "../../../../client/costSeiko";
import { BadgeDirective } from "primeng/badge";

@Component({
  selector: "app-request-manage-file-dialog",
  imports: [
    ManageFileComponent,
    Accordion,
    AccordionPanel,
    AccordionHeader,
    AccordionContent,
    Button,
    BadgeDirective,
  ],
  templateUrl: "./manage-file-dialog.component.html",
  styleUrl: "./manage-file-dialog.component.scss",
})
export class ManageFileDialogComponent extends BaseModal implements OnInit {
  defaultUrl: string = ``;
  drawingsFilesPresents = signal<FileSelected[]>([]);
  onlyDownloadable!: boolean;
  showDownloadBtn!: boolean;
  showGlobalDownloadBtn!: boolean;
  protected readonly Icons = Icons;
  protected readonly FileType = FileType;

  constructor(private readonly fileManageRepo: FileManageRepo) {
    super();
  }

  ngOnInit() {
    this.defaultUrl = this.dataConfig.defaultUrl;
    this.onlyDownloadable = this.dataConfig.onlyDownloadable;
    this.showDownloadBtn = this.dataConfig.showDownloadBtn;
    this.showGlobalDownloadBtn = this.dataConfig.showGlobalDownloadBtn;
    this.initFiles();
  }

  handleClose() {
    const files: FileInfo[] = (this.drawingsFilesPresents() ?? []).map(
      (file) =>
        ({
          uid: file.uid,
          fileName: file.fileName,
          type: FileType.ANY,
        }) as FileInfo,
    );
    this.closeDialog(files);
  }

  initFiles() {
    const files: FileInfo[] = this.dataConfig.files;
    if (files && files.length > 0) {
      const drawings: FileSelected[] =
        files
          .filter((file) => file.type === FileType.ANY)
          ?.map((file) => ({
            ...file,
            selected: false,
          })) || [];
      this.drawingsFilesPresents.set(drawings);
    }
  }

  uploadRequestFilesReceiver(
    filesUploaded: FileInfo[],
    objectSignal: WritableSignal<FileSelected[]>,
    fileType: FileType,
  ) {
    const presentDrawings = this.drawingsFilesPresents() ?? [];
    const newDrawings: FileSelected[] = presentDrawings.map((pFile) => ({
      ...pFile,
      selected: false,
    }));
    const filesToAdd = (Object.values(filesUploaded) ?? [])
      .filter(
        (fileInfo) =>
          fileInfo.type === fileType &&
          !presentDrawings.some((file) => file.fileName === fileInfo.fileName),
      )
      .map((fileInfo) => ({
        ...fileInfo,
        selected: false,
      }));
    newDrawings.push(...filesToAdd);
    objectSignal.set(newDrawings);
  }

  downloadDrawingsReceiver(filesUids: string[]) {
    const url = `${this.defaultUrl}/download`;
    this.fileManageRepo.downloadFile(url, filesUids);
  }

  deletionDrawingsReceiver(filesUids: string[]) {
    const urlDrawings = `${this.defaultUrl}/delete`;
    this.deletionFiles(
      urlDrawings,
      filesUids,
      this.drawingsFilesPresents,
      FileType.ANY,
    );
  }

  private deletionFiles(
    url: string,
    filesUids: string[],
    objectSignal: WritableSignal<FileSelected[]>,
    fileType: FileType,
  ) {
    this.fileManageRepo
      .deleteFile(url, filesUids)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          objectSignal.update((fileSelected) =>
            fileSelected.filter((file) => !filesUids.includes(file.uid)),
          );
          this.handleMessage.successMessage("File(s) deleted");
        },
      });
  }
}
