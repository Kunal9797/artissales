/**
 * Sync Storage Documents to Firestore
 *
 * USAGE: Scans Firebase Storage /documents folder and creates Firestore metadata
 * This allows documents uploaded directly to Storage (bypassing 30MB limit) to appear in app
 *
 * Run via:
 *   firebase deploy --only functions:syncStorageDocuments
 *   curl -X POST https://us-central1-artis-sales-dev.cloudfunctions.net/syncStorageDocuments
 */

import {onRequest} from "firebase-functions/v2/https";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import * as logger from "firebase-functions/logger";
import {requireAuth, isNationalHeadOrAdmin} from "./auth";
import {Document, DocumentFileType} from "../types";

const db = getFirestore();
const bucket = getStorage().bucket();

export const syncStorageDocuments = onRequest(
  {cors: true, timeoutSeconds: 540},
  async (request, response) => {
    try {
      // SECURITY: Only National Head or Admin can sync
      const auth = await requireAuth(request);
      if (!("valid" in auth) || !auth.valid) {
        response.status(401).json(auth);
        return;
      }

      const isAuthorized = await isNationalHeadOrAdmin(auth.uid);
      if (!isAuthorized) {
        response.status(403).json({
          ok: false,
          error: "Only National Head or Admin can sync documents",
          code: "INSUFFICIENT_PERMISSIONS",
        });
        return;
      }

      logger.info("Starting Storage documents sync...");

      // List all files in /documents folder
      const [files] = await bucket.getFiles({
        prefix: "documents/",
      });

      logger.info(`Found ${files.length} files in Storage /documents folder`);

      let created = 0;
      let updated = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const file of files) {
        try {
          // Skip if it's just the folder itself
          if (file.name === "documents/" || file.name.endsWith("/")) {
            skipped++;
            continue;
          }

          // Extract filename from path (e.g., "documents/artvio/catalog.pdf" → "artvio/catalog.pdf")
          const relativePath = file.name.replace("documents/", "");
          const fileName = relativePath.split("/").pop() || relativePath;

          // Get file metadata
          const [metadata] = await file.getMetadata();
          const sizeBytes = typeof metadata.size === 'string'
            ? parseInt(metadata.size, 10)
            : (metadata.size || 0);
          const contentType = metadata.contentType || "application/octet-stream";

          // Determine file type
          let fileType: DocumentFileType = "pdf";
          if (contentType.startsWith("image/")) {
            fileType = "image";
          }

          // Generate signed URL (valid for 10 years - effectively permanent for documents)
          const expirationDate = new Date();
          expirationDate.setFullYear(expirationDate.getFullYear() + 10);
          const [url] = await file.getSignedUrl({
            action: "read",
            expires: expirationDate,
          });

          // Create document ID from file path (replace / with _)
          const documentId = relativePath.replace(/\//g, "_").replace(/\./g, "_");

          // Check if document metadata already exists in Firestore
          const docRef = db.collection("documents").doc(documentId);
          const existingDoc = await docRef.get();

          const documentData: Document = {
            id: documentId,
            name: fileName,
            description: `Synced from Storage: ${relativePath}`,
            fileUrl: url,
            fileType,
            fileSizeBytes: sizeBytes,
            uploadedBy: auth.uid,
            uploadedByName: "Storage Admin",
            uploadedAt: Timestamp.now(),
          };

          if (existingDoc.exists) {
            // Update existing document metadata
            await docRef.update({
              fileUrl: url, // Refresh signed URL
              fileSizeBytes: sizeBytes,
              uploadedAt: Timestamp.now(),
            });
            updated++;
            logger.info(`Updated: ${fileName} (${documentId})`);
          } else {
            // Create new document metadata
            await docRef.set(documentData);
            created++;
            logger.info(`Created: ${fileName} (${documentId})`);
          }
        } catch (error: any) {
          logger.error(`Error processing file ${file.name}:`, error);
          errors.push(`${file.name}: ${error.message}`);
        }
      }

      logger.info("Sync complete", {
        total: files.length,
        created,
        updated,
        skipped,
        errors: errors.length,
      });

      response.status(200).json({
        ok: true,
        message: "Storage documents synced to Firestore",
        summary: {
          totalFiles: files.length,
          created,
          updated,
          skipped,
          errorCount: errors.length,
          errors: errors.slice(0, 10), // Return first 10 errors
        },
      });
    } catch (error: any) {
      logger.error("Sync failed", {error});
      response.status(500).json({
        ok: false,
        error: "Sync failed",
        code: "SYNC_ERROR",
        details: error.message,
      });
    }
  }
);
