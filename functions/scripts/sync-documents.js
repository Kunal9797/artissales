#!/usr/bin/env node
/**
 * Sync Documents from Firebase Storage to Firestore
 *
 * This script scans the /documents folder in Firebase Storage and creates
 * Firestore metadata entries for each file, allowing them to appear in the app.
 *
 * Usage:
 *   cd functions
 *   npm run sync-docs
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK with project configuration
admin.initializeApp({
  projectId: 'artis-sales-dev',
  storageBucket: 'artis-sales-dev.firebasestorage.app'
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function syncDocuments() {
  console.log('\n🔍 Scanning Firebase Storage /documents folder...\n');

  try {
    // List all files in /documents folder
    const [files] = await bucket.getFiles({
      prefix: 'documents/',
    });

    console.log(`✅ Found ${files.length} file(s)\n`);

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const file of files) {
      try {
        // Skip if it's just the folder itself
        if (file.name === 'documents/' || file.name.endsWith('/')) {
          skipped++;
          continue;
        }

        // Extract filename from path
        const relativePath = file.name.replace('documents/', '');
        const fileName = relativePath.split('/').pop() || relativePath;

        console.log(`📄 Processing: ${fileName}`);

        // Get file metadata
        const [metadata] = await file.getMetadata();
        const sizeBytes = typeof metadata.size === 'string'
          ? parseInt(metadata.size, 10)
          : (metadata.size || 0);
        const contentType = metadata.contentType || 'application/octet-stream';

        // Determine file type
        let fileType = 'pdf';
        if (contentType.startsWith('image/')) {
          fileType = 'image';
        }

        // Make file publicly readable and get public URL
        await file.makePublic();

        // Get public URL (format: https://storage.googleapis.com/bucket-name/file-path)
        const url = `https://storage.googleapis.com/${bucket.name}/${file.name}`;

        // Create document ID from file path (replace / and . with _)
        const documentId = relativePath.replace(/\//g, '_').replace(/\./g, '_');

        // Check if document metadata already exists
        const docRef = db.collection('documents').doc(documentId);
        const existingDoc = await docRef.get();

        const documentData = {
          id: documentId,
          name: fileName,
          description: `Catalog - Synced from Storage`,
          fileUrl: url,
          fileType,
          fileSizeBytes: sizeBytes,
          uploadedBy: 'admin',
          uploadedByName: 'Storage Admin',
          uploadedAt: admin.firestore.Timestamp.now(),
        };

        if (existingDoc.exists) {
          // Update existing document metadata
          await docRef.update({
            fileUrl: url, // Refresh signed URL
            fileSizeBytes: sizeBytes,
            uploadedAt: admin.firestore.Timestamp.now(),
          });
          updated++;
          console.log(`   ✅ Updated: ${documentId}`);
        } else {
          // Create new document metadata
          await docRef.set(documentData);
          created++;
          console.log(`   ✅ Created: ${documentId}`);
        }

        console.log(`   📦 Size: ${(sizeBytes / 1024 / 1024).toFixed(2)} MB`);
        console.log('');

      } catch (error) {
        console.error(`   ❌ Error processing ${file.name}:`, error.message);
        errors.push(`${file.name}: ${error.message}`);
        console.log('');
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SYNC COMPLETE!');
    console.log('='.repeat(60));
    console.log(`Total files scanned: ${files.length}`);
    console.log(`✅ Created: ${created}`);
    console.log(`🔄 Updated: ${updated}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(err => console.log(`  - ${err}`));
    }

    console.log('\n✨ Your catalogs should now appear in the app!');
    console.log('   Pull down to refresh the Documents screen.\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ SYNC FAILED:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the sync
syncDocuments();
