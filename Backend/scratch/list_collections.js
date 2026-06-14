import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Shailendra Rajpoot/Desktop/ishsys-project/Master/Ishsys master/Backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  const collections = await mongoose.connection.db.listCollections().toArray();
  collections.forEach(c => console.log(c.name));
  await mongoose.disconnect();
}

run().catch(console.error);
