import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Shailendra Rajpoot/Desktop/ozayra-project/Master/Ozayra master/Backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  const partnerId = new mongoose.Types.ObjectId('6a2e6845b78ba3a570859970');
  
  const orders = await mongoose.connection.db.collection('food_orders').find({
    "dispatch.deliveryPartnerId": partnerId,
    orderStatus: "delivered"
  }).toArray();

  console.log(`Delivered orders count: ${orders.length}`);
  for (const o of orders) {
    console.log(`Order ${o.orderId || o._id}: payment.method=${o.payment?.method}, payment.amountDue=${o.payment?.amountDue}, riderEarning=${o.riderEarning}, total=${o.pricing?.total}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
