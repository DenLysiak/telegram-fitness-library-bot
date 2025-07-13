export interface FolderType {
  folderId: string;
  folderName: string;
  dataList: [];
}

export interface FileType {
  fileId: string;
  fileName: string;
  folderId?: string;
}