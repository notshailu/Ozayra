import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'c:/Users/Shailendra Rajpoot/Desktop/ishsys-project/Master/Ishsys master/Backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  const partners = await mongoose.connection.db.collection('food_delivery_partners').find({}).toArray();
  console.log('Riders found:', partners.map(p => ({ id: p._id, name: p.name, phone: p.phone, status: p.status })));
  await mongoose.disconnect();
}

run().catch(console.error);
