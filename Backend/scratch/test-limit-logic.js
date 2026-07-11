import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { listOrdersAvailableDelivery, acceptOrderDelivery } from '../src/modules/food/orders/services/order.service.js';
import { getDeliveryPartnerWalletEnhanced } from '../src/modules/food/delivery/services/deliveryFinance.service.js';

dotenv.config({ path: 'c:/Users/Shailendra Rajpoot/Desktop/ozayra-project/Master/Ozayra master/Backend/.env' });
const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to Database.');

  const partnerId = '6a2e6845b78ba3a570859970'; // Test rider ID

  // 1. Fetch wallet details
  const wallet = await getDeliveryPartnerWalletEnhanced(partnerId);
  console.log('--- Rider Wallet Status ---');
  console.log(`Cash in Hand: ₹${wallet.cashInHand}`);
  console.log(`Total Cash Limit: ₹${wallet.totalCashLimit}`);
  console.log(`Available Cash Limit: ₹${wallet.availableCashLimit}`);
  console.log('---------------------------');

  // 2. Fetch available orders
  console.log('\nFetching available orders for this rider...');
  const result = await listOrdersAvailableDelivery(partnerId, { page: 1, limit: 10 });
  const orders = result.data || result.docs || [];
  console.log(`Found ${orders.length} available orders.`);

  let codCount = 0;
  orders.forEach(o => {
    const method = String(o.payment?.method || o.paymentMethod || '').toLowerCase();
    const isCod = ['cash', 'cod', 'cash_on_delivery'].includes(method);
    if (isCod) {
      codCount++;
      console.log(`[Error] COD Order found in available list: Order ID: ${o.orderId}, paymentMethod: ${method}, total: ₹${o.pricing?.total}`);
    }
  });

  if (codCount === 0) {
    console.log('Verification Success: No COD orders are visible to this rider (as they are over the cash limit).');
  } else {
    console.log(`[Failure] ${codCount} COD orders were visible to the rider despite exceeding the limit.`);
  }

  // 3. Attempt to accept a COD order
  console.log('\nAttempting to accept a COD order...');
  const anyCodOrder = await mongoose.connection.db.collection('food_orders').findOne({
    'payment.method': { $in: ['cash', 'cod', 'cash_on_delivery'] }
  });

  if (anyCodOrder) {
    const originalStatus = anyCodOrder.orderStatus;
    const originalDispatchStatus = anyCodOrder.dispatch?.status || 'unassigned';

    console.log(`Temporarily setting order ${anyCodOrder.orderId || anyCodOrder._id} to confirmed and unassigned to test acceptance limit validation...`);
    await mongoose.connection.db.collection('food_orders').updateOne(
      { _id: anyCodOrder._id },
      { $set: { orderStatus: 'confirmed', 'dispatch.status': 'unassigned' } }
    );

    try {
      await acceptOrderDelivery(anyCodOrder._id, partnerId);
      console.log('[Failure] Was able to accept the COD order despite exceeding limit!');
    } catch (err) {
      console.log(`Verification Success: Order acceptance failed with expected error: "${err.message}"`);
    }

    // Restore original status
    console.log('Restoring original order status...');
    await mongoose.connection.db.collection('food_orders').updateOne(
      { _id: anyCodOrder._id },
      { $set: { orderStatus: originalStatus, 'dispatch.status': originalDispatchStatus } }
    );
  } else {
    console.log('No COD orders found in DB to perform accept test.');
  }

  await mongoose.disconnect();
}

run().catch(console.error);
