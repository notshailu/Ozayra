import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from '../config/db.js';
import { QuickProduct } from '../modules/quick-commerce/models/product.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
  try {
    await connectDB();
    const result = await QuickProduct.updateMany({}, { $set: { stock: 100 } });
    console.log(`Updated ${result.modifiedCount} products to have stock.`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating stock:', error);
    process.exit(1);
  }
};

run();
