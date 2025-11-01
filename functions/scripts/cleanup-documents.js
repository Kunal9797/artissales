#!/usr/bin/env node
/**
 * Cleanup Documents - Shows all Firestore documents and their Storage status
 * Helps identify and remove stale entries
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp({
  projectId: 'artis-sales-dev',
  storageBucket: 'artis-sales-dev.firebasestorage.app'
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function cleanupDocuments() {
  console.log('\n🔍 Analyzing Firestore documents vs Storage files...\n');

  try {
    // Get all Firestore documents
    const firestoreDocsSnapshot = await db.collection('documents').get();
    console.log(`📄 Found ${firestoreDocsSnapshot.size} document(s) in Firestore\n`);

    // Get all Storage files
    const [storageFiles] = await bucket.getFiles({ prefix: 'documents/' });
    const storageFilePaths = new Set(
      storageFiles
        .filter(f => !f.name.endsWith('/'))
        .map(f => f.name)
    );
    console.log(`📦 Found ${storageFilePaths.size} file(s) in Storage\n`);

    console.log('='.repeat(80));
    console.log('FIRESTORE DOCUMENTS STATUS:');
    console.log('='.repeat(80));

    const staleDocuments = [];

    for (const doc of firestoreDocsSnapshot.docs) {
      const data = doc.data();
      console.log(`\n📄 Document ID: ${doc.id}`);
      console.log(`   Name: ${data.name}`);
      console.log(`   Size: ${(data.fileSizeBytes / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Uploaded: ${data.uploadedAt?.toDate().toISOString() || 'Unknown'}`);
      console.log(`   URL: ${data.fileUrl}`);

      // Try to extract the storage path from the URL
      let storagePathInUrl = null;

      // Check if it's a public URL format
      if (data.fileUrl.includes('storage.googleapis.com')) {
        const urlParts = data.fileUrl.split('/');
        const bucketIndex = urlParts.findIndex(p => p.includes('artis-sales-dev'));
        if (bucketIndex >= 0) {
          storagePathInUrl = decodeURIComponent(urlParts.slice(bucketIndex + 1).join('/'));
        }
      }
      // Check if it's a signed URL format
      else if (data.fileUrl.includes('firebasestorage.googleapis.com')) {
        const match = data.fileUrl.match(/\/o\/(.+?)\?/);
        if (match) {
          storagePathInUrl = decodeURIComponent(match[1]);
        }
      }

      // Check if the storage file actually exists
      let fileExists = false;
      if (storagePathInUrl) {
        fileExists = storageFilePaths.has(storagePathInUrl);
      }

      if (fileExists) {
        console.log(`   ✅ Status: EXISTS in Storage (${storagePathInUrl})`);
      } else {
        console.log(`   ❌ Status: STALE (file not found in Storage)`);
        console.log(`   Expected path: ${storagePathInUrl || 'Could not parse from URL'}`);
        staleDocuments.push({
          id: doc.id,
          name: data.name,
          expectedPath: storagePathInUrl
        });
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY:');
    console.log('='.repeat(80));
    console.log(`Total Firestore documents: ${firestoreDocsSnapshot.size}`);
    console.log(`Valid documents (exist in Storage): ${firestoreDocsSnapshot.size - staleDocuments.length}`);
    console.log(`Stale documents (missing from Storage): ${staleDocuments.length}`);

    if (staleDocuments.length > 0) {
      console.log('\n⚠️  STALE DOCUMENTS TO DELETE:\n');
      staleDocuments.forEach((doc, index) => {
        console.log(`${index + 1}. ${doc.name} (ID: ${doc.id})`);
      });

      console.log('\n🗑️  Deleting stale documents...\n');

      for (const doc of staleDocuments) {
        try {
          await db.collection('documents').doc(doc.id).delete();
          console.log(`   ✅ Deleted: ${doc.name} (${doc.id})`);
        } catch (error) {
          console.error(`   ❌ Error deleting ${doc.id}:`, error.message);
        }
      }

      console.log('\n✨ Cleanup complete! Stale documents removed.\n');
    } else {
      console.log('\n✅ No stale documents found. Everything is in sync!\n');
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ CLEANUP FAILED:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupDocuments();
