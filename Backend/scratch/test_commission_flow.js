import 'dotenv/config';
import mongoose from 'mongoose';
import { QuickSellerCommission } from '../src/modules/quick-commerce/admin/models/sellerCommission.model.js';
import { Seller } from '../src/modules/quick-commerce/seller/models/seller.model.js';
import { SellerProduct } from '../src/modules/quick-commerce/seller/models/sellerProduct.model.js';
import { QuickCategory } from '../src/modules/quick-commerce/models/category.model.js';
import { QuickOrder } from '../src/modules/quick-commerce/models/order.model.js';
import { SellerOrder } from '../src/modules/quick-commerce/seller/models/sellerOrder.model.js';
import { QuickDeliveryCommissionRule } from '../src/modules/quick-commerce/admin/models/deliveryCommissionRule.model.js';
import { QuickFeeSettings } from '../src/modules/quick-commerce/admin/models/feeSettings.model.js';

import { getSellerCommissionSnapshot } from '../src/modules/quick-commerce/admin/services/commission.service.js';
import { getQuickCommerceFinanceSummary } from '../src/modules/quick-commerce/services/finance.service.js';
import { placeOrder } from '../src/modules/quick-commerce/controllers/order.controller.js';

// Setup Mock Response
const createMockResponse = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
};

async function runTest() {
  const dbUri = process.env.MONGODB_URI;
  if (!dbUri) {
    console.error('❌ MONGODB_URI not found in process.env');
    process.exit(1);
  }

  console.log('Connecting to database...');
  await mongoose.connect(dbUri);
  console.log('✅ Connected to MongoDB');

  // Track seeded items for cleanup
  const cleanupQueue = {
    sellers: [],
    categories: [],
    products: [],
    commissions: [],
    orders: [],
    sellerOrders: [],
    deliveryRules: [],
    feeSettings: []
  };

  const cleanup = async () => {
    console.log('\n🧹 Cleaning up seeded test data...');
    try {
      if (cleanupQueue.commissions.length > 0) {
        await QuickSellerCommission.deleteMany({ _id: { $in: cleanupQueue.commissions } });
      }
      if (cleanupQueue.products.length > 0) {
        await SellerProduct.deleteMany({ _id: { $in: cleanupQueue.products } });
      }
      if (cleanupQueue.categories.length > 0) {
        await QuickCategory.deleteMany({ _id: { $in: cleanupQueue.categories } });
      }
      if (cleanupQueue.sellers.length > 0) {
        await Seller.deleteMany({ _id: { $in: cleanupQueue.sellers } });
      }
      if (cleanupQueue.orders.length > 0) {
        await QuickOrder.deleteMany({ _id: { $in: cleanupQueue.orders } });
      }
      if (cleanupQueue.sellerOrders.length > 0) {
        await SellerOrder.deleteMany({ _id: { $in: cleanupQueue.sellerOrders } });
      }
      if (cleanupQueue.deliveryRules.length > 0) {
        await QuickDeliveryCommissionRule.deleteMany({ _id: { $in: cleanupQueue.deliveryRules } });
      }
      if (cleanupQueue.feeSettings.length > 0) {
        await QuickFeeSettings.deleteMany({ _id: { $in: cleanupQueue.feeSettings } });
      }
      console.log('✅ Cleanup finished successfully.');
    } catch (e) {
      console.error('❌ Cleanup failed:', e.message);
    }
  };

  try {
    // ----------------------------------------------------
    // SEED BASE REQUIREMENTS FOR QUICK PRICING & DISPATCH
    // ----------------------------------------------------
    console.log('\n🌱 Seeding test configurations...');
    
    // 1. Fee Settings
    const feeSetting = await QuickFeeSettings.create({
      deliveryFee: 15,
      deliveryFeeRanges: [],
      freeDeliveryThreshold: 500,
      platformFee: 2,
      gstRate: 5,
      returnDeliveryCommission: 0,
      isActive: true
    });
    cleanupQueue.feeSettings.push(feeSetting._id);

    // 2. Base Delivery Commission Rule (minDistance: 0 is required by billing.service getRiderEarning)
    const deliveryRule = await QuickDeliveryCommissionRule.create({
      name: 'Base Slab',
      minDistance: 0,
      maxDistance: 10,
      commissionPerKm: 5,
      basePayout: 30,
      status: true
    });
    cleanupQueue.deliveryRules.push(deliveryRule._id);

    // 3. Category (required by product)
    const category = await QuickCategory.create({
      name: 'Test Grocery',
      slug: `test-grocery-${Date.now()}`,
      isActive: true,
      approvalStatus: 'approved'
    });
    cleanupQueue.categories.push(category._id);

    // 4. Seller
    const seller = await Seller.create({
      name: 'Test Merchant',
      shopName: 'Test Quick Mart',
      phone: '9999999999',
      isActive: true,
      approved: true,
      approvalStatus: 'approved',
      location: {
        type: 'Point',
        coordinates: [77.5946, 12.9716],
        latitude: 12.9716,
        longitude: 77.5946,
        address: 'Test Merchant Address',
        formattedAddress: 'Test Merchant Address'
      }
    });
    cleanupQueue.sellers.push(seller._id);

    // 5. Product (with sellerId, mapped to collection quick_products)
    const product = await SellerProduct.create({
      sellerId: seller._id,
      name: 'Test Milk',
      slug: `test-milk-${Date.now()}`,
      price: 100,
      mrp: 100,
      stock: 50,
      categoryId: category._id,
      isActive: true,
      status: 'active',
      approvalStatus: 'approved'
    });
    cleanupQueue.products.push(product._id);

    console.log('✅ Configuration seeded.');

    // ----------------------------------------------------
    // TEST CASE 1: PERCENTAGE-BASED COMMISSION RULES
    // ----------------------------------------------------
    console.log('\n🧪 Test Case 1: Testing percentage commission calculation (10%)');
    
    // Delete any default rules for this seller first
    await QuickSellerCommission.deleteMany({ sellerId: seller._id });

    // Create 10% commission rule
    const rulePct = await QuickSellerCommission.create({
      sellerId: seller._id,
      defaultCommission: {
        type: 'percentage',
        value: 10
      },
      status: true
    });
    cleanupQueue.commissions.push(rulePct._id);

    // Force clear internal cache by waiting/calling or mocking since getActiveSellerCommissionRules uses 60s cache
    // Our test is running in a fresh process, so the cache is empty.
    
    const pctSnapshot = await getSellerCommissionSnapshot(seller._id, 200);
    console.log('Computed Percentage Commission snapshot:', pctSnapshot);
    
    if (pctSnapshot.commissionAmount !== 20) {
      throw new Error(`Expected percentage commission to be 20, got ${pctSnapshot.commissionAmount}`);
    }
    if (pctSnapshot.commissionType !== 'percentage' || pctSnapshot.commissionValue !== 10) {
      throw new Error(`Expected commission snapshot to reflect percentage rule details`);
    }
    console.log('✅ Test Case 1 Passed.');

    // ----------------------------------------------------
    // TEST CASE 2: FLAT AMOUNT-BASED COMMISSION RULES
    // ----------------------------------------------------
    console.log('\n🧪 Test Case 2: Testing flat amount commission calculation (₹25)');

    // Update the rule
    await QuickSellerCommission.updateOne(
      { sellerId: seller._id },
      { $set: { 'defaultCommission.type': 'amount', 'defaultCommission.value': 25 } }
    );

    const amtSnapshot = await getSellerCommissionSnapshot(seller._id, 200);
    console.log('Computed Flat Amount Commission snapshot:', amtSnapshot);

    if (amtSnapshot.commissionAmount !== 25) {
      throw new Error(`Expected flat amount commission to be 25, got ${amtSnapshot.commissionAmount}`);
    }
    if (amtSnapshot.commissionType !== 'amount' || amtSnapshot.commissionValue !== 25) {
      throw new Error(`Expected commission snapshot to reflect flat amount rule details`);
    }
    console.log('✅ Test Case 2 Passed.');

    // ----------------------------------------------------
    // TEST CASE 3: END-TO-END ORDER PLACEMENT
    // ----------------------------------------------------
    console.log('\n🧪 Test Case 3: Testing order placement and fan-out calculations');

    // Restore percentage rule for order placement testing
    await QuickSellerCommission.updateOne(
      { sellerId: seller._id },
      { $set: { 'defaultCommission.type': 'percentage', 'defaultCommission.value': 10 } }
    );

    // Mock Express Request
    const req = {
      body: {
        items: [
          { productId: product._id, quantity: 2 } // 2 * 100 = 200 subtotal
        ],
        address: {
          street: 'Test 456 Street',
          city: 'Bangalore',
          location: {
            type: 'Point',
            coordinates: [77.5946, 12.9716]
          }
        },
        paymentMode: 'COD',
        sessionId: `session-${Date.now()}`
      },
      headers: {},
      user: {
        userId: new mongoose.Types.ObjectId()
      }
    };

    const res = createMockResponse();

    // Call placeOrder
    console.log('Invoking placeOrder controller...');
    await placeOrder(req, res);

    if (res.statusCode !== 201 && res.statusCode !== 200) {
      throw new Error(`placeOrder failed with status ${res.statusCode}: ${JSON.stringify(res.body)}`);
    }

    const responseData = res.body?.result || res.body?.data || res.body;
    const orderId = responseData?.order?.orderId || responseData?.orderId || responseData?.orderNumber || responseData?.id;
    const orderMongoId = responseData?.order?._id || responseData?._id;

    if (!orderMongoId) {
      throw new Error(`Could not find order ID in response: ${JSON.stringify(res.body)}`);
    }

    console.log(`Order placed. Parent Order ID: ${orderId}, Mongo ID: ${orderMongoId}`);
    cleanupQueue.orders.push(orderMongoId);

    // Fetch the Parent Order
    const parentOrder = await QuickOrder.findById(orderMongoId).lean();
    console.log('Parent Order Pricing:', parentOrder.pricing);

    // Subtotal = 200. Commission (10%) = 20.
    if (parentOrder.pricing.restaurantCommission !== 20) {
      throw new Error(`Expected parent order pricing.restaurantCommission to be 20, got ${parentOrder.pricing.restaurantCommission}`);
    }

    // Fetch the Seller Order Leg
    const sellerOrder = await SellerOrder.findOne({ parentOrderId: orderMongoId }).lean();
    if (!sellerOrder) {
      throw new Error(`SellerOrder leg was not created for parent order ${orderMongoId}`);
    }
    console.log('Seller Order Pricing:', sellerOrder.pricing);
    cleanupQueue.sellerOrders.push(sellerOrder._id);

    if (sellerOrder.pricing.subtotal !== 200) {
      throw new Error(`Expected seller order subtotal to be 200, got ${sellerOrder.pricing.subtotal}`);
    }
    if (sellerOrder.pricing.commission !== 20) {
      throw new Error(`Expected seller order commission to be 20, got ${sellerOrder.pricing.commission}`);
    }
    if (sellerOrder.pricing.receivable !== 180) {
      throw new Error(`Expected seller order receivable to be 180 (200 - 20), got ${sellerOrder.pricing.receivable}`);
    }

    console.log('✅ Test Case 3 Passed.');

    // ----------------------------------------------------
    // TEST CASE 4: FINANCE SUMMARY AGGREGATIONS
    // ----------------------------------------------------
    console.log('\n🧪 Test Case 4: Testing finance summary calculations');

    // To test delivered order finance summary, let's mark order and seller order as delivered
    await QuickOrder.updateOne(
      { _id: orderMongoId },
      { $set: { orderStatus: 'delivered', 'payment.status': 'paid' } }
    );
    await SellerOrder.updateOne(
      { parentOrderId: orderMongoId },
      { $set: { status: 'delivered', workflowStatus: 'DELIVERED' } }
    );

    const financeSummary = await getQuickCommerceFinanceSummary();
    console.log('Quick Commerce Finance Summary:', financeSummary);

    // Since we have seeded a single order, let's verify that the payouts/earnings reflect our mock data.
    // Net receivable owed to sellers: subtotal (200) - commission (20) = 180.
    // If no settled withdrawals exist, sellerPendingPayouts should be 180 (plus any existing historical DB data).
    // Let's assert sellerPendingPayouts is >= 180.
    if (financeSummary.sellerPendingPayouts < 180) {
      throw new Error(`Expected sellerPendingPayouts to be at least 180, got ${financeSummary.sellerPendingPayouts}`);
    }

    console.log('✅ Test Case 4 Passed.');
    console.log('\n🎉 ALL TESTS COMPLETED SUCCESSFULLY! Quick Commerce Commission system is working correctly.');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
  } finally {
    await cleanup();
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runTest();
