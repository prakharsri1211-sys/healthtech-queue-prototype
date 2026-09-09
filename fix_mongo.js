const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Use environment variable for MongoDB URI to avoid hardcoded credentials
const uri = process.env.MONGO_URI || "mongodb://localhost:27017/healthtech";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("Connected successfully to MongoDB server");
    const db = client.db('healthtech');
    const collection = db.collection('patients');

    // Find all patients
    const patients = await collection.find({}).toArray();
    const seen = new Set();
    let updatedCount = 0;

    for (let p of patients) {
      if (!p.aadharOrAbhaId || p.aadharOrAbhaId.trim() === '' || seen.has(p.aadharOrAbhaId)) {
        // Assign a dummy unique ID using a cryptographically secure random generator
        const dummyId = "dummy-" + crypto.randomBytes(5).toString('hex');
        console.log(`Updating patient ${p._id} (${p.name}) with dummy Aadhar: ${dummyId}`);
        await collection.updateOne(
          { _id: p._id },
          { $set: { aadharOrAbhaId: dummyId } }
        );
        updatedCount++;
      } else {
        seen.add(p.aadharOrAbhaId);
      }
    }
    
    console.log(`Finished updating. Total documents fixed: ${updatedCount}`);
    
    // Also drop the problematic index if it exists in a partial state, so Spring Boot can recreate it cleanly
    try {
        await collection.dropIndex("aadharOrAbhaId_1");
        console.log("Dropped old aadharOrAbhaId index.");
    } catch(e) {
        console.log("No existing aadharOrAbhaId index to drop, or error:", e.message);
    }
    
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
