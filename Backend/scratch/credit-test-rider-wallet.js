import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { creditWallet } from '../src/core/payments/wallet.service.js';

dotenv.config({ path: 'c:/Users/Shailendra Rajpoot/Desktop/ishsys-project/Master/Ishsys master/Backend/.env' });
const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB.');

  const partnerId = '6a2e6845b78ba3a570859970';

  // The three delivered orders with riderEarning = 11
  const orders = [
    { orderId: 'QC28925261', amount: 11, paymentMethod: 'cash', mongoId: '6a2e6845b78ba3a570859971' },
    { orderId: 'QC29573771', amount: 11, paymentMethod: 'razorpay', mongoId: '6a2e6845b78ba3a570859972' },
    { orderId: 'QC64280573', amount: 11, paymentMethod: 'cash', mongoId: '6a2e6845b78ba3a570859973' }
  ];

  for (const o of orders) {
    // Check if a transaction already exists for this order
    const existingTx = await mongoose.connection.db.collection('transactions').findOne({
      entityType: 'deliveryBoy',
      entityId: new mongoose.Types.ObjectId(partnerId),
      orderId: new mongoose.Types.ObjectId(o.mongoId)
    });

    if (existingTx) {
      console.log(`Transaction already exists for order ${o.orderId}. Skipping.`);
    } else {
      console.log(`Crediting wallet for order ${o.orderId} with ₹${o.amount}...`);
      await creditWallet({
        entityType: 'deliveryBoy',
        entityId: partnerId,
        amount: o.amount,
        description: `Order ${o.orderId} - delivery earning`,
        category: 'delivery_earning',
        orderId: o.mongoId,
        metadata: { orderId: o.orderId, paymentMethod: o.paymentMethod }
      });
    }
  }

  // Also increment totalDeliveries in the wallet to match
  const { FoodDeliveryWallet } = await import('../src/modules/food/delivery/models/deliveryWallet.model.js');
  await FoodDeliveryWallet.updateOne(
    { deliveryPartnerId: new mongoose.Types.ObjectId(partnerId) },
    { $set: { totalDeliveries: 9 } }
  );

  console.log('Wallet credited and synced successfully.');
  await mongoose.disconnect();
}

run().catch(console.error);
