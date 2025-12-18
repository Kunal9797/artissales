import * as admin from "firebase-admin";

admin.initializeApp({ projectId: "artis-sales-dev" });
const db = admin.firestore();

interface Distributor {
  id: string;
  name: string;
  city: string;
  state: string;
}

async function matchRepsToDistributors() {
  // Get all active reps
  const repsSnap = await db
    .collection("users")
    .where("role", "==", "rep")
    .where("isActive", "==", true)
    .get();

  // Get all distributors
  const distSnap = await db
    .collection("accounts")
    .where("type", "==", "distributor")
    .get();

  // Build distributor lookup by state and city
  const distByState: Record<string, Distributor[]> = {};
  const distByCity: Record<string, Distributor[]> = {};

  distSnap.docs.forEach((doc) => {
    const d = doc.data();
    const stateKey = (d.state || "").toLowerCase().trim();
    const cityKey = (d.city || "").toLowerCase().trim();

    const distInfo: Distributor = {
      id: doc.id,
      name: d.name,
      city: d.city,
      state: d.state,
    };

    if (!distByState[stateKey]) distByState[stateKey] = [];
    distByState[stateKey].push(distInfo);

    if (!distByCity[cityKey]) distByCity[cityKey] = [];
    distByCity[cityKey].push(distInfo);
  });

  console.log("=".repeat(80));
  console.log("SALES REPS & SUGGESTED DISTRIBUTORS");
  console.log("=".repeat(80));
  console.log("");

  // For each rep, find matching distributors
  for (const repDoc of repsSnap.docs) {
    const rep = repDoc.data();
    const territory = (rep.territory || "").toLowerCase().trim();

    console.log("REP:", rep.name);
    console.log("  User ID:", repDoc.id);
    console.log("  Territory:", rep.territory || "NOT SET");
    console.log("  Phone:", rep.phone);
    console.log("");

    // Find distributors in same territory (could be state or city)
    const matchingDist: Distributor[] = [];

    // Check if territory matches any state
    if (distByState[territory]) {
      matchingDist.push(...distByState[territory]);
    }

    // Check if territory matches any city
    if (distByCity[territory]) {
      distByCity[territory].forEach((d) => {
        if (!matchingDist.find((m) => m.id === d.id)) {
          matchingDist.push(d);
        }
      });
    }

    // Also check partial matches (e.g., "delhi ncr" matches "delhi")
    Object.keys(distByState).forEach((stateKey) => {
      if (stateKey.includes(territory) || territory.includes(stateKey)) {
        distByState[stateKey].forEach((d) => {
          if (!matchingDist.find((m) => m.id === d.id)) {
            matchingDist.push(d);
          }
        });
      }
    });

    Object.keys(distByCity).forEach((cityKey) => {
      if (cityKey.includes(territory) || territory.includes(cityKey)) {
        distByCity[cityKey].forEach((d) => {
          if (!matchingDist.find((m) => m.id === d.id)) {
            matchingDist.push(d);
          }
        });
      }
    });

    if (matchingDist.length > 0) {
      console.log("  SUGGESTED DISTRIBUTORS (same area):");
      matchingDist.forEach((d, i) => {
        console.log(`    ${i + 1}. ${d.name} (${d.city}, ${d.state})`);
        console.log(`       Distributor ID: ${d.id}`);
      });
    } else {
      console.log("  SUGGESTED DISTRIBUTORS: None found matching territory");
      console.log("  (Check full list below to find appropriate distributor)");
    }

    console.log("");
    console.log("-".repeat(80));
    console.log("");
  }

  // Also print full distributor list grouped by state
  console.log("");
  console.log("=".repeat(80));
  console.log("ALL DISTRIBUTORS BY STATE (for reference)");
  console.log("=".repeat(80));

  const states = Object.keys(distByState).sort();
  for (const stateKey of states) {
    const dists = distByState[stateKey];
    console.log("");
    console.log(`${stateKey.toUpperCase()} (${dists.length} distributors):`);
    dists.forEach((d) => {
      console.log(`  - ${d.name} (${d.city})`);
      console.log(`    ID: ${d.id}`);
    });
  }
}

matchRepsToDistributors()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
