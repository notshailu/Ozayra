import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Define schema for Driver
const DriverSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  documents: mongoose.Schema.Types.Mixed,
}, { strict: false });
const Driver = mongoose.models.TaxiDriver || mongoose.model('TaxiDriver', DriverSchema, 'taxi_drivers');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found in .env');
    process.exit(1);
  }
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected');

  const id = '6a32e64c75392e5e1d03c245';
  const driver = await Driver.findById(id).lean();
  if (!driver) {
    console.error('Driver not found');
  } else {
    console.log('Full Driver:', JSON.stringify(driver, null, 2));
  }

  await mongoose.disconnect();
}

main().catch(console.error);
