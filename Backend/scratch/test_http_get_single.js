import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { signAccessToken } from '../src/modules/taxi/services/tokenService.js';
import { OwnerNeededDocument } from '../src/modules/taxi/admin/models/OwnerNeededDocument.js';

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

  const token = signAccessToken({ sub: String(admin._id), role: 'admin' });
  
  // Find a document requirement
  const doc = await OwnerNeededDocument.findOne({});
  if (!doc) {
    console.log('No OwnerNeededDocument found in DB. Run test_http_post.js first.');
    await mongoose.disconnect();
    process.exit(1);
  }
  const id = doc._id.toString();
  console.log('Found doc ID:', id);

  await mongoose.disconnect();

  const url = `http://localhost:5000/api/v1/admin/owner-management/owner-needed-document/${id}`;
  console.log('Sending HTTP GET to', url);

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('Response Status:', res.status);
    const text = await res.text();
    console.log('Response Body:', text);
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

main().catch(console.error);
