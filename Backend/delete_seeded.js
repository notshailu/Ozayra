import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('c:/Users/Shailendra Rajpoot/Desktop/ozayra-project/Master/Ozayra master/backend/.env') });

const MONGODB_URI = process.env.MONGODB_URI;

const categoriesSeedSlugs = [
  'fruits-vegetables',
  'dairy-bread-eggs',
  'cold-drinks-juices',
  'snacks-munchies',
  'bakery-biscuits',
  'instant-frozen-food'
];

async function run() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  // Fetch the categories to get their IDs
  const categories = await mongoose.connection.db.collection('quick_categories').find({
    slug: { $in: categoriesSeedSlugs }
  }).toArray();

  const categoryIds = categories.map(c => c._id);
  console.log(`Found ${categoryIds.length} seeded categories to delete.`);

  if (categoryIds.length > 0) {
    // Delete products that belong to these categories
    const productsResult = await mongoose.connection.db.collection('quick_products').deleteMany({
      categoryId: { $in: categoryIds }
    });
    console.log(`Deleted ${productsResult.deletedCount} seeded products.`);

    // Delete the categories
    const categoriesResult = await mongoose.connection.db.collection('quick_categories').deleteMany({
      _id: { $in: categoryIds }
    });
    console.log(`Deleted ${categoriesResult.deletedCount} seeded categories.`);
  } else {
    // Fallback: if categories are already deleted but some products remain
    const productsResult = await mongoose.connection.db.collection('quick_products').deleteMany({});
    console.log(`Cleared all products (fallback). Deleted: ${productsResult.deletedCount}`);
  }

  // Also clear any other seeded categories if present
  console.log('Done!');
  await mongoose.disconnect();
}

run().catch(console.error);
