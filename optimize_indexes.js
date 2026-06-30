// MongoDB Index Optimization Script
// Run via node: node optimize_indexes.js

const { MongoClient } = require('mongodb');

// Fallback to local URI or connection string in .env
const uri = process.env.SPRING_DATA_MONGODB_URI || "mongodb://localhost:27017/healthtech";
const client = new MongoClient(uri);

async function optimize() {
  try {
    await client.connect();
    console.log("Connected successfully to MongoDB");
    const db = client.db('healthtech');

    // 1. Indexes for 'patients' collection
    const patients = db.collection('patients');
    await patients.createIndex({ accountId: 1 }, { unique: true });
    await patients.createIndex({ aadharOrAbhaId: 1 }, { unique: true });
    console.log("Indexes created on 'patients' collection.");

    // 2. Indexes for 'appointments' collection
    const appointments = db.collection('appointments');
    await appointments.createIndex({ doctorId: 1, date: 1 });
    await appointments.createIndex({ patientId: 1 });
    console.log("Indexes created on 'appointments' collection.");

    // 3. Indexes for 'liveQueueEntries' collection
    const liveQueue = db.collection('liveQueueEntries');
    await liveQueue.createIndex({ doctorId: 1, status: 1 });
    await liveQueue.createIndex({ patientId: 1 });
    console.log("Indexes created on 'liveQueueEntries' collection.");

  } catch (error) {
    console.error("Optimization failed:", error);
  } finally {
    await client.close();
  }
}

optimize();
