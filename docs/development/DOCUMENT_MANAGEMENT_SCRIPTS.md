# Document Management Scripts

**Last Updated**: November 1, 2025
**Location**: `/functions/scripts/`
**Purpose**: Backend utilities for managing Firebase Storage documents and Firestore metadata synchronization

---

## Overview

When large catalog PDFs (>30MB) are uploaded directly to Firebase Storage via the Firebase Console (bypassing the Cloud Functions upload API), they won't automatically appear in the mobile app's Documents screen. These scripts solve that problem by synchronizing Storage files with Firestore metadata.

### The Problem

- **Mobile App** displays documents by querying the Firestore `documents` collection
- **Manual uploads** to Storage don't create Firestore metadata entries
- **Result**: Files exist in Storage but are invisible to app users

### The Solution

Two NPM scripts that maintain consistency between Storage and Firestore:

1. **`sync-docs`** - Scans Storage and creates missing Firestore metadata
2. **`cleanup-docs`** - Identifies and removes stale Firestore entries for deleted files

---

## Available Scripts

### 1. Sync Documents (`npm run sync-docs`)

**Purpose**: Create Firestore metadata for manually uploaded Storage files

**When to Use:**
- After uploading large catalog PDFs via Firebase Console
- When files exist in Storage but don't appear in the app
- After bulk file uploads to Storage

**Usage:**
```bash
cd /Users/kunal/ArtisSales/functions
npm run sync-docs
```

**What It Does:**

1. **Scans** the `/documents/` folder in Firebase Storage
2. **Finds** all PDF and image files (skips folders)
3. **Creates** Firestore metadata entries for each file:
   - Document ID (generated from filename)
   - File name, size, type
   - Public download URL
   - Upload timestamp
4. **Updates** existing entries with fresh URLs (if metadata already exists)
5. **Makes** files publicly accessible (required for app downloads)

**Example Output:**
```
🔍 Scanning Firebase Storage /documents folder...

✅ Found 2 file(s)

📄 Processing: ARTVIO_NEW_INTERACTIVE (1).pdf
   ✅ Created: ARTVIO_NEW_INTERACTIVE (1)_pdf
   📦 Size: 37.13 MB

📄 Processing: WOODRICA_INTRACTIVE-2.pdf
   ✅ Created: WOODRICA_INTRACTIVE_2_pdf
   📦 Size: 45.36 MB

============================================================
📊 SYNC COMPLETE!
============================================================
Total files scanned: 2
✅ Created: 2
🔄 Updated: 0
⏭️  Skipped: 0
❌ Errors: 0

✨ Your catalogs should now appear in the app!
   Pull down to refresh the Documents screen.
```

**File Structure Supported:**

Both flat and nested structures are supported:

```
✅ Flat structure:
/documents/
  artvio-catalog.pdf
  woodrica-catalog.pdf

✅ Nested structure:
/documents/
  artvio/
    catalog.pdf
    installation-guide.pdf
  woodrica/
    catalog.pdf
```

---

### 2. Cleanup Documents (`npm run cleanup-docs`)

**Purpose**: Remove stale Firestore entries for files that no longer exist in Storage

**When to Use:**
- After deleting files from Storage via Firebase Console
- When app shows files that can't be downloaded
- To verify sync status and detect inconsistencies
- Before/after running `sync-docs` to ensure clean state

**Usage:**
```bash
cd /Users/kunal/ArtisSales/functions
npm run cleanup-docs
```

**What It Does:**

1. **Queries** all documents in the Firestore `documents` collection
2. **Checks** if each document's Storage file actually exists
3. **Identifies** stale entries (Firestore metadata without Storage file)
4. **Automatically deletes** stale entries
5. **Provides** detailed status report

**Example Output:**
```
🔍 Analyzing Firestore documents vs Storage files...

📄 Found 4 document(s) in Firestore
📦 Found 2 file(s) in Storage

================================================================================
FIRESTORE DOCUMENTS STATUS:
================================================================================

📄 Document ID: ARTVIO_NEW_INTERACTIVE (1)_pdf
   Name: ARTVIO_NEW_INTERACTIVE (1).pdf
   Size: 37.13 MB
   Uploaded: 2025-11-01T08:00:43.817Z
   URL: https://storage.googleapis.com/.../ARTVIO_NEW_INTERACTIVE%20(1).pdf
   ✅ Status: EXISTS in Storage

📄 Document ID: Op665kY4u5rU1W4tcdv6
   Name: Woodrica Catalog (OLD)
   Size: 45.36 MB
   Uploaded: 2025-10-15T11:38:03.123Z
   URL: https://storage.googleapis.com/.../old-woodrica.pdf
   ❌ Status: STALE (file not found in Storage)

================================================================================
SUMMARY:
================================================================================
Total Firestore documents: 4
Valid documents (exist in Storage): 3
Stale documents (missing from Storage): 1

⚠️  STALE DOCUMENTS TO DELETE:

1. Woodrica Catalog (OLD) (ID: Op665kY4u5rU1W4tcdv6)

🗑️  Deleting stale documents...

   ✅ Deleted: Woodrica Catalog (OLD) (Op665kY4u5rU1W4tcdv6)

✨ Cleanup complete! Stale documents removed.
```

---

## Common Workflows

### Workflow 1: Upload New Catalog PDFs

**Scenario**: You have new Artvio and Woodrica 2025 catalogs to upload

**Steps:**
1. **Upload to Storage**:
   - Open Firebase Console → Storage
   - Navigate to `/documents/` folder
   - Upload PDF files (drag & drop or file picker)
   - Wait for upload to complete

2. **Sync to App**:
   ```bash
   cd functions
   npm run sync-docs
   ```

3. **Verify in App**:
   - Open mobile app
   - Go to Documents screen
   - Pull down to refresh
   - New catalogs should appear

### Workflow 2: Replace Outdated Catalog

**Scenario**: You need to replace the old Artvio catalog with a new version

**Steps:**
1. **Delete old file** from Storage (Firebase Console)
2. **Upload new file** to Storage
3. **Run cleanup** to remove stale metadata:
   ```bash
   npm run cleanup-docs
   ```
4. **Run sync** to create metadata for new file:
   ```bash
   npm run sync-docs
   ```
5. **Verify** in app

### Workflow 3: Audit and Fix Inconsistencies

**Scenario**: Users report missing or broken document links

**Steps:**
1. **Check current state**:
   ```bash
   npm run cleanup-docs
   ```
   - Review the output to see stale entries
   - Script will auto-delete stale entries

2. **Sync any missing files**:
   ```bash
   npm run sync-docs
   ```
   - Creates metadata for any Storage files without Firestore entries

3. **Verify in app**

---

## Troubleshooting

### Issue: "Cannot sign data without `client_email`"

**Cause**: Missing Firebase service account credentials

**Solution**:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/.config/firebase/kunalg9797_gmail_com_application_default_credentials.json"
npm run sync-docs
```

The scripts are designed to use public URLs instead of signed URLs, so this error should not occur. If it does, ensure you're using the latest version of the scripts.

---

### Issue: Files uploaded but don't appear after sync

**Troubleshooting checklist:**

1. **Verify file location**:
   - Files must be in `/documents/` folder in Storage
   - Check exact path in Firebase Console

2. **Check script output**:
   - Did sync script report "Created" for your files?
   - Any errors in the output?

3. **Verify Firestore**:
   - Open Firebase Console → Firestore
   - Check `documents` collection
   - Should have entries with matching IDs

4. **App cache**:
   - Force close and reopen the app
   - Pull to refresh on Documents screen
   - Check internet connection

5. **Run cleanup first**:
   ```bash
   npm run cleanup-docs  # Remove any stale entries
   npm run sync-docs     # Fresh sync
   ```

---

### Issue: Sync creates duplicate entries

**Cause**: Multiple manual metadata entries exist alongside auto-synced entries

**Solution**:
```bash
npm run cleanup-docs
```

The cleanup script detects duplicates by comparing file URLs and removes older entries automatically.

---

### Issue: Permission denied errors

**Cause**: Not authenticated or insufficient Firebase permissions

**Solution**:
1. Ensure you're logged in to Firebase:
   ```bash
   firebase login
   ```

2. Verify you have admin access to the `artis-sales-dev` project

3. Set credentials environment variable:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="$HOME/.config/firebase/kunalg9797_gmail_com_application_default_credentials.json"
   ```

---

## Technical Details

### Script Locations
- **Sync Script**: `/functions/scripts/sync-documents.js`
- **Cleanup Script**: `/functions/scripts/cleanup-documents.js`

### NPM Scripts (package.json)
```json
{
  "scripts": {
    "sync-docs": "node scripts/sync-documents.js",
    "cleanup-docs": "node scripts/cleanup-documents.js"
  }
}
```

### Firestore Document Schema

Documents created by the sync script follow this structure:

```typescript
{
  id: string;                    // Generated from filename (e.g., "ARTVIO_NEW_INTERACTIVE_1_pdf")
  name: string;                  // Display name (e.g., "ARTVIO_NEW_INTERACTIVE (1).pdf")
  description: string;           // "Catalog - Synced from Storage"
  fileUrl: string;               // Public download URL
  fileType: 'pdf' | 'image';     // Determined from Content-Type
  fileSizeBytes: number;         // File size in bytes
  uploadedBy: string;            // 'admin'
  uploadedByName: string;        // 'Storage Admin'
  uploadedAt: Timestamp;         // When sync script ran
}
```

### Storage File Naming

**Document IDs are generated from filenames:**
- Replace `/` with `_` (for nested paths)
- Replace `.` with `_` (to avoid Firestore issues)

**Examples:**
- `artvio-catalog.pdf` → `artvio-catalog_pdf`
- `artvio/catalog.pdf` → `artvio_catalog_pdf`
- `ARTVIO NEW (1).pdf` → `ARTVIO_NEW__1__pdf`

---

## Security Considerations

### Public URLs

The sync script makes files **publicly readable** by calling `file.makePublic()`. This is intentional because:

1. Documents are meant to be shared with all app users
2. App requires public URLs for offline downloading
3. Files are product catalogs (not sensitive data)

**If you need private documents:**
- Upload via the app's upload function (30MB limit)
- Don't use these scripts for sensitive files
- Modify scripts to use signed URLs with expiration

### Authentication

Scripts require Firebase Admin SDK credentials:
- Uses Application Default Credentials (ADC)
- Must have project admin access
- Credentials stored in `~/.config/firebase/`

---

## Alternatives to Scripts

### For Small Files (<30MB)

Use the app's built-in upload function:
- Manager Dashboard → Documents → Upload button
- Automatically creates Firestore metadata
- No need for sync scripts

### For Automated Sync

Consider adding a Cloud Function trigger:
```typescript
// Future enhancement: Auto-sync on Storage upload
export const onDocumentUploaded = onObjectFinalized(
  { bucket: 'artis-sales-dev.firebasestorage.app', region: 'us-central1' },
  async (event) => {
    // Auto-create Firestore metadata when file uploaded to /documents/
  }
);
```

This would eliminate the need for manual sync scripts.

---

## Related Documentation

- [Firebase Storage Rules](../../storage.rules)
- [Firestore Security Rules](../../firestore.rules)
- [Cloud Functions - Documents API](../../functions/src/api/documents.ts)
- [Mobile - Documents Screen](../../mobile/src/screens/DocumentsScreen.tsx)

---

## Support

**Issues or Questions?**
- Check the [main documentation index](../README.md)
- Review [Firebase usage guidelines](./FIREBASE_USAGE.md)
- Consult the [troubleshooting guide](./TROUBLESHOOTING.md)

**Last Updated**: November 1, 2025
**Maintainer**: Backend Team
