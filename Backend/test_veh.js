import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env') });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const collections = await mongoose.connection.db.listCollections().toArray();
  const names = collections.map(c => c.name);
  console.log('All Collections:', names);
  
  const vColls = names.filter(n => n.toLowerCase().includes('vehic'));
  console.log('Vehicle collections:', vColls);

  for (const name of vColls) {
    const data = await mongoose.connection.db.collection(name).find({}).limit(2).toArray();
    console.log(`Data from ${name}:`, JSON.stringify(data, null, 2));
  }

  await mongoose.disconnect();
}

run().catch(console.error);
