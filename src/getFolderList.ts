import { Markup } from "telegraf";
import { FolderType } from "./types";

export function getFolderList(foldersData: FolderType[]) {
  const buttons = foldersData.map((folder: FolderType) =>
    [Markup.button.callback(folder.folderName, `open_folder:${folder.folderId}`)]
  );

  buttons.push([Markup.button.callback('🔙 Повернутись назад', 'close_menu')]);

  return buttons;
}