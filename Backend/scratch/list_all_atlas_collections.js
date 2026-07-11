import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('c:/Users/Shailendra Rajpoot/Desktop/ozayra-project/Master/Ozayra master/backend/.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log(`Connected to database: ${db.databaseName}`);
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    if (count > 0) {
      console.log(`Collection: ${col.name} -> ${count} documents`);
    }
  }
  await mongoose.disconnect();
}

run().catch(console.error);
