import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from '../src/config/db.js';
import { FoodDeliveryPartner } from '../src/modules/food/delivery/models/deliveryPartner.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const run = async () => {
  try {
    await connectDB();
    
    // Check if rider already exists
    const phone = '8090512291';
    let partner = await FoodDeliveryPartner.findOne({ phone });
    
    if (partner) {
      console.log(`Rider with phone ${phone} already exists! Updating status to approved...`);
      partner.status = 'approved';
      partner.availabilityStatus = 'online';
      await partner.save();
    } else {
      partner = new FoodDeliveryPartner({
        name: 'Quick Rider',
        phone: phone,
        countryCode: '+91',
        status: 'approved',
        availabilityStatus: 'online'
      });
      await partner.save();
      console.log(`Rider created successfully with phone ${phone}!`);
    }

    console.log(JSON.stringify(partner, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error creating rider:', error);
    process.exit(1);
  }
};

run();
