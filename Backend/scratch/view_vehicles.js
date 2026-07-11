import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('c:/Users/Shailendra Rajpoot/Desktop/ozayra-project/Master/Ozayra master/backend/.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const vehicles = await db.collection('taxi_vehicles').find({}).toArray();
  console.log("=== VEHICLE TYPES SUMMARY ===");
  vehicles.forEach(v => {
    console.log(`- Name: "${v.name}", Icon: "${v.icon_types}", Capacity: ${v.capacity}, Weight: ${v.weight}, Transport: "${v.transport_type}"`);
  });
  await mongoose.disconnect();
}

run().catch(console.error);
