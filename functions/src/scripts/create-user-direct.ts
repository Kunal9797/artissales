import {initializeApp} from "firebase-admin/app";
import {getFirestore, Timestamp} from "firebase-admin/firestore";

initializeApp({
  projectId: "artis-sales-dev",
});

const db = getFirestore();

async function createUser() {
  const userId = "kz41QuuZT7dMEs6QmJPSlbYUvAp2";

  try {
    // Check if user exists first
    const doc = await db.collection("users").doc(userId).get();
    console.log("Document exists:", doc.exists);

    if (doc.exists) {
      console.log("Document data:", doc.data());
      console.log("✅ User already exists - no need to create");
    } else {
      // Create the user
      await db.collection("users").doc(userId).set({
        id: userId,
        phone: "+919991239999",
        name: "",
        email: "",
        role: "rep",
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      console.log("✅ User document created successfully!");
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }

  process.exit(0);
}

createUser();
