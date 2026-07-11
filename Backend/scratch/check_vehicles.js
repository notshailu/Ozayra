import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('C:/Users/Shailendra Rajpoot/Desktop/ozayra-project/Master/Ozayra master/Backend/.env') });

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const vehicles = await db.collection('taxi_vehicles').find().toArray();
  console.log('Vehicles:', vehicles);
  const setprices = await db.collection('taxi_setprices').find().toArray();
  console.log('Set Prices:', setprices);
  process.exit(0);
};

run();
