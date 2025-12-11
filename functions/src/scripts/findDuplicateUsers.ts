import * as admin from "firebase-admin";

admin.initializeApp({ projectId: "artis-sales-dev" });
const db = admin.firestore();

interface UserInfo {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
}

async function findDuplicates() {
  const snapshot = await db.collection("users").get();
  
  const byPhone: Record<string, UserInfo[]> = {};
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const phone = data.phone as string;
    if (!phone) continue;
    
    if (!byPhone[phone]) byPhone[phone] = [];
    byPhone[phone].push({
      id: doc.id,
      name: data.name || "",
      role: data.role || "",
      isActive: data.isActive !== false
    });
  }
  
  const duplicates = Object.entries(byPhone).filter(([, users]) => users.length > 1);
  
  console.log("=== Duplicate Phone Numbers ===\n");
  
  if (duplicates.length === 0) {
    console.log("No duplicates found!");
  } else {
    for (const [phone, users] of duplicates) {
      console.log("Phone:", phone);
      for (const u of users) {
        console.log("  -", u.id, "|", u.name, "|", u.role, "| active:", u.isActive);
      }
      console.log("");
    }
    console.log("Total phones with duplicates:", duplicates.length);
  }
  
  console.log("\nTotal users in system:", snapshot.size);
}

findDuplicates().then(() => process.exit(0));
