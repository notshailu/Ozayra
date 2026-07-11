import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'c:/Users/Shailendra Rajpoot/Desktop/ozayra-project/Master/Ozayra master/Backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  const users = await mongoose.connection.db.collection('food_users').find({ role: 'DELIVERY_PARTNER' }).toArray();
  console.log('Food users with DELIVERY_PARTNER role:', users.map(u => ({ id: u._id, name: u.name, phone: u.phone, role: u.role })));
  
  // also check all roles in food_users
  const roles = await mongoose.connection.db.collection('food_users').distinct('role');
  console.log('All roles in food_users:', roles);
  
  await mongoose.disconnect();
}

run().catch(console.error);
