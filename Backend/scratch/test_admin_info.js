import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { OwnerNeededDocument } from '../src/modules/taxi/admin/models/OwnerNeededDocument.js';

dotenv.config();

// Define a minimal Admin model since we just want to query the admin credentials
const AdminSchema = new mongoose.Schema({
  email: String,
  name: String,
  role: String,
}, { strict: false });
const Admin = mongoose.models.Admin || mongoose.model('Admin', AdminSchema, 'admins');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found in .env');
    process.exit(1);
  }
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // Query existing Owner Needed Documents
  const ownerDocs = await OwnerNeededDocument.find({}).lean();
  console.log('--- Owner Needed Documents ---');
  console.log(`Count: ${ownerDocs.length}`);
  console.log(JSON.stringify(ownerDocs, null, 2));

  // Query existing Admin Users
  const admins = await Admin.find({}).lean();
  console.log('--- Admin Users ---');
  console.log(`Count: ${admins.length}`);
  console.log(JSON.stringify(admins, null, 2));

  await mongoose.disconnect();
}

main().catch(console.error);
