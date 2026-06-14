import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from '../src/config/db.js';
import { QuickDeliveryCommissionRule } from '../src/modules/quick-commerce/admin/models/deliveryCommissionRule.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const run = async () => {
  try {
    await connectDB();
    const rules = await QuickDeliveryCommissionRule.find({}).lean();
    console.log('Commission Rules count:', rules.length);
    console.log('Rules:', JSON.stringify(rules, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

run();
