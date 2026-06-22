import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('No MONGODB_URI found in .env');
    process.exit(1);
  }
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected. Current database:', mongoose.connection.name);

  // Get all collection names
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('Collections in database:');
  for (const col of collections) {
    const count = await mongoose.connection.db.collection(col.name).countDocuments();
    console.log(`- ${col.name} (${count} documents)`);
  }

  // Look for any owner document requirements
  const ownerDocsCol = mongoose.connection.db.collection('taxi_ownerneededdocuments');
  if (ownerDocsCol) {
    const docs = await ownerDocsCol.find({}).toArray();
    console.log('--- taxi_ownerneededdocuments ---');
    console.log(docs);
  }

  // Look for common_admins
  const adminCol = mongoose.connection.db.collection('common_admins');
  if (adminCol) {
    const docs = await adminCol.find({}).toArray();
    console.log('--- common_admins ---');
    console.log(docs);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
