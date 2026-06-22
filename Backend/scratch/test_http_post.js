import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { signAccessToken } from '../src/modules/taxi/services/tokenService.js';

dotenv.config();

// Simple schema to read admin from common_admins
const AdminSchema = new mongoose.Schema({
  email: String,
  role: String,
}, { strict: false });
const Admin = mongoose.models.TaxiAdmin || mongoose.model('TaxiAdmin', AdminSchema, 'common_admins');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found in .env');
    process.exit(1);
  }
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected');

  const admin = await Admin.findOne({ email: 'sethvipozayra321@gmail.com' });
  if (!admin) {
    console.error('Admin user not found in database');
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log('Found admin:', admin.email, 'ID:', admin._id);

  const token = signAccessToken({ sub: String(admin._id), role: 'admin' });
  console.log('Signed token:', token);

  await mongoose.disconnect();

  const payload = {
    name: 'Pan Card Test',
    image_type: 'front',
    has_expiry_date: false,
    has_identify_number: true,
    is_editable: false,
    is_required: true,
    active: true,
  };

  const url = 'http://localhost:5000/api/v1/admin/owner-management/owner-needed-document';
  console.log('Sending HTTP POST to', url);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('Response Status:', res.status);
    console.log('Response Headers:', Object.fromEntries(res.headers.entries()));
    const text = await res.text();
    console.log('Response Body:', text);
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

main().catch(console.error);
