import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Shailendra Rajpoot/Desktop/ishsys-project/Master/Ishsys master/Backend/.env' });
const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB.');

  const partnerId = new mongoose.Types.ObjectId('6a2e6845b78ba3a570859970');

  // 1. Fetch wallet
  const wallet = await mongoose.connection.db.collection('food_delivery_wallets').findOne({ deliveryPartnerId: partnerId });
  console.log('--- DB Wallet Document ---');
  console.log(JSON.stringify(wallet, null, 2));

  // 2. Fetch transactions from core Transactions collection
  const txs = await mongoose.connection.db.collection('transactions').find({
    entityType: 'deliveryBoy',
    entityId: partnerId
  }).toArray();

  console.log('\n--- Core Transactions ---');
  console.log(`Found ${txs.length} transactions.`);
  txs.forEach(t => {
    console.log(`Tx: ${t._id}, type: ${t.type}, amount: ${t.amount}, category: ${t.category}, balanceAfter: ${t.balanceAfter}, desc: ${t.description}`);
  });

  // 3. Let's count how many delivered orders have riderEarning > 0
  const orders = await mongoose.connection.db.collection('food_orders').find({
    'dispatch.deliveryPartnerId': partnerId,
    orderStatus: 'delivered'
  }).toArray();

  console.log('\n--- Delivered Orders ---');
  console.log(`Found ${orders.length} delivered orders.`);
  let totalEarnings = 0;
  orders.forEach(o => {
    if (o.riderEarning > 0) {
      totalEarnings += o.riderEarning;
      console.log(`Order: ${o.orderId || o._id}, riderEarning: ${o.riderEarning}, paymentMethod: ${o.payment?.method || o.paymentMethod}`);
    }
  });
  console.log(`Sum of riderEarnings in delivered orders: ₹${totalEarnings}`);

  await mongoose.disconnect();
}

run().catch(console.error);
