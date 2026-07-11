import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Shailendra Rajpoot/Desktop/ozayra-project/Master/Ozayra master/Backend/.env' });
const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB.');

  const db = mongoose.connection.db;

  // Find active orders
  const activeStatuses = { 
    $nin: [
      'delivered', 
      'cancelled', 
      'cancelled_by_user', 
      'cancelled_by_restaurant', 
      'cancelled_by_admin'
    ] 
  };

  const count = await db.collection('food_orders').countDocuments({ orderStatus: activeStatuses });
  console.log(`Found ${count} active orders in food_orders.`);

  if (count > 0) {
    const result = await db.collection('food_orders').deleteMany({ orderStatus: activeStatuses });
    console.log(`Successfully deleted ${result.deletedCount} active orders.`);
  } else {
    console.log('No active orders to delete.');
  }

  await mongoose.disconnect();
}

run().catch(console.error);
