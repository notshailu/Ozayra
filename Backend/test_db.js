import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { QuickCategory } from './src/modules/quick-commerce/models/category.model.js';

dotenv.config();

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found in .env');
    process.exit(1);
  }
  console.log('Connecting to:', uri);
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
  
  const categories = await QuickCategory.find({}).lean();
  console.log('Total Categories:', categories.length);
  
  categories.forEach(cat => {
    console.log({
      id: cat._id,
      name: cat.name,
      slug: cat.slug,
      image: cat.image,
      isActive: cat.isActive,
      parentId: cat.parentId,
      type: cat.type
    });
  });

  await mongoose.disconnect();
}

main().catch(console.error);
