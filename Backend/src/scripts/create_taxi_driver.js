import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from '../config/db.js';
import { Driver } from '../modules/taxi/driver/models/Driver.js';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
  try {
    await connectDB();
    const phone = '0800800800';
    const existing = await Driver.findOne({ phone });
    if (existing) {
       console.log('Taxi driver already exists');
       process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('123456', 10);

    const partner = new Driver({
        name: 'Test Taxi Driver',
        phone,
        password: hashedPassword,
        vehicleType: 'bike',
        status: 'approved',
        approve: true,
        isOnline: true,
        location: {
            type: 'Point',
            coordinates: [77.2090, 28.6139]
        }
    });

    await partner.save();
    console.log(`Taxi driver created with phone ${phone} and password '123456'.`);
    process.exit(0);
  } catch (error) {
    console.error('Error creating taxi driver:', error);
    process.exit(1);
  }
};

run();
