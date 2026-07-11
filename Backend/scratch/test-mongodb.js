import mongoose from 'mongoose';

// Resolved standard mongodb:// URI using the resolved hostnames
const resolvedUri = 'mongodb://Ozayra2025:Ozayra2025@ac-zxypxil-shard-00-00.dkjt4ux.mongodb.net:27017,ac-zxypxil-shard-00-01.dkjt4ux.mongodb.net:27017,ac-zxypxil-shard-00-02.dkjt4ux.mongodb.net:27017/ozayra_taxi?ssl=true&authSource=admin&retryWrites=true&w=majority';

async function testConnection() {
  console.log(`Testing connection for resolved standard Atlas URI...`);
  try {
    const conn = await mongoose.connect(resolvedUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`✅ Success! Connected successfully to new MongoDB Atlas cluster.`);
    await mongoose.disconnect();
  } catch (err) {
    console.error(`❌ Failed:`);
    if (err.reason && err.reason.servers) {
      for (const [server, desc] of err.reason.servers.entries()) {
        console.log(`Server: ${server}`);
        console.log(`  - Type: ${desc.type}`);
        console.log(`  - Error:`, desc.error?.message || desc.error);
      }
    } else {
      console.error(err);
    }
  }
}

testConnection().then(() => process.exit(0));
