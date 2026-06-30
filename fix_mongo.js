const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://prakharsri1211:HgAljHPvLIVMNTQC@cluster0.om6tryd.mongodb.net/healthtech?retryWrites=true&w=majority&appName=Cluster0";
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
        // Assign a dummy unique ID
        const dummyId = "dummy-" + Math.random().toString(36).substring(2, 12);
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
