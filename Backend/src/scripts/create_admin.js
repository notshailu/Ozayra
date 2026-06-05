import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from '../config/db.js';
import { Admin } from '../modules/taxi/admin/models/Admin.js';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const run = async () => {
  try {
    await connectDB();
    const email = 'sethvipozayra321@gmail.com';
    const passwordRaw = '123456';
    
    const password = await bcrypt.hash(passwordRaw, 10);
    
    const existing = await Admin.findOne({ email });
    if (existing) {
        existing.password = password;
        await existing.save();
        console.log('Admin already exists, updated password to 123456');
        process.exit(0);
    }
    
    const newAdmin = new Admin({
        name: 'Super Admin',
        email,
        password,
        role: 'admin',
    });
    await newAdmin.save();
    console.log(`Admin created with email ${email} and password ${passwordRaw}`);
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

run();
