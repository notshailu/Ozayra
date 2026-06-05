import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from '../config/db.js';
import { FoodDeliveryPartner } from '../modules/food/delivery/models/deliveryPartner.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
  try {
    await connectDB();
    const existing = await FoodDeliveryPartner.findOne({ phone: '0900900900' });
    if (existing) {
       console.log('Delivery partner already exists');
       process.exit(0);
    }

    const partner = new FoodDeliveryPartner({
        name: 'Test Delivery Boy',
        phone: '0900900900',
        countryCode: '+91',
        status: 'approved',
        availabilityStatus: 'online'
    });

    await partner.save();
    console.log(`Delivery partner created with phone 0900900900.`);
    process.exit(0);
  } catch (error) {
    console.error('Error creating delivery partner:', error);
    process.exit(1);
  }
};

run();
