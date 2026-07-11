import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('c:/Users/Shailendra Rajpoot/Desktop/ozayra-project/Master/Ozayra master/backend/.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  // Clean collections
  await mongoose.connection.db.collection('quick_categories').deleteMany({});
  await mongoose.connection.db.collection('quick_products').deleteMany({});
  console.log('Cleared existing quick commerce categories and products.');

  // Create Categories
  const dairyCategory = {
    name: 'Dairy & Breakfast',
    slug: 'dairy-breakfast',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?q=80&w=200&auto=format&fit=crop',
    type: 'header',
    status: 'active',
    approvalStatus: 'approved',
    headerColor: '#0c831f',
    accentColor: '#0c831f',
    isActive: true,
    sortOrder: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const fruitsCategory = {
    name: 'Fresh Fruits',
    slug: 'fresh-fruits',
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?q=80&w=200&auto=format&fit=crop',
    type: 'header',
    status: 'active',
    approvalStatus: 'approved',
    headerColor: '#ff9f1c',
    accentColor: '#ff9f1c',
    isActive: true,
    sortOrder: 2,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const cats = await mongoose.connection.db.collection('quick_categories').insertMany([dairyCategory, fruitsCategory]);
  console.log('Inserted categories.');

  const dairyId = cats.insertedIds[0];
  const fruitsId = cats.insertedIds[1];

  const products = [
    {
      name: 'Amul Taaza Fresh Milk',
      slug: 'amul-taaza-fresh-milk',
      image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?q=80&w=600&auto=format&fit=crop',
      mainImage: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?q=80&w=600&auto=format&fit=crop',
      categoryId: dairyId,
      headerId: dairyId,
      description: 'Rich and creamy toned milk, perfect for your morning tea or coffee.',
      price: 32,
      mrp: 35,
      unit: '500 ml',
      deliveryTime: '8-12 mins',
      stock: 10,
      isActive: true,
      status: 'active',
      approvalStatus: 'approved',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Harvest Gold White Bread',
      slug: 'harvest-gold-white-bread',
      image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=600&auto=format&fit=crop',
      mainImage: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=600&auto=format&fit=crop',
      categoryId: dairyId,
      headerId: dairyId,
      description: 'Freshly baked white bread for delicious sandwiches and toast.',
      price: 45,
      mrp: 50,
      unit: '400 g',
      deliveryTime: '8-12 mins',
      stock: 15,
      isActive: true,
      status: 'active',
      approvalStatus: 'approved',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Britannia Cheese Slices',
      slug: 'britannia-cheese-slices',
      image: 'https://images.unsplash.com/photo-1528287942911-415cef49b52a?q=80&w=600&auto=format&fit=crop',
      mainImage: 'https://images.unsplash.com/photo-1528287942911-415cef49b52a?q=80&w=600&auto=format&fit=crop',
      categoryId: dairyId,
      headerId: dairyId,
      description: 'Smooth and creamy cheese slices to upgrade your burgers and sandwiches.',
      price: 125,
      mrp: 135,
      unit: '200 g',
      deliveryTime: '8-12 mins',
      stock: 8,
      isActive: true,
      status: 'active',
      approvalStatus: 'approved',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Fresh Banana Robusta',
      slug: 'fresh-banana-robusta',
      image: 'https://images.unsplash.com/photo-1571771896612-6184984fc38b?q=80&w=600&auto=format&fit=crop',
      mainImage: 'https://images.unsplash.com/photo-1571771896612-6184984fc38b?q=80&w=600&auto=format&fit=crop',
      categoryId: fruitsId,
      headerId: fruitsId,
      description: 'Sweet and nutritious robusta bananas sourced fresh daily.',
      price: 48,
      mrp: 60,
      unit: '1 kg',
      deliveryTime: '8-12 mins',
      stock: 20,
      isActive: true,
      status: 'active',
      approvalStatus: 'approved',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Fresh Gala Apples',
      slug: 'fresh-gala-apples',
      image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?q=80&w=600&auto=format&fit=crop',
      mainImage: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?q=80&w=600&auto=format&fit=crop',
      categoryId: fruitsId,
      headerId: fruitsId,
      description: 'Crisp, juicy and sweet gala apples from selected orchards.',
      price: 135,
      mrp: 160,
      unit: '4 pcs',
      deliveryTime: '8-12 mins',
      stock: 12,
      isActive: true,
      status: 'active',
      approvalStatus: 'approved',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  await mongoose.connection.db.collection('quick_products').insertMany(products);
  console.log('Inserted products successfully!');

  await mongoose.disconnect();
}

run().catch(console.error);
