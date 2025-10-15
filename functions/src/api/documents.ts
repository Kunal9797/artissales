/**
 * Document Library API
 * Handles upload, listing, and deletion of documents (catalogs, brochures)
 */

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {getStorage} from "firebase-admin/storage";
import {requireAuth} from "../utils/auth";
import {
  Document,
  DocumentFileType,
  UploadDocumentResponse,
  GetDocumentsResponse,
  DeleteDocumentRequest,
  DeleteDocumentResponse,
  ApiError,
  User,
} from "../types";
import Busboy from "busboy";
import {tmpdir} from "os";
import {join} from "path";
import {createWriteStream, unlinkSync} from "fs";
import {randomUUID} from "crypto";

const db = getFirestore();
const bucket = getStorage().bucket();

/**
 * Helper: Check if user can manage documents (upload/delete)
 */
function canManageDocuments(role: string): boolean {
  return ["admin", "national_head", "area_manager", "zonal_head"].includes(role);
}

/**
 * Helper: Determine file type from mimetype
 */
function getFileType(mimetype: string): DocumentFileType | null {
  if (mimetype === "application/pdf") return "pdf";
  if (mimetype.startsWith("image/")) return "image";
  return null;
}

/**
 * Upload Document
 * Allows managers to upload PDFs or images to document library
 *
 * POST /uploadDocument
 * Content-Type: multipart/form-data
 * Body:
 *   - file: (binary)
 *   - name: string
 *   - description?: string
 */
export const uploadDocument = onRequest(
  {
    cors: true,
    maxInstances: 10,
    timeoutSeconds: 540, // 9 minutes for large file uploads
    memory: "1GiB", // More memory for processing large files
  },
  async (req, res) => {
    try {
      // Auth check
      const authResult = await requireAuth(req);
      if (!("valid" in authResult) || !authResult.valid) {
        res.status(401).json(authResult);
        return;
      }

      const uid = authResult.uid;

      // Fetch user to get role and name
      const userDoc = await db.collection("users").doc(uid).get();
      if (!userDoc.exists) {
        const error: ApiError = {
          ok: false,
          error: "User not found",
          code: "USER_NOT_FOUND",
        };
        res.status(404).json(error);
        return;
      }

      const user = userDoc.data() as User;

      // Permission check
      if (!canManageDocuments(user.role)) {
        const error: ApiError = {
          ok: false,
          error: "Only managers can upload documents",
          code: "PERMISSION_DENIED",
        };
        res.status(403).json(error);
        return;
      }

      // Only accept POST with multipart/form-data
      if (req.method !== "POST") {
        res.status(405).json({ok: false, error: "Method not allowed", code: "METHOD_NOT_ALLOWED"});
        return;
      }

      if (!req.headers["content-type"]?.includes("multipart/form-data")) {
        res.status(400).json({ok: false, error: "Content-Type must be multipart/form-data", code: "INVALID_CONTENT_TYPE"});
        return;
      }

      // Parse multipart form data
      const busboy = Busboy({
        headers: req.headers,
        limits: {
          fileSize: 30 * 1024 * 1024, // 30MB (Cloud Functions has 32MB request limit)
          files: 1, // Only one file allowed
        },
      });

      const fields: Record<string, string> = {};
      const files: Array<{
        filepath: string;
        mimetype: string;
        filename: string;
        size: number;
      }> = [];

      const tmpFilePaths: string[] = [];

      // Handle fields
      busboy.on("field", (fieldname: string, val: string) => {
        logger.info(`Received field: ${fieldname} = ${val.substring(0, 100)}`);
        fields[fieldname] = val;
      });

      // Handle file uploads
      busboy.on("file", (fieldname: string, file: any, info: any) => {
        const {filename, mimeType} = info;
        logger.info(`Receiving file: ${fieldname}, filename: ${filename}, mimeType: ${mimeType}`);

        const filepath = join(tmpdir(), `${randomUUID()}-${filename}`);
        tmpFilePaths.push(filepath);

        const writeStream = createWriteStream(filepath);
        file.pipe(writeStream);

        let fileSize = 0;
        file.on("data", (data: Buffer) => {
          fileSize += data.length;
        });

        file.on("end", () => {
          logger.info(`File stream ended: ${filename}, size: ${fileSize} bytes`);
        });

        writeStream.on("close", () => {
          logger.info(`Write stream closed: ${filename}`);
          files.push({
            filepath,
            mimetype: mimeType,
            filename,
            size: fileSize,
          });
        });

        writeStream.on("error", (err) => {
          logger.error(`Write stream error for ${filename}:`, err);
        });
      });

      // Wait for parsing to complete
      await new Promise<void>((resolve, reject) => {
        busboy.on("finish", () => {
          logger.info("Busboy parsing finished");
          // Give writeStreams time to close
          setTimeout(resolve, 100);
        });

        busboy.on("error", (err) => {
          logger.error("Busboy error:", err);
          reject(err);
        });

        // Important: For Cloud Functions v2, we need to handle raw body
        if (req.rawBody) {
          logger.info("Using rawBody for Busboy");
          busboy.end(req.rawBody);
        } else {
          logger.info("Piping request to Busboy");
          req.pipe(busboy);
        }
      });

      // Validate required fields
      if (!fields.name) {
        // Cleanup temp files
        tmpFilePaths.forEach((fp) => {
          try {
            unlinkSync(fp);
          } catch (e) {
            // Ignore cleanup errors
          }
        });

        res.status(400).json({ok: false, error: "Missing required field: name", code: "MISSING_FIELD"});
        return;
      }

      if (files.length === 0) {
        res.status(400).json({ok: false, error: "No file uploaded", code: "NO_FILE"});
        return;
      }

      const uploadedFile = files[0];

      // Validate file type
      const fileType = getFileType(uploadedFile.mimetype);
      if (!fileType) {
        // Cleanup
        tmpFilePaths.forEach((fp) => {
          try {
            unlinkSync(fp);
          } catch (e) {
            // Ignore
          }
        });

        res.status(400).json({ok: false, error: "Invalid file type. Only PDFs and images are allowed.", code: "INVALID_FILE_TYPE"});
        return;
      }

      // Validate file size (max 30MB - Cloud Functions has 32MB request limit)
      const maxSizeBytes = 30 * 1024 * 1024;
      if (uploadedFile.size > maxSizeBytes) {
        // Cleanup
        tmpFilePaths.forEach((fp) => {
          try {
            unlinkSync(fp);
          } catch (e) {
            // Ignore
          }
        });

        res.status(400).json({ok: false, error: "File size exceeds 30MB limit", code: "FILE_TOO_LARGE"});
        return;
      }

      // Upload to Firebase Storage
      const documentId = db.collection("documents").doc().id;
      const extension = uploadedFile.filename.split(".").pop() || "bin";
      const storagePath = `documents/${documentId}.${extension}`;

      await bucket.upload(uploadedFile.filepath, {
        destination: storagePath,
        metadata: {
          contentType: uploadedFile.mimetype,
          metadata: {
            uploadedBy: uid,
            documentId,
          },
        },
        public: true, // Make file publicly readable
      });

      // Get public download URL (no signing required)
      const url = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

      // Create Firestore document
      const document: Document = {
        id: documentId,
        name: fields.name,
        fileUrl: url,
        fileType,
        fileSizeBytes: uploadedFile.size,
        uploadedBy: uid,
        uploadedByName: user.name,
        uploadedAt: Timestamp.now(),
      };

      // Only add description if it exists
      if (fields.description) {
        document.description = fields.description;
      }

      await db.collection("documents").doc(documentId).set(document);

      // Cleanup temp files
      tmpFilePaths.forEach((fp) => {
        try {
          unlinkSync(fp);
        } catch (e) {
          logger.warn(`Failed to cleanup temp file: ${fp}`, e);
        }
      });

      logger.info(`Document uploaded: ${documentId} by ${uid}`);

      const response: UploadDocumentResponse = {
        ok: true,
        documentId,
        fileUrl: url,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error("Error in uploadDocument:", error);
      res.status(500).json({
        ok: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * Get Documents
 * Returns all documents in the library (accessible to all authenticated users)
 *
 * GET /getDocuments
 */
export const getDocuments = onRequest(
  {cors: true, maxInstances: 10},
  async (req, res) => {
    try {
      // Auth check
      const authResult = await requireAuth(req);
      if (!("valid" in authResult) || !authResult.valid) {
        res.status(401).json(authResult);
        return;
      }

      // Only accept GET
      if (req.method !== "GET") {
        res.status(405).json({ok: false, error: "Method not allowed", code: "METHOD_NOT_ALLOWED"});
        return;
      }

      // Query all documents (sorted by upload date, newest first)
      const snapshot = await db
        .collection("documents")
        .orderBy("uploadedAt", "desc")
        .get();

      const documents: Document[] = [];
      snapshot.forEach((doc) => {
        documents.push(doc.data() as Document);
      });

      logger.info(`Fetched ${documents.length} documents for user ${authResult.uid}`);

      const response: GetDocumentsResponse = {
        ok: true,
        documents,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error("Error in getDocuments:", error);
      res.status(500).json({
        ok: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * Delete Document
 * Allows managers to delete a document from the library
 *
 * POST /deleteDocument
 * Body: { documentId: string }
 */
export const deleteDocument = onRequest(
  {cors: true, maxInstances: 10},
  async (req, res) => {
    try {
      // Auth check
      const authResult = await requireAuth(req);
      if (!("valid" in authResult) || !authResult.valid) {
        res.status(401).json(authResult);
        return;
      }

      const uid = authResult.uid;

      // Fetch user to get role
      const userDoc = await db.collection("users").doc(uid).get();
      if (!userDoc.exists) {
        const error: ApiError = {
          ok: false,
          error: "User not found",
          code: "USER_NOT_FOUND",
        };
        res.status(404).json(error);
        return;
      }

      const user = userDoc.data() as User;

      // Permission check
      if (!canManageDocuments(user.role)) {
        const error: ApiError = {
          ok: false,
          error: "Only managers can delete documents",
          code: "PERMISSION_DENIED",
        };
        res.status(403).json(error);
        return;
      }

      // Only accept POST
      if (req.method !== "POST") {
        res.status(405).json({ok: false, error: "Method not allowed", code: "METHOD_NOT_ALLOWED"});
        return;
      }

      const body = req.body as DeleteDocumentRequest;

      if (!body.documentId) {
        res.status(400).json({ok: false, error: "Missing required field: documentId", code: "MISSING_FIELD"});
        return;
      }

      // Check if document exists
      const docRef = db.collection("documents").doc(body.documentId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        res.status(404).json({ok: false, error: "Document not found", code: "NOT_FOUND"});
        return;
      }

      // Delete from Storage
      // Extract filename from URL or use document ID
      const storagePath = `documents/${body.documentId}`;
      try {
        // Try to delete all possible extensions
        const extensions = ["pdf", "jpg", "jpeg", "png"];
        for (const ext of extensions) {
          try {
            await bucket.file(`${storagePath}.${ext}`).delete();
            break;
          } catch (e) {
            // Try next extension
          }
        }
      } catch (e) {
        logger.warn(`Failed to delete file from storage: ${storagePath}`, e);
      }

      // Delete from Firestore
      await docRef.delete();

      logger.info(`Document deleted: ${body.documentId} by ${uid}`);

      const response: DeleteDocumentResponse = {
        ok: true,
        message: "Document deleted successfully",
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error("Error in deleteDocument:", error);
      res.status(500).json({
        ok: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * Create Document Metadata (for manually uploaded files)
 * Helper endpoint to create Firestore metadata for files uploaded directly to Storage
 *
 * POST /createDocumentMetadata
 * Body: {
 *   fileName: string (exact filename in Storage, e.g., "WOODRICA_ INTRACTIVE-2.pdf")
 *   name: string (display name)
 *   description?: string
 *   fileType: "pdf" | "image"
 * }
 */
export const createDocumentMetadata = onRequest(
  {cors: true, maxInstances: 10},
  async (req, res) => {
    try {
      // Auth check
      const authResult = await requireAuth(req);
      if (!("valid" in authResult) || !authResult.valid) {
        res.status(401).json(authResult);
        return;
      }

      const uid = authResult.uid;

      // Fetch user to get role and name
      const userDoc = await db.collection("users").doc(uid).get();
      if (!userDoc.exists) {
        const error: ApiError = {
          ok: false,
          error: "User not found",
          code: "USER_NOT_FOUND",
        };
        res.status(404).json(error);
        return;
      }

      const user = userDoc.data() as User;

      // Permission check
      if (!canManageDocuments(user.role)) {
        const error: ApiError = {
          ok: false,
          error: "Only managers can create document metadata",
          code: "PERMISSION_DENIED",
        };
        res.status(403).json(error);
        return;
      }

      // Only accept POST
      if (req.method !== "POST") {
        res.status(405).json({ok: false, error: "Method not allowed", code: "METHOD_NOT_ALLOWED"});
        return;
      }

      const body = req.body as {
        fileName: string;
        name: string;
        description?: string;
        fileType: DocumentFileType;
      };

      // Validate required fields
      if (!body.fileName || !body.name || !body.fileType) {
        res.status(400).json({
          ok: false,
          error: "Missing required fields: fileName, name, fileType",
          code: "MISSING_FIELD",
        });
        return;
      }

      // Check if file exists in Storage
      const storagePath = `documents/${body.fileName}`;
      const file = bucket.file(storagePath);
      const [exists] = await file.exists();

      if (!exists) {
        res.status(404).json({
          ok: false,
          error: `File not found in Storage: ${storagePath}`,
          code: "FILE_NOT_FOUND",
        });
        return;
      }

      // Get file metadata
      const [metadata] = await file.getMetadata();
      const fileSizeBytes = parseInt(String(metadata.size || "0"), 10);

      // Make file public if not already
      await file.makePublic();

      // Get public URL
      const url = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

      // Create Firestore document
      const documentId = db.collection("documents").doc().id;
      const document: Document = {
        id: documentId,
        name: body.name,
        fileUrl: url,
        fileType: body.fileType,
        fileSizeBytes,
        uploadedBy: uid,
        uploadedByName: user.name,
        uploadedAt: Timestamp.now(),
      };

      // Add description if provided
      if (body.description) {
        document.description = body.description;
      }

      await db.collection("documents").doc(documentId).set(document);

      logger.info(`Document metadata created: ${documentId} for file ${body.fileName} by ${uid}`);

      const response: UploadDocumentResponse = {
        ok: true,
        documentId,
        fileUrl: url,
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error("Error in createDocumentMetadata:", error);
      res.status(500).json({
        ok: false,
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
);
