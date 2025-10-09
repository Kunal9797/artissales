// Import using HTTP API
const https = require('https');
const { exec } = require('child_process');

const repUserId = 'kz41QuuZT7dMEs6QmJPSlbYUvAp2';
const projectId = 'artis-sales-dev';

const accounts = [
  { name: "Royal Laminates & Hardware", type: "distributor", contactPerson: "Mr. Rajesh Sharma", phone: "+919876543210", address: "Shop No. 45, Lajpat Nagar Market", city: "Delhi", state: "Delhi", pincode: "110024", territory: "Delhi NCR" },
  { name: "Premier Ply & Boards", type: "dealer", contactPerson: "Mr. Amit Kumar", phone: "+919810234567", address: "G-12, Karol Bagh Industrial Area", city: "Delhi", state: "Delhi", pincode: "110005", territory: "Delhi NCR" },
  { name: "Mumbai Laminates Corporation", type: "distributor", contactPerson: "Mrs. Priya Patel", phone: "+919823456789", address: "Andheri Industrial Estate, Unit 23", city: "Mumbai", state: "Maharashtra", pincode: "400053", territory: "Mumbai Central" }
];

// Get Firebase CLI access token
exec('firebase login:ci --no-localhost 2>&1 | tail -1', (err, stdout) => {
  if (err || !stdout.includes('1//')) {
    // Try alternative: use current user token
    exec('cat ~/.config/configstore/firebase-tools.json', (err2, tokenData) => {
      if (err2) {
        console.error('❌ Cannot get Firebase auth token. Run: firebase login');
        process.exit(1);
      }

      try {
        const config = JSON.parse(tokenData);
        const token = config.tokens?.refresh_token;
        if (!token) throw new Error('No token found');

        importWithToken(token);
      } catch (e) {
        console.error('❌ Error parsing token:', e.message);
        process.exit(1);
      }
    });
  } else {
    importWithToken(stdout.trim());
  }
});

function importWithToken(token) {
  console.log('🌱 Importing accounts via Firestore REST API...\n');

  let completed = 0;

  accounts.forEach((acc, i) => {
    const docId = acc.name.replace(/[^a-zA-Z0-9]/g, '-');
    const now = new Date().toISOString();

    const doc = {
      fields: {
        id: { stringValue: docId },
        name: { stringValue: acc.name },
        type: { stringValue: acc.type },
        contactPerson: { stringValue: acc.contactPerson },
        phone: { stringValue: acc.phone },
        address: { stringValue: acc.address },
        city: { stringValue: acc.city },
        state: { stringValue: acc.state },
        pincode: { stringValue: acc.pincode },
        territory: { stringValue: acc.territory },
        assignedRepUserId: { stringValue: repUserId },
        status: { stringValue: 'active' },
        createdAt: { timestampValue: now },
        updatedAt: { timestampValue: now }
      }
    };

    const data = JSON.stringify(doc);
    const options = {
      hostname: 'firestore.googleapis.com',
      path: `/v1/projects/${projectId}/databases/(default)/documents/accounts?documentId=${docId}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        completed++;
        console.log(`${i + 1}. ${acc.name} - ${res.statusCode === 200 ? '✅' : '❌ ' + responseData}`);

        if (completed === accounts.length) {
          console.log(`\n✅ Finished importing ${accounts.length} accounts!`);
          process.exit(0);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Error for ${acc.name}:`, e.message);
      completed++;
    });

    req.write(data);
    req.end();
  });
}
