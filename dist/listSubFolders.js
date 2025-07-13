"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preloadFolders = preloadFolders;
exports.getCachedFolders = getCachedFolders;
const googleapis_1 = require("googleapis");
let folderListCache = [];
async function preloadFolders(parentFolderId) {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new googleapis_1.google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = googleapis_1.google.drive({ version: 'v3', auth });
    const res = await drive.files.list({
        q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
    });
    folderListCache = res.data.files?.map(f => ({
        id: f.id,
        name: f.name,
    })) ?? [];
    console.log(`✅ Preloaded ${folderListCache.length} folders`);
}
function getCachedFolders() {
    return folderListCache;
}
//# sourceMappingURL=listSubFolders.js.map