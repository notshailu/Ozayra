import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('c:/Users/Shailendra Rajpoot/Desktop/ozayra-project/Master/Ozayra master/backend/.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const vehicleTypes = await db.collection('taxi_vehicle_types').find({}).toArray();
  console.log("=== VEHICLE TYPES ===");
  console.dir(vehicleTypes, { depth: null });
  await mongoose.disconnect();
}

run().catch(console.error);
