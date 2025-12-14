# Sync Large Documents from Firebase Storage

**Problem**: Upload limit is 30MB via app, but you manually uploaded large files (Artvio folder) directly to Firebase Storage
**Solution**: Run `syncStorageDocuments` function to create Firestore metadata for those files

---

## ✅ Quick Steps

### 1. Function is Already Deployed ✅
URL: https://us-central1-artis-sales-dev.cloudfunctions.net/syncStorageDocuments

### 2. Run Sync (Choose One Method)

**Method A: Firebase Console** (Easiest)
1. Go to: https://console.firebase.google.com/project/artis-sales-dev/functions
2. Find `syncStorageDocuments` function
3. Click **"Testing"** tab
4. Request body: `{}`
5. Click **"Run Test"**
6. Wait 10-30 seconds

**Method B: Command Line**
```bash
# You need a Firebase ID token (get from mobile app or Firebase Console)
TOKEN="<your-token-here>"

curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}' \
  https://us-central1-artis-sales-dev.cloudfunctions.net/syncStorageDocuments
```

---

## 📊 What It Does

1. Scans `/documents/*` folder in Firebase Storage
2. For each file found:
   - Creates/updates Firestore `documents` collection entry
   - Generates 10-year signed URL for download
   - Sets metadata (name, size, type, uploaded date)
3. Files now appear in mobile app's Documents screen!

---

## ✅ Expected Output

```json
{
  "ok": true,
  "message": "Storage documents synced to Firestore",
  "summary": {
    "totalFiles": 25,
    "created": 20,
    "updated": 5,
    "skipped": 0,
    "errorCount": 0,
    "errors": []
  }
}
```

---

## 📁 What Gets Synced

**All files under `documents/` including**:
- `documents/artvio/catalog1.pdf`
- `documents/artvio/catalog2.pdf`
- `documents/catalogs/2025.pdf`
- Any PDFs or images in subdirectories

**Document IDs**: Created from path (e.g., `artvio_catalog1_pdf`)

---

## 🔄 When to Re-run

Run this function whenever you:
- Upload new files directly to Storage
- Update existing files
- Want to refresh signed URLs (they expire in 10 years)

---

## 🔒 Security

- Only **National Head** or **Admin** can run this function
- Uses existing storage rules (auth required for read)
- Generates secure signed URLs

---

## 📱 Mobile App Impact

After running sync:
1. Open app → Documents tab
2. Pull to refresh
3. All synced files will appear
4. Users can download directly from app

---

**File**: `/Users/kunal/ArtisSales/functions/src/utils/sync-storage-documents.ts`
**Function**: `syncStorageDocuments`
**Status**: ✅ Deployed and ready to run
