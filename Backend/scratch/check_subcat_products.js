import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { QuickCategory } from '../src/modules/quick-commerce/models/category.model.js';
import { QuickProduct } from '../src/modules/quick-commerce/models/product.model.js';
import { SellerProduct } from '../src/modules/quick-commerce/seller/models/sellerProduct.model.js';

dotenv.config();

async function checkSubcategoryProducts() {
  const uri = process.env.MONGODB_URI;
  try {
    await mongoose.connect(uri);
    console.log('--- ALL SUBCATEGORIES ---');
    const subcats = await QuickCategory.find({ type: 'subcategory' }).lean();
    for (const sub of subcats) {
      const parent = await QuickCategory.findById(sub.parentId).lean();
      const header = parent?.parentId ? await QuickCategory.findById(parent.parentId).lean() : null;
      console.log(`Subcategory: "${sub.name}" (ID: ${sub._id}) | Parent L2: "${parent?.name || 'Unknown'}" | Header: "${header?.name || 'Unknown'}"`);
    }

    console.log('\n--- QUICK PRODUCTS WITH SUBCATEGORY ---');
    const quickProducts = await QuickProduct.find({ subcategoryId: { $ne: null } })
      .populate('headerId categoryId subcategoryId', 'name')
      .lean();
    console.log(`Found ${quickProducts.length} QuickProducts with subcategoryId:`);
    quickProducts.forEach(p => {
      console.log(`- Product: "${p.name}" | Header: "${p.headerId?.name || '-'}" | Category/L2: "${p.categoryId?.name || '-'}" | Subcategory: "${p.subcategoryId?.name || '-'}" (${p.subcategoryId?._id || p.subcategoryId}) | Active: ${p.isActive}`);
    });

    console.log('\n--- SELLER PRODUCTS WITH SUBCATEGORY ---');
    const sellerProducts = await SellerProduct.find({ subcategoryId: { $ne: null } })
      .populate('headerId categoryId subcategoryId', 'name')
      .lean();
    console.log(`Found ${sellerProducts.length} SellerProducts with subcategoryId:`);
    sellerProducts.forEach(p => {
      console.log(`- Seller Product: "${p.name}" | Header: "${p.headerId?.name || '-'}" | Category/L2: "${p.categoryId?.name || '-'}" | Subcategory: "${p.subcategoryId?.name || '-'}" (${p.subcategoryId?._id || p.subcategoryId}) | Active: ${p.isActive}`);
    });

    console.log('\n--- ALL QUICK PRODUCTS (Summary) ---');
    const allQP = await QuickProduct.find({}).populate('headerId categoryId subcategoryId', 'name').lean();
    allQP.forEach(p => {
      console.log(`- [QP] "${p.name}" -> Header: ${p.headerId?.name || 'None'} | L2: ${p.categoryId?.name || 'None'} | Subcat: ${p.subcategoryId?.name || 'None'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkSubcategoryProducts();
