/**
 * Distributor Import Script
 *
 * Usage:
 *   DRY RUN (check for conflicts):
 *     GOOGLE_APPLICATION_CREDENTIALS="$HOME/.config/firebase/..." npx ts-node src/scripts/importDistributors.ts --dry-run
 *
 *   ACTUAL IMPORT:
 *     GOOGLE_APPLICATION_CREDENTIALS="$HOME/.config/firebase/..." npx ts-node src/scripts/importDistributors.ts
 *
 * CSV Format (tab-separated or comma-separated):
 *   Distributor Name,City,State,Catalogs,Phone Number
 */

import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

admin.initializeApp({ projectId: "artis-sales-dev" });
const db = admin.firestore();

// Configuration
const CSV_FILE_PATH = path.join(__dirname, "Artis Distributors - artis_distributors_list.csv");
const ADMIN_USER_ID = "2QtciZTIucXQybtcSzXFMWFV1mp1"; // Kunal Gupta admin ID

// City to PIN code mapping (main/central PIN codes for each city)
const CITY_PINCODE_MAP: Record<string, string> = {
  // Chandigarh
  "chandigarh": "160001",
  // Chhattisgarh
  "raipur": "492001",
  // Delhi NCR
  "delhi": "110001",
  // Gujarat
  "ahemdabad": "380001",
  "ahmedabad": "380001",
  "rajkot": "360001",
  "vadodara": "390001",
  // Haryana
  "gurugram": "122001",
  "hisar": "125001",
  "kaithal": "136027",
  // Jharkhand
  "dhanbad": "826001",
  "ranchi": "834001",
  // Karnataka
  "belgaum": "590001",
  "bengluru": "560001",
  "bengaluru": "560001",
  "bangalore": "560001",
  // Kashmir
  "srinagar": "190001",
  // Madhya Pradesh
  "bhopal": "462001",
  "gwalior": "474001",
  "indore": "452001",
  "jabalpur": "482001",
  "satna": "485001",
  "singrauli": "486886",
  // Maharashtra
  "dhuliya": "424001",
  "dhule": "424001",
  "gondia": "441601",
  "kolhapur": "416001",
  "latur": "413512",
  "mumbai": "400001",
  "nagpur": "440001",
  "pune": "411001",
  "thane": "400601",
  "vasai": "401201",
  // Punjab
  "amritsar": "143001",
  "bathinda": "151001",
  "jalandhar": "144001",
  "ludhiana": "141001",
  "patiala": "147001",
  // Rajasthan
  "jaipur": "302001",
  "udaipur": "313001",
  // Telangana
  "hyderabad": "500001",
  // Uttar Pradesh
  "agra": "282001",
  "bareilly": "243001",
  "jhansi": "284001",
  "kanpur": "208001",
  "lucknow": "226001",
  "meerut": "250001",
  "rampur": "244901",
  // Uttarakhand
  "dehradun": "248001",
  "haldwani": "263139",
  "kashipur": "244713",
  "roorkee": "247667",
  // West Bengal
  "kolkata": "700001",
};

function getPincode(city: string): string {
  const normalized = city.toLowerCase().trim();
  return CITY_PINCODE_MAP[normalized] || "000000";
}

interface DistributorRow {
  name: string;
  city: string;
  state: string;
  catalogs: string;
  phone: string;
  lineNumber: number;
}

interface ConflictInfo {
  row: DistributorRow;
  existingAccount: {
    id: string;
    name: string;
    type: string;
    phone: string;
  };
}

function normalizePhone(phone: string): string | null {
  if (!phone) return null;

  // Remove all non-digits
  const digits = phone.replace(/\D/g, "");

  // Handle different formats
  if (digits.length === 10) {
    return "+91" + digits;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return "+" + digits;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return "+91" + digits.substring(1);
  }

  // Invalid format
  return null;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim()); // Push last field

  return result;
}

function parseCSV(content: string): DistributorRow[] {
  const lines = content.trim().split("\n");
  const rows: DistributorRow[] = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV with proper quote handling
    const parts = parseCSVLine(line);

    if (parts.length < 5) {
      console.warn(`Line ${i + 1}: Skipping - not enough columns (got ${parts.length})`);
      continue;
    }

    const [name, city, state, catalogs, phone] = parts;

    if (!name || !city || !state || !phone) {
      console.warn(`Line ${i + 1}: Skipping - missing required fields`);
      console.warn(`  Name: "${name}", City: "${city}", State: "${state}", Phone: "${phone}"`);
      continue;
    }

    rows.push({
      name,
      city,
      state,
      catalogs,
      phone,
      lineNumber: i + 1,
    });
  }

  return rows;
}

async function getAllExistingPhones(): Promise<Map<string, { id: string; name: string; type: string; phone: string }>> {
  const phoneMap = new Map<string, { id: string; name: string; type: string; phone: string }>();

  const accountsSnap = await db.collection("accounts").get();
  accountsSnap.docs.forEach((doc) => {
    const data = doc.data();
    if (data.phone) {
      phoneMap.set(data.phone, {
        id: doc.id,
        name: data.name,
        type: data.type,
        phone: data.phone,
      });
    }
  });

  return phoneMap;
}

async function dryRun(rows: DistributorRow[]): Promise<void> {
  console.log("\n========================================");
  console.log("           DRY RUN MODE");
  console.log("========================================\n");

  console.log(`Total rows in CSV: ${rows.length}\n`);

  // Get all existing phones
  console.log("Fetching existing accounts...");
  const existingPhones = await getAllExistingPhones();
  console.log(`Found ${existingPhones.size} existing accounts with phones\n`);

  const conflicts: ConflictInfo[] = [];
  const invalidPhones: DistributorRow[] = [];
  const validRows: DistributorRow[] = [];

  for (const row of rows) {
    const normalizedPhone = normalizePhone(row.phone);

    if (!normalizedPhone) {
      invalidPhones.push(row);
      continue;
    }

    const existing = existingPhones.get(normalizedPhone);
    if (existing) {
      conflicts.push({ row, existingAccount: existing });
    } else {
      validRows.push(row);
    }
  }

  // Report invalid phones
  if (invalidPhones.length > 0) {
    console.log("========================================");
    console.log("INVALID PHONE NUMBERS:");
    console.log("========================================");
    invalidPhones.forEach((row) => {
      console.log(`  Line ${row.lineNumber}: "${row.name}" - Phone: "${row.phone}"`);
    });
    console.log("");
  }

  // Report conflicts
  if (conflicts.length > 0) {
    console.log("========================================");
    console.log("PHONE CONFLICTS:");
    console.log("========================================");
    conflicts.forEach((c) => {
      console.log(`  Line ${c.row.lineNumber}: "${c.row.name}"`);
      console.log(`    Phone: ${normalizePhone(c.row.phone)}`);
      console.log(`    CONFLICTS WITH: "${c.existingAccount.name}" (${c.existingAccount.type})`);
      console.log(`    Existing ID: ${c.existingAccount.id}`);
      console.log("");
    });
  }

  // Check for missing pincodes
  const missingPincodes = validRows.filter((row) => getPincode(row.city) === "000000");
  if (missingPincodes.length > 0) {
    console.log("========================================");
    console.log("MISSING PINCODE MAPPINGS:");
    console.log("========================================");
    missingPincodes.forEach((row) => {
      console.log(`  Line ${row.lineNumber}: "${row.name}" - City: "${row.city}"`);
    });
    console.log("");
  }

  // Summary
  console.log("========================================");
  console.log("SUMMARY:");
  console.log("========================================");
  console.log(`  Total in CSV:     ${rows.length}`);
  console.log(`  Valid (ready):    ${validRows.length}`);
  console.log(`  Invalid phones:   ${invalidPhones.length}`);
  console.log(`  Phone conflicts:  ${conflicts.length}`);
  console.log(`  Missing pincodes: ${missingPincodes.length}`);
  console.log("");

  if (conflicts.length === 0 && invalidPhones.length === 0) {
    console.log("All distributors are ready to import!");
    console.log("Run without --dry-run to import.");
  } else {
    console.log("Please fix the issues above before importing.");
  }

  // Show sample of what will be imported
  if (validRows.length > 0) {
    console.log("\n========================================");
    console.log("SAMPLE (first 5 valid distributors):");
    console.log("========================================");
    validRows.slice(0, 5).forEach((row) => {
      console.log(`  ${row.name}`);
      console.log(`    City: ${row.city}, State: ${row.state}, Pincode: ${getPincode(row.city)}`);
      console.log(`    Phone: ${normalizePhone(row.phone)}`);
      console.log(`    Catalogs: ${row.catalogs}`);
      console.log("");
    });
  }
}

async function importDistributors(rows: DistributorRow[]): Promise<void> {
  console.log("\n========================================");
  console.log("        IMPORTING DISTRIBUTORS");
  console.log("========================================\n");

  // Get all existing phones first
  console.log("Checking for conflicts...");
  const existingPhones = await getAllExistingPhones();

  const toImport: DistributorRow[] = [];
  const skipped: { row: DistributorRow; reason: string }[] = [];

  for (const row of rows) {
    const normalizedPhone = normalizePhone(row.phone);

    if (!normalizedPhone) {
      skipped.push({ row, reason: "Invalid phone number" });
      continue;
    }

    if (existingPhones.has(normalizedPhone)) {
      skipped.push({ row, reason: `Phone conflict with ${existingPhones.get(normalizedPhone)?.name}` });
      continue;
    }

    toImport.push(row);
  }

  if (skipped.length > 0) {
    console.log(`Skipping ${skipped.length} rows due to issues:`);
    skipped.forEach((s) => {
      console.log(`  - ${s.row.name}: ${s.reason}`);
    });
    console.log("");
  }

  console.log(`Importing ${toImport.length} distributors...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const row of toImport) {
    const normalizedPhone = normalizePhone(row.phone)!;
    const docRef = db.collection("accounts").doc();

    const distributorData = {
      id: docRef.id,
      name: row.name.trim(),
      type: "distributor" as const,
      phone: normalizedPhone,
      city: row.city.trim(),
      state: row.state.trim(),
      pincode: getPincode(row.city),
      territory: row.state.trim(), // Default to state
      assignedRepUserId: "", // No rep assigned yet
      createdByUserId: ADMIN_USER_ID,
      status: "active" as const,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      extra: {
        catalogs: row.catalogs
          .split(/[,;]/)
          .map((c) => c.trim())
          .filter((c) => c),
      },
    };

    try {
      await docRef.set(distributorData);
      successCount++;
      console.log(`  Created: ${row.name} (${docRef.id})`);
    } catch (error) {
      errorCount++;
      console.error(`  FAILED: ${row.name} - ${error}`);
    }
  }

  console.log("\n========================================");
  console.log("IMPORT COMPLETE:");
  console.log("========================================");
  console.log(`  Success: ${successCount}`);
  console.log(`  Failed:  ${errorCount}`);
  console.log(`  Skipped: ${skipped.length}`);
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  // Check if CSV file exists
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`CSV file not found: ${CSV_FILE_PATH}`);
    console.error("\nPlease create the file with this format:");
    console.error("Distributor Name,City,State,Catalogs,Phone Number");
    process.exit(1);
  }

  // Read and parse CSV
  const csvContent = fs.readFileSync(CSV_FILE_PATH, "utf-8");
  const rows = parseCSV(csvContent);

  if (rows.length === 0) {
    console.error("No valid rows found in CSV");
    process.exit(1);
  }

  console.log(`Parsed ${rows.length} rows from CSV`);

  if (isDryRun) {
    await dryRun(rows);
  } else {
    // Double-check before import
    console.log("\n*** ABOUT TO IMPORT DISTRIBUTORS ***");
    console.log("This will create real accounts in Firestore.");
    console.log("Press Ctrl+C within 5 seconds to cancel...\n");
    await new Promise((resolve) => setTimeout(resolve, 5000));

    await importDistributors(rows);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
