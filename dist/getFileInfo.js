"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileInfo = getFileInfo;
const googleapis_1 = require("googleapis");
async function getFileInfo(fileId) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new googleapis_1.google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = googleapis_1.google.drive({ version: 'v3', auth });
    const res = await drive.files.get({
        fileId,
        fields: 'id, name, size, mimeType',
        alt: 'json',
    });
    return res.data;
}
//# sourceMappingURL=getFileInfo.js.map