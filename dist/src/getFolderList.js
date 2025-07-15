"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFolderList = getFolderList;
const telegraf_1 = require("telegraf");
function getFolderList(foldersData) {
    const buttons = foldersData.map((folder) => [telegraf_1.Markup.button.callback(folder.folderName, `open_folder:${folder.folderId}`)]);
    buttons.push([telegraf_1.Markup.button.callback('🔙 Повернутись назад', 'close_menu')]);
    return buttons;
}
//# sourceMappingURL=getFolderList.js.map