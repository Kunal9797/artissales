import * as admin from "firebase-admin";

admin.initializeApp({ projectId: "artis-sales-dev" });
const db = admin.firestore();

async function diagnose() {
  // 1. Find Hardik's user record
  const usersSnap = await db
    .collection("users")
    .where("phone", "==", "+918980893112")
    .get();

  if (usersSnap.empty) {
    console.log("ERROR: User not found with phone +918980893112");
    return;
  }

  const hardikDoc = usersSnap.docs[0];
  const hardikData = hardikDoc.data();
  const hardikId = hardikDoc.id;

  console.log("=== HARDIK USER DATA ===");
  console.log("ID:", hardikId);
  console.log("Name:", hardikData.name);
  console.log("Role:", hardikData.role);
  console.log("isActive:", hardikData.isActive);
  console.log("reportsToUserId:", hardikData.reportsToUserId || "NOT SET");
  console.log("migratedFrom:", hardikData.migratedFrom || "none");
  console.log("");

  // 2. Count accounts CREATED BY Hardik (current ID)
  const hardikCreatedSnap = await db
    .collection("accounts")
    .where("createdByUserId", "==", hardikId)
    .get();
  console.log("=== ACCOUNTS WITH createdByUserId = Hardik ID ===");
  console.log("Total:", hardikCreatedSnap.size);

  const hardikByType: Record<string, number> = {};
  const hardikByStatus: Record<string, number> = {};
  hardikCreatedSnap.docs.forEach((doc) => {
    const d = doc.data();
    const t = d.type || "unknown";
    const s = d.status || "unknown";
    hardikByType[t] = (hardikByType[t] || 0) + 1;
    hardikByStatus[s] = (hardikByStatus[s] || 0) + 1;
  });
  console.log("By Type:", hardikByType);
  console.log("By Status:", hardikByStatus);

  // Show most recent 10 accounts Hardik created
  interface AccountData {
    id: string;
    name?: string;
    type?: string;
    status?: string;
    createdAt?: admin.firestore.Timestamp;
  }
  const recentHardik: AccountData[] = hardikCreatedSnap.docs
    .map((d) => ({ id: d.id, ...d.data() } as AccountData))
    .sort(
      (a, b) =>
        (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
    )
    .slice(0, 10);
  console.log("");
  console.log("Most Recent 10 accounts by Hardik:");
  recentHardik.forEach((acc, i) => {
    console.log(
      i + 1 + ".",
      acc.name,
      "|",
      acc.type,
      "|",
      acc.status || "no-status",
      "| created:",
      acc.createdAt?.toDate()?.toISOString()?.slice(0, 10) || "no-date"
    );
  });

  // 3. Check if migratedFrom ID exists and has accounts
  if (hardikData.migratedFrom) {
    console.log("");
    console.log("=== ACCOUNTS WITH OLD migratedFrom ID ===");
    const oldIdAccounts = await db
      .collection("accounts")
      .where("createdByUserId", "==", hardikData.migratedFrom)
      .get();
    console.log("Old ID:", hardikData.migratedFrom);
    console.log("Count:", oldIdAccounts.size);
    if (oldIdAccounts.size > 0) {
      console.log(
        "*** ISSUE FOUND: Accounts exist with old ID that were not migrated! ***"
      );
    }
  }

  // 4. Check if any other user IDs exist for Hardik (duplicate users)
  console.log("");
  console.log("=== CHECKING FOR DUPLICATE USERS ===");
  const allHardikUsers = await db
    .collection("users")
    .where("phone", "==", "+918980893112")
    .get();
  if (allHardikUsers.size > 1) {
    console.log("*** DUPLICATE USERS FOUND! ***");
    allHardikUsers.docs.forEach((doc) => {
      const d = doc.data();
      console.log(
        "  -",
        doc.id,
        "|",
        d.name,
        "|",
        d.role,
        "| active:",
        d.isActive
      );
    });
  } else {
    console.log("No duplicate users found");
  }

  // 5. Count ALL accounts for visibility calculation
  console.log("");
  console.log("=== TOTAL ACCOUNTS IN SYSTEM ===");
  const allAccountsSnap = await db.collection("accounts").get();
  console.log("Total all accounts:", allAccountsSnap.size);

  const activeAccountsSnap = await db
    .collection("accounts")
    .where("status", "==", "active")
    .get();
  console.log("Total ACTIVE accounts:", activeAccountsSnap.size);

  const byType: Record<string, number> = {};
  activeAccountsSnap.docs.forEach((doc) => {
    const t = doc.data().type || "unknown";
    byType[t] = (byType[t] || 0) + 1;
  });
  console.log("Active by Type:", byType);

  // 6. Calculate expected visibility for Hardik
  console.log("");
  console.log("=== EXPECTED HARDIK VISIBILITY ===");

  // Get admin users
  const adminSnap = await db
    .collection("users")
    .where("role", "==", "admin")
    .get();
  const adminIds = new Set(adminSnap.docs.map((d) => d.id));
  console.log("Admin user IDs:", [...adminIds]);

  let expectedCount = 0;
  const breakdown: Record<string, number> = {};

  activeAccountsSnap.docs.forEach((doc) => {
    const acc = doc.data();
    let visible = false;
    let reason = "";

    if (acc.type === "distributor") {
      visible = true;
      reason = "distributor";
    } else if (!acc.createdByUserId || acc.createdByUserId.trim() === "") {
      visible = true;
      reason = "legacy-no-creator";
    } else if (acc.createdByUserId === hardikId) {
      visible = true;
      reason = "self-created";
    } else if (
      hardikData.migratedFrom &&
      acc.createdByUserId === hardikData.migratedFrom
    ) {
      visible = true;
      reason = "self-migratedFrom";
    } else if (
      hardikData.reportsToUserId &&
      acc.createdByUserId === hardikData.reportsToUserId
    ) {
      visible = true;
      reason = "manager-created";
    } else if (adminIds.has(acc.createdByUserId)) {
      visible = true;
      reason = "admin-created";
    }

    if (visible) {
      expectedCount++;
      breakdown[reason] = (breakdown[reason] || 0) + 1;
    }
  });

  console.log("Expected visible accounts for Hardik:", expectedCount);
  console.log("Breakdown:", breakdown);
  console.log("");
  console.log("Hardik claims to see: 70");
  console.log("Backend says he should see:", expectedCount);

  // 7. Show accounts Hardik should see by type
  console.log("");
  console.log("=== EXPECTED VISIBLE BY TYPE ===");
  const visibleByType: Record<string, number> = {};
  activeAccountsSnap.docs.forEach((doc) => {
    const acc = doc.data();
    let visible = false;

    if (acc.type === "distributor") {
      visible = true;
    } else if (!acc.createdByUserId || acc.createdByUserId.trim() === "") {
      visible = true;
    } else if (acc.createdByUserId === hardikId) {
      visible = true;
    } else if (
      hardikData.migratedFrom &&
      acc.createdByUserId === hardikData.migratedFrom
    ) {
      visible = true;
    } else if (
      hardikData.reportsToUserId &&
      acc.createdByUserId === hardikData.reportsToUserId
    ) {
      visible = true;
    } else if (adminIds.has(acc.createdByUserId)) {
      visible = true;
    }

    if (visible) {
      const t = acc.type || "unknown";
      visibleByType[t] = (visibleByType[t] || 0) + 1;
    }
  });
  console.log("distributor:", visibleByType["distributor"] || 0);
  console.log("dealer:", visibleByType["dealer"] || 0);
  console.log("architect:", visibleByType["architect"] || 0);
  console.log("OEM:", visibleByType["OEM"] || 0);
}

async function checkAdminAccounts() {
  console.log("");
  console.log("=== ADMIN USERS ===");
  const adminSnap = await db.collection("users").where("role", "==", "admin").get();
  adminSnap.docs.forEach((d) => {
    const data = d.data();
    console.log(d.id, "|", data.name, "|", data.phone);
  });

  console.log("");
  console.log("=== ACCOUNTS CREATED BY ADMINS ===");
  for (const adminDoc of adminSnap.docs) {
    const adminId = adminDoc.id;
    const accountsSnap = await db
      .collection("accounts")
      .where("createdByUserId", "==", adminId)
      .get();

    console.log("Admin ID:", adminId, "- Accounts:", accountsSnap.size);
    if (accountsSnap.size > 0) {
      accountsSnap.docs.forEach((d) => {
        const data = d.data();
        console.log("  -", d.id.slice(0, 8), "|", data.name, "|", data.type, "|", data.status);
      });
    }
  }

  // Also check for accounts with missing or empty createdByUserId
  console.log("");
  console.log("=== ACCOUNTS WITH NO/EMPTY createdByUserId ===");
  const allAccounts = await db.collection("accounts").get();
  const noCreator = allAccounts.docs.filter((d) => {
    const creator = d.data().createdByUserId;
    return !creator || creator.trim() === "";
  });
  console.log("Count:", noCreator.length);
  noCreator.slice(0, 10).forEach((d) => {
    const data = d.data();
    console.log("  -", d.id.slice(0, 8), "|", data.name, "|", data.type);
  });
}

async function checkAllCreators() {
  console.log("");
  console.log("=== ALL ACCOUNT CREATORS ===");
  const allAccounts = await db.collection("accounts").get();

  // Group by createdByUserId
  const byCreator: Record<string, number> = {};
  allAccounts.docs.forEach((d) => {
    const creator = d.data().createdByUserId || "NO_CREATOR";
    byCreator[creator] = (byCreator[creator] || 0) + 1;
  });

  // Get user info for each creator
  const creatorIds = Object.keys(byCreator).filter(id => id !== "NO_CREATOR");
  const userDocs = await Promise.all(
    creatorIds.map((id) => db.collection("users").doc(id).get())
  );

  const creatorInfo: Record<string, { name: string; role: string }> = {};
  userDocs.forEach((doc) => {
    if (doc.exists) {
      const data = doc.data()!;
      creatorInfo[doc.id] = { name: data.name, role: data.role };
    } else {
      creatorInfo[doc.id] = { name: "DELETED USER", role: "unknown" };
    }
  });

  // Sort by count descending
  const sorted = Object.entries(byCreator).sort((a, b) => b[1] - a[1]);

  console.log("Creator ID | Name | Role | Account Count");
  console.log("------------------------------------------");
  sorted.forEach(([creatorId, count]) => {
    const info = creatorInfo[creatorId] || { name: "N/A", role: "N/A" };
    console.log(creatorId.slice(0, 20), "|", info.name, "|", info.role, "|", count);
  });
}

diagnose()
  .then(() => checkAdminAccounts())
  .then(() => checkAllCreators())
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
