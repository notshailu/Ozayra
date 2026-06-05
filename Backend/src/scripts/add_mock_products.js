import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from '../config/db.js';
import { QuickProduct } from '../modules/quick-commerce/models/product.model.js';
import { QuickCategory } from '../modules/quick-commerce/models/category.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
  try {
    await connectDB();
    const categories = await QuickCategory.find();
    if (categories.length === 0) {
      console.log('No categories found. Ensure normal seeding ran first.');
      process.exit(0);
    }
    
    const catMap = categories.reduce((acc, cat) => {
      acc[cat.slug] = cat._id;
      return acc;
    }, {});

    const newProducts = [
      {
        name: 'Oreo Chocolate Sandwich Biscuits',
        slug: 'oreo-chocolate-sandwich-biscuits-' + Date.now(),
        image: 'https://cdn.grofers.com/cdn-cgi/image/f=auto,fit=scale-down,q=70,metadata=none,w=300/app/images/products/sliding_image/160869a.jpg',
        categoryId: catMap['bakery-biscuits'] || categories[0]._id,
        price: 30,
        mrp: 35,
        unit: '120 g',
        deliveryTime: '10 mins',
        badge: 'Popular',
        rating: 4.5,
        isActive: true,
      },
      {
        name: 'Maggi 2-Minute Noodles',
        slug: 'maggi-2-minute-noodles-' + Date.now(),
        image: 'https://cdn.grofers.com/cdn-cgi/image/f=auto,fit=scale-down,q=70,metadata=none,w=300/app/images/products/sliding_image/160914a.jpg',
        categoryId: catMap['instant-frozen-food'] || categories[0]._id,
        price: 14,
        mrp: 14,
        unit: '70 g',
        deliveryTime: '10 mins',
        badge: 'Bestseller',
        rating: 4.8,
        isActive: true,
      },
      {
        name: 'Kinley Club Soda',
        slug: 'kinley-club-soda-' + Date.now(),
        image: 'https://cdn.grofers.com/cdn-cgi/image/f=auto,fit=scale-down,q=70,metadata=none,w=300/app/images/products/sliding_image/10543a.jpg',
        categoryId: catMap['cold-drinks-juices'] || categories[0]._id,
        price: 20,
        mrp: 20,
        unit: '750 ml',
        deliveryTime: '10 mins',
        badge: '',
        rating: 4.2,
        isActive: true,
      },
      {
        name: 'Nutella Hazelnut Spread',
        slug: 'nutella-hazelnut-spread-' + Date.now(),
        image: 'https://cdn.grofers.com/cdn-cgi/image/f=auto,fit=scale-down,q=70,metadata=none,w=300/app/images/products/sliding_image/15234a.jpg',
        categoryId: catMap['bakery-biscuits'] || categories[0]._id,
        price: 350,
        mrp: 390,
        unit: '350 g',
        deliveryTime: '10 mins',
        badge: 'Premium',
        rating: 4.9,
        isActive: true,
      }
    ];

    await QuickProduct.insertMany(newProducts);
    console.log('Successfully inserted new test products.');
    process.exit(0);
  } catch (error) {
    console.error('Error inserting test products:', error);
    process.exit(1);
  }
};

run();
