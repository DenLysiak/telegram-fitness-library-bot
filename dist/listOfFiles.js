"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listFilesInFolder = listFilesInFolder;
const googleapis_1 = require("googleapis");
async function listFilesInFolder(folderId) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new googleapis_1.google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = googleapis_1.google.drive({ version: 'v3', auth });
    const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
        fields: 'files(id, name, mimeType)',
    });
    return res.data.files || [];
}
//# sourceMappingURL=listOfFiles.js.map