// MongoDB Remote Database Synchronization Script
// Updates legacy "Dr. Rajesh Kumar" placeholders in MongoDB collections.

// 1. Connect to the healthtech database
db = db.getSiblingDB("healthtech");

// 2. Update clinic metadata to Vikram Malhotra
db.clinicMetadata.updateMany(
  { doctorName: "Dr. Rajesh Kumar" },
  { $set: { doctorName: "Dr. Vikram Malhotra" } }
);

// 3. Update live queue entries
db.liveQueueEntry.updateMany(
  { doctorName: "Dr. Rajesh Kumar" },
  { $set: { doctorName: "Dr. Vikram Malhotra" } }
);

// 4. Update appointments
db.appointment.updateMany(
  { doctorName: "Dr. Rajesh Kumar" },
  { $set: { doctorName: "Dr. Vikram Malhotra" } }
);

print("MongoDB Remote synchronization complete.");
