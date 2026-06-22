import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createOwnerNeededDocument } from '../src/modules/taxi/admin/services/adminService.js';

dotenv.config();

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found in .env');
    process.exit(1);
  }
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected');

  try {
    const payload = {
      name: 'Pan',
      image_type: 'front',
      has_expiry_date: false,
      has_identify_number: true,
      is_editable: false,
      is_required: true,
      active: true,
    };
    
    console.log('Creating Owner Needed Document with payload:', payload);
    const result = await createOwnerNeededDocument(payload);
    console.log('Success! Result:', result);
  } catch (error) {
    console.error('Error creating document:', error);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(console.error);
