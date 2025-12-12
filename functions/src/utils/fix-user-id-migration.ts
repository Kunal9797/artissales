/**
 * Fix User ID Migration Issues
 *
 * This utility handles the case where users were created with one ID (manual)
 * but then logged in via Firebase Auth which assigned a different UID.
 *
 * The migration in useAuth.ts creates a new doc with Auth UID and sets `migratedFrom`
 * to the old ID, but existing data (expenses, visits, sheets) still references the old ID.
 *
 * This script:
 * 1. Finds all users with `migratedFrom` field (migrated users)
 * 2. Updates all their data to use the new (canonical) user ID
 * 3. Finds and removes duplicate user documents (same phone, different IDs)
 * 4. Creates a phone->userId mapping for future-proofing
 */

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {requireAuth} from "./auth";

const db = getFirestore();

interface MigrationResult {
  ok: boolean;
  migratedUsers: number;
  updatedExpenses: number;
  updatedVisits: number;
  updatedSheets: number;
  removedDuplicates: number;
  errors: string[];
}

/**
 * Migrate User Data
 * Updates all data references from old user IDs to new (canonical) IDs
 *
 * POST /migrateUserData
 * Requires admin role
 */
export const migrateUserData = onRequest(async (request, response) => {
  try {
    // 1. Verify authentication and authorization (admin only)
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const callerDoc = await db.collection("users").doc(auth.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== "admin") {
      response.status(403).json({
        ok: false,
        error: "Admin access required",
        code: "INSUFFICIENT_PERMISSIONS",
      });
      return;
    }

    const dryRun = request.body?.dryRun !== false; // Default to dry run for safety
    logger.info(`[migrateUserData] Starting migration (dryRun: ${dryRun})`);

    const result: MigrationResult = {
      ok: true,
      migratedUsers: 0,
      updatedExpenses: 0,
      updatedVisits: 0,
      updatedSheets: 0,
      removedDuplicates: 0,
      errors: [],
    };

    // 2. Find all users with migratedFrom field
    const migratedUsersSnapshot = await db.collection("users")
      .where("migratedFrom", "!=", null)
      .get();

    logger.info(`[migrateUserData] Found ${migratedUsersSnapshot.size} migrated users`);

    // Build old->new ID mapping
    const idMapping: Map<string, {newId: string; phone: string; name: string}> = new Map();

    for (const userDoc of migratedUsersSnapshot.docs) {
      const userData = userDoc.data();
      const newId = userDoc.id;
      const oldId = userData.migratedFrom;
      const phone = userData.phone;
      const name = userData.name || "Unknown";

      if (oldId && oldId !== newId) {
        idMapping.set(oldId, {newId, phone, name});
        logger.info(`[migrateUserData] Mapping: ${oldId} -> ${newId} (${name}, ${phone})`);
      }
    }

    result.migratedUsers = idMapping.size;

    if (idMapping.size === 0) {
      logger.info("[migrateUserData] No migrated users found, checking for duplicates by phone...");
    }

    // 3. Also find duplicates by phone (same phone, multiple docs)
    const allUsersSnapshot = await db.collection("users").get();
    const phoneToUsers: Map<string, Array<{id: string; data: any}>> = new Map();

    allUsersSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const phone = data.phone;
      if (phone) {
        const existing = phoneToUsers.get(phone) || [];
        existing.push({id: doc.id, data});
        phoneToUsers.set(phone, existing);
      }
    });

    // Find phones with multiple users
    const duplicatePhones: Array<{phone: string; users: Array<{id: string; data: any}>}> = [];
    phoneToUsers.forEach((users, phone) => {
      if (users.length > 1) {
        duplicatePhones.push({phone, users});
        // Add to mapping: older docs -> newest doc (by updatedAt or createdAt)
        const sorted = users.sort((a, b) => {
          const aTime = a.data.updatedAt?.toMillis() || a.data.createdAt?.toMillis() || 0;
          const bTime = b.data.updatedAt?.toMillis() || b.data.createdAt?.toMillis() || 0;
          return bTime - aTime; // Newest first
        });
        const canonical = sorted[0];
        for (let i = 1; i < sorted.length; i++) {
          if (!idMapping.has(sorted[i].id)) {
            idMapping.set(sorted[i].id, {
              newId: canonical.id,
              phone,
              name: canonical.data.name || "Unknown",
            });
            logger.info(`[migrateUserData] Duplicate mapping: ${sorted[i].id} -> ${canonical.id} (phone: ${phone})`);
          }
        }
      }
    });

    logger.info(`[migrateUserData] Found ${duplicatePhones.length} phones with duplicates`);

    // 4. Update all collections that reference userId
    const collections = [
      {name: "expenses", field: "userId"},
      {name: "visits", field: "userId"},
      {name: "sheetsSales", field: "userId"},
      {name: "attendance", field: "userId"},
      {name: "dsrReports", field: "userId"},
    ];

    for (const {name, field} of collections) {
      for (const [oldId, {newId}] of idMapping) {
        try {
          const docsSnapshot = await db.collection(name)
            .where(field, "==", oldId)
            .get();

          if (docsSnapshot.size > 0) {
            logger.info(`[migrateUserData] Found ${docsSnapshot.size} ${name} docs with old ID ${oldId}`);

            if (!dryRun) {
              const batch = db.batch();
              docsSnapshot.docs.forEach((doc) => {
                batch.update(doc.ref, {
                  [field]: newId,
                  _migratedFromUserId: oldId,
                  _migratedAt: FieldValue.serverTimestamp(),
                });
              });
              await batch.commit();
              logger.info(`[migrateUserData] Updated ${docsSnapshot.size} ${name} docs`);
            }

            switch (name) {
            case "expenses":
              result.updatedExpenses += docsSnapshot.size;
              break;
            case "visits":
              result.updatedVisits += docsSnapshot.size;
              break;
            case "sheetsSales":
              result.updatedSheets += docsSnapshot.size;
              break;
            }
          }
        } catch (err) {
          const errorMsg = `Error updating ${name} for ${oldId}: ${err}`;
          logger.error(`[migrateUserData] ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }
    }

    // 5. Also update reportsToUserId references in users collection
    for (const [oldId, {newId}] of idMapping) {
      try {
        const reportsToSnapshot = await db.collection("users")
          .where("reportsToUserId", "==", oldId)
          .get();

        if (reportsToSnapshot.size > 0) {
          logger.info(`[migrateUserData] Found ${reportsToSnapshot.size} users reporting to old ID ${oldId}`);

          if (!dryRun) {
            const batch = db.batch();
            reportsToSnapshot.docs.forEach((doc) => {
              batch.update(doc.ref, {
                reportsToUserId: newId,
                _reportsToMigratedFrom: oldId,
              });
            });
            await batch.commit();
          }
        }
      } catch (err) {
        const errorMsg = `Error updating reportsToUserId for ${oldId}: ${err}`;
        logger.error(`[migrateUserData] ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    // 6. Remove duplicate user documents (keep the canonical one)
    if (!dryRun) {
      for (const {phone, users} of duplicatePhones) {
        const sorted = users.sort((a, b) => {
          const aTime = a.data.updatedAt?.toMillis() || a.data.createdAt?.toMillis() || 0;
          const bTime = b.data.updatedAt?.toMillis() || b.data.createdAt?.toMillis() || 0;
          return bTime - aTime;
        });

        // Keep the first (newest), delete the rest
        for (let i = 1; i < sorted.length; i++) {
          try {
            await db.collection("users").doc(sorted[i].id).delete();
            result.removedDuplicates++;
            logger.info(`[migrateUserData] Deleted duplicate user doc: ${sorted[i].id} (phone: ${phone})`);
          } catch (err) {
            const errorMsg = `Error deleting duplicate ${sorted[i].id}: ${err}`;
            logger.error(`[migrateUserData] ${errorMsg}`);
            result.errors.push(errorMsg);
          }
        }
      }
    } else {
      result.removedDuplicates = duplicatePhones.reduce((sum, d) => sum + d.users.length - 1, 0);
    }

    logger.info(`[migrateUserData] Migration complete:`, result);

    response.status(200).json({
      ...result,
      dryRun,
      message: dryRun
        ? "Dry run complete. Set dryRun: false to apply changes."
        : "Migration complete.",
    });
  } catch (error) {
    logger.error("[migrateUserData] Error:", error);
    response.status(500).json({
      ok: false,
      error: "Internal server error",
      details: String(error),
    });
  }
});

/**
 * Get User ID by Phone
 * Returns the canonical user ID for a given phone number
 * Useful for debugging and data lookup
 */
export const getUserIdByPhone = onRequest(async (request, response) => {
  try {
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const {phone} = request.body;
    if (!phone) {
      response.status(400).json({ok: false, error: "Phone number required"});
      return;
    }

    // Normalize phone
    const normalizedPhone = phone.startsWith("+91") ? phone : `+91${phone.replace(/\D/g, "").slice(-10)}`;

    const usersSnapshot = await db.collection("users")
      .where("phone", "==", normalizedPhone)
      .get();

    if (usersSnapshot.empty) {
      response.status(404).json({ok: false, error: "User not found"});
      return;
    }

    const users = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
      phone: doc.data().phone,
      role: doc.data().role,
      migratedFrom: doc.data().migratedFrom || null,
      createdAt: doc.data().createdAt?.toDate()?.toISOString(),
      updatedAt: doc.data().updatedAt?.toDate()?.toISOString(),
    }));

    response.status(200).json({
      ok: true,
      phone: normalizedPhone,
      users,
      isDuplicate: users.length > 1,
    });
  } catch (error) {
    logger.error("[getUserIdByPhone] Error:", error);
    response.status(500).json({ok: false, error: "Internal server error"});
  }
});
