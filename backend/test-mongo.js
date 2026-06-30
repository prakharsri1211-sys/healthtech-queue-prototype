const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://prakharsri1211:HgAljHPvLIVMNTQC@cluster0.om6tryd.mongodb.net/healthtech?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("SUCCESS: Successfully connected to MongoDB Atlas!");
    
    const db = client.db("healthtech");
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections:`);
    collections.forEach(c => console.log(` - ${c.name}`));
    
  } catch (error) {
    console.error("ERROR: Failed to connect to MongoDB.");
    console.error(error);
  } finally {
    await client.close();
  }
}

run();
