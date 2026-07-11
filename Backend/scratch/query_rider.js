import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: 'c:/Users/Shailendra Rajpoot/Desktop/ozayra-project/Master/Ozayra master/Backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  // Find order
  const order = await mongoose.connection.db.collection('food_orders').findOne({
    $or: [{ orderId: 'QC64280573' }, { _id: mongoose.Types.ObjectId.isValid('QC64280573') ? new mongoose.Types.ObjectId('QC64280573') : null }]
  });

  if (!order) {
    console.log('Order QC64280573 not found! Listing recent quick commerce orders:');
    const recent = await mongoose.connection.db.collection('food_orders').find({}).sort({ createdAt: -1 }).limit(5).toArray();
    for (const o of recent) {
      console.log(`Order: ${o.orderId || o._id}, status: ${o.orderStatus}, paymentMethod: ${o.payment?.method || o.paymentMethod}, partnerId: ${o.dispatch?.deliveryPartnerId}`);
    }
    await mongoose.disconnect();
    return;
  }

  console.log('Found order details:', {
    _id: order._id,
    orderId: order.orderId,
    orderStatus: order.orderStatus,
    payment: order.payment,
    dispatch: order.dispatch,
    riderEarning: order.riderEarning,
    payableAmount: order.payableAmount,
    pricing: order.pricing,
  });

  const partnerId = order.dispatch?.deliveryPartnerId;
  if (!partnerId) {
    console.log('No delivery partner assigned to this order.');
    await mongoose.disconnect();
    return;
  }

  // Fetch partner
  const partner = await mongoose.connection.db.collection('food_delivery_partners').findOne({ _id: partnerId });
  console.log('Partner details:', partner);

  // Fetch wallet doc
  const wallet = await mongoose.connection.db.collection('food_delivery_wallets').findOne({ deliveryPartnerId: partnerId });
  console.log('Wallet doc:', wallet);

  // Fetch deposits
  const deposits = await mongoose.connection.db.collection('food_delivery_cash_deposits').find({ deliveryPartnerId: partnerId }).toArray();
  console.log('Deposits:', deposits);

  // Run the aggregation logic from getDeliveryPartnerWalletEnhanced
  const cashCollectedAgg = await mongoose.connection.db.collection('food_orders').aggregate([
    {
      $match: {
        "dispatch.deliveryPartnerId": partnerId,
        orderStatus: "delivered",
        "payment.method": { $in: ["cash", "cod", "cash_on_delivery"] },
      },
    },
    {
      $group: {
        _id: null,
        cashCollected: {
          $sum: {
            $let: {
              vars: {
                amountDue: { $ifNull: ["$payment.amountDue", 0] },
                payableAmount: { $ifNull: ["$payableAmount", 0] },
                totalAmount: { $ifNull: ["$totalAmount", 0] },
                amount: { $ifNull: ["$amount", 0] },
                total: { $ifNull: ["$total", 0] },
                pricingTotal: { $ifNull: ["$pricing.total", 0] },
                platformFee: { $ifNull: ["$pricing.platformFee", 0] },
              },
              in: {
                $max: [
                  0,
                  "$$amountDue",
                  "$$payableAmount",
                  "$$totalAmount",
                  "$$amount",
                  "$$total",
                  {
                    $add: [
                      "$$pricingTotal",
                      {
                        $cond: [
                          { $gt: ["$$platformFee", 0] },
                          "$$platformFee",
                          0,
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
      },
    },
  ]).toArray();

  console.log('Aggregation result (cash collected):', cashCollectedAgg);

  await mongoose.disconnect();
}

run().catch(console.error);
