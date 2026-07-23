import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Seller } from '../src/modules/quick-commerce/seller/models/seller.model.js';

const run = async () => {
    try {
        await connectDB();
        
        const seller = new Seller({
            name: 'Demo Seller',
            shopName: 'Demo Shop',
            phone: '9999999999',
            email: 'seller@demo.com',
            role: 'SELLER',
            isVerified: true,
            isActive: true,
            approved: true,
            approvalStatus: 'approved'
        });
        
        await seller.save();
        console.log('Seller created successfully!');
        console.log('Phone: 9999999999');
        
        await disconnectDB();
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

run();
