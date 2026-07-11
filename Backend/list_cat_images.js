import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'c:/Users/Shailendra Rajpoot/Desktop/ozayra-project/Master/Ozayra master/Backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI;

const quickCategorySchema = new mongoose.Schema({
  name: String,
  slug: String,
  parentId: mongoose.Schema.Types.ObjectId,
  type: String,
  image: String,
  isActive: Boolean,
});

const QuickCategory = mongoose.model('QuickCategory', quickCategorySchema, 'quick_categories');

async function main() {
  await mongoose.connect(MONGODB_URI);
  const categories = await QuickCategory.find().lean();
  console.log('Total Categories:', categories.length);
  categories.forEach(cat => {
    console.log(`Name: ${cat.name}, Type: ${cat.type}, Image: ${cat.image || '(empty)'}`);
  });
  await mongoose.disconnect();
}

main().catch(console.error);
