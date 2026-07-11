import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Shailendra Rajpoot/Desktop/ozayra-project/Master/Ozayra master/Backend/.env' });
const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  const partnerId = new mongoose.Types.ObjectId('6a2e6845b78ba3a570859970');
  
  const orders = await mongoose.connection.db.collection('food_orders').find({
    "dispatch.deliveryPartnerId": partnerId,
    orderStatus: "delivered",
    "payment.method": { $in: ["cash", "cod", "cash_on_delivery"] }
  }).toArray();
  
  orders.forEach(o => {
    console.log(`Order: ${o.orderId || o._id}, Total: ${o.pricing?.total}, CreatedAt: ${o.createdAt}, DeliveredAt: ${o.deliveryState?.deliveredAt || o.updatedAt}`);
  });
  
  await mongoose.disconnect();
}

run().catch(console.error);
