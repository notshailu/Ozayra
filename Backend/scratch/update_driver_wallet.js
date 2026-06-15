import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('c:/Users/Shailendra Rajpoot/Desktop/ishsys-project/Master/Ishsys master/backend/.env') });

const MONGODB_URI = process.env.MONGODB_URI;

import { Driver } from '../src/modules/taxi/driver/models/Driver.js';

async function run() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  // Find driver sethvipozayra
  const driver = await Driver.findOne({ name: 'sethvipozayra' });
  if (!driver) {
    console.error('Driver sethvipozayra not found.');
    await mongoose.disconnect();
    return;
  }

  console.log('Before update:');
  console.log('Driver Name:', driver.name);
  console.log('Driver ID:', driver._id);
  console.log('Driver phone:', driver.phone);
  console.log('Driver vehicleTypeId:', driver.vehicleTypeId);
  console.log('Driver vehicleType:', driver.vehicleType);
  console.log('Driver isOnline:', driver.isOnline);
  console.log('Driver isOnRide:', driver.isOnRide);
  console.log('Driver Wallet:', JSON.stringify(driver.wallet, null, 2));

  // Update wallet and online/ride statuses
  driver.wallet = {
    balance: 1000,
    cashLimit: 500,
    isBlocked: false
  };
  driver.isOnline = true;
  driver.isOnRide = false;
  driver.vehicleType = 'car'; // Sedan maps to 'car'

  await driver.save();
  console.log('\nUpdated driver successfully!');

  const updatedDriver = await Driver.findById(driver._id);
  console.log('After update:');
  console.log('Driver isOnline:', updatedDriver.isOnline);
  console.log('Driver isOnRide:', updatedDriver.isOnRide);
  console.log('Driver vehicleType:', updatedDriver.vehicleType);
  console.log('Driver Wallet:', JSON.stringify(updatedDriver.wallet, null, 2));

  await mongoose.disconnect();
}

run().catch(console.error);
