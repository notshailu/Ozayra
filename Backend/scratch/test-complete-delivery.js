import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { FoodOrder } from '../src/modules/food/orders/models/order.model.js';
import { completeDelivery } from '../src/modules/food/orders/services/order.service.js';
import { getDeliveryPartnerWalletEnhanced } from '../src/modules/food/delivery/services/deliveryFinance.service.js';

dotenv.config({ path: 'c:/Users/Shailendra Rajpoot/Desktop/ozayra-project/Master/Ozayra master/Backend/.env' });
const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB.');

  const partnerId = new mongoose.Types.ObjectId('6a2e6845b78ba3a570859970');

  // Let's create a mockup order first or find one
  // Create a clean uncompleted order assigned to this partner
  const orderDoc = await FoodOrder.create({
    orderId: 'TEST-' + Math.floor(100000 + Math.random() * 900000),
    userId: new mongoose.Types.ObjectId(),
    restaurantId: new mongoose.Types.ObjectId(),
    restaurantName: 'Test Restaurant',
    customerName: 'Test Customer',
    customerPhone: '9999999999',
    deliveryAddress: {
      fullName: 'Test Customer',
      phone: '9999999999',
      street: '123 Test St',
      city: 'Test City',
      state: 'Test State',
      zipCode: '110001'
    },
    items: [
      {
        itemId: 'item_test_123',
        name: 'Test Burger',
        type: 'food',
        sourceId: 'src_test_123',
        quantity: 1,
        price: 100
      }
    ],
    pricing: {
      subtotal: 100,
      deliveryFee: 40,
      gst: 18,
      restaurantCommission: 15,
      total: 158
    },
    payment: {
      method: 'cash',
      status: 'cod_pending',
      amountDue: 158
    },
    dispatch: {
      status: 'assigned',
      deliveryPartnerId: partnerId
    },
    orderStatus: 'picked_up',
    riderEarning: 20, // Rider gets ₹20
    platformProfit: 10,
    deliveryFleet: 'own_fleet'
  });

  console.log(`Created test order ${orderDoc._id} (ID: ${orderDoc.orderId}).`);

  // Verify wallet status BEFORE delivery
  const walletBefore = await getDeliveryPartnerWalletEnhanced(partnerId);
  console.log('--- Wallet BEFORE Complete Delivery ---');
  console.log(`pocketBalance: ₹${walletBefore.pocketBalance}`);
  console.log(`cashInHand: ₹${walletBefore.cashInHand}`);
  console.log(`totalEarned: ₹${walletBefore.totalEarned}`);

  // Now, call completeDelivery
  console.log('Calling completeDelivery...');
  await completeDelivery(orderDoc._id, partnerId, { paymentMode: 'cash' });

  // Wait a small timeout to let the async setImmediate run
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Verify wallet status AFTER delivery
  const walletAfter = await getDeliveryPartnerWalletEnhanced(partnerId);
  console.log('--- Wallet AFTER Complete Delivery ---');
  console.log(`pocketBalance: ₹${walletAfter.pocketBalance}`);
  console.log(`cashInHand: ₹${walletAfter.cashInHand}`);
  console.log(`totalEarned: ₹${walletAfter.totalEarned}`);

  // Cleanup: delete the test order we created
  await FoodOrder.deleteOne({ _id: orderDoc._id });
  console.log('Cleaned up test order.');

  await mongoose.disconnect();
}

run().catch(console.error);
