import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Shailendra Rajpoot/Desktop/ozayra-project/Master/Ozayra master/Backend/.env' });
const MONGODB_URI = process.env.MONGODB_URI;

function getCurrentWeekMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

async function run() {
  await mongoose.connect(MONGODB_URI);
  const partnerId = new mongoose.Types.ObjectId('6a2e6845b78ba3a570859970');
  const monday = getCurrentWeekMonday();
  console.log('Current week Monday start:', monday);

  const orders = await mongoose.connection.db.collection('food_orders').find({
    "dispatch.deliveryPartnerId": partnerId,
    orderStatus: "delivered",
    "payment.method": { $in: ["cash", "cod", "cash_on_delivery"] },
    $or: [
      { "deliveryState.deliveredAt": { $gte: monday } },
      { "deliveryState.deliveredAt": { $exists: false }, updatedAt: { $gte: monday } }
    ]
  }).toArray();

  console.log(`Found ${orders.length} orders for current week.`);
  let total = 0;
  orders.forEach(o => {
    total += o.pricing?.total || 0;
    console.log(`Order: ${o.orderId}, total: ${o.pricing?.total}, deliveredAt: ${o.deliveryState?.deliveredAt || o.updatedAt}`);
  });
  console.log(`Weekly COD Collected: ₹${total}`);

  await mongoose.disconnect();
}

run().catch(console.error);
