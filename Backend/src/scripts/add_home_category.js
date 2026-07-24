import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { QuickCategory } from '../modules/quick-commerce/models/category.model.js';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const existing = await QuickCategory.findOne({ slug: 'home' });
    if (!existing) {
      await QuickCategory.create({
        name: 'Home & Living',
        slug: 'home',
        type: 'header',
        iconId: 'home',
        status: 'active',
        headerColor: '#1e293b'
      });
      console.log('Home category created.');
    } else {
      console.log('Home category already exists.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};

run();
