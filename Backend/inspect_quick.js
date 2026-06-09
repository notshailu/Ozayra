import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('c:/Users/Shailendra Rajpoot/Desktop/ishsys-project/Master/Ishsys master/backend/.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  const collections = await mongoose.connection.db.listCollections().toArray();
  const names = collections.map(c => c.name);
  console.log('All Collections:', names);

  const matched = names.filter(n => n.includes('quick') || n.includes('category') || n.includes('product'));
  console.log('Matched Collections:', matched);

  for (const name of matched) {
    const count = await mongoose.connection.db.collection(name).countDocuments();
    console.log(`Collection: ${name}, Count: ${count}`);
    if (count > 0) {
      const sample = await mongoose.connection.db.collection(name).find({}).limit(5).toArray();
      console.log(`Sample from ${name}:`, JSON.stringify(sample, null, 2));
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
