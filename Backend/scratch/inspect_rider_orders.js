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
  
  console.log('Delivered cash orders count:', orders.length);
  orders.forEach(o => {
    console.log(`Order: ${o.orderId || o._id}, status: ${o.orderStatus}, paymentMethod: ${o.payment?.method || o.paymentMethod}, total: ${o.pricing?.total}, platformFee: ${o.pricing?.platformFee}, riderEarning: ${o.riderEarning}`);
  });
  
  await mongoose.disconnect();
}

run().catch(console.error);
