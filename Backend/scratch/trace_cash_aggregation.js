import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Shailendra Rajpoot/Desktop/ishsys-project/Master/Ishsys master/Backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  const partnerId = new mongoose.Types.ObjectId('6a2e6845b78ba3a570859970');
  
  const orders = await mongoose.connection.db.collection('food_orders').find({
    "dispatch.deliveryPartnerId": partnerId,
    orderStatus: "delivered",
    "payment.method": { $in: ["cash", "cod", "cash_on_delivery"] }
  }).toArray();

  for (const o of orders) {
    const amountDue = o.payment?.amountDue || 0;
    const payableAmount = o.payableAmount || 0;
    const totalAmount = o.totalAmount || 0;
    const amount = o.amount || 0;
    const total = o.total || 0;
    const pricingTotal = o.pricing?.total || 0;
    const platformFee = o.pricing?.platformFee || 0;

    const added = pricingTotal + (platformFee > 0 ? platformFee : 0);
    const maxVal = Math.max(0, amountDue, payableAmount, totalAmount, amount, total, added);
    
    console.log(`Order ${o.orderId || o._id}:`);
    console.log(`  amountDue: ${amountDue}, pricingTotal: ${pricingTotal}, platformFee: ${platformFee}`);
    console.log(`  added (pricingTotal+fee): ${added}, maxVal: ${maxVal}`);
  }

  await mongoose.disconnect();
}

run().catch(console.error);
