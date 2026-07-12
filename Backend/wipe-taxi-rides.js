import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const wipeRides = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');
    
    // Drop the rides collection or clear it
    const db = mongoose.connection.db;
    
    const collections = await db.listCollections().toArray();
    const rideCollections = collections.filter(c => c.name.toLowerCase().includes('ride'));
    
    for (const col of rideCollections) {
      console.log(`Clearing collection: ${col.name}`);
      await db.collection(col.name).deleteMany({});
    }

    console.log('Successfully wiped all taxi rides data!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

wipeRides();
