import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/Shailendra Rajpoot/Desktop/ishsys-project/Master/Ishsys master/Backend/.env' });
const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB.');

  const partnerId = new mongoose.Types.ObjectId('6a2e6845b78ba3a570859970');

  // 1. Delete transactions
  const txDel = await mongoose.connection.db.collection('transactions').deleteMany({
    entityType: 'deliveryBoy',
    entityId: partnerId
  });
  console.log(`Deleted ${txDel.deletedCount} transactions.`);

  // 2. Delete wallet
  const walletDel = await mongoose.connection.db.collection('food_delivery_wallets').deleteMany({
    deliveryPartnerId: partnerId
  });
  console.log(`Deleted ${walletDel.deletedCount} wallet documents.`);

  // 3. Delete deposits
  const depositDel = await mongoose.connection.db.collection('food_delivery_cash_deposits').deleteMany({
    deliveryPartnerId: partnerId
  });
  console.log(`Deleted ${depositDel.deletedCount} cash deposits.`);

  // 4. Delete withdrawals
  const withdrawalDel = await mongoose.connection.db.collection('food_delivery_withdrawals').deleteMany({
    deliveryPartnerId: partnerId
  });
  console.log(`Deleted ${withdrawalDel.deletedCount} withdrawals.`);

  // 5. Delete delivered orders assigned to this rider
  const orderDel = await mongoose.connection.db.collection('food_orders').deleteMany({
    "dispatch.deliveryPartnerId": partnerId,
    orderStatus: "delivered"
  });
  console.log(`Deleted ${orderDel.deletedCount} delivered orders.`);

  // 5a. Delete bonus transactions
  const bonusDel = await mongoose.connection.db.collection('food_delivery_bonus_transactions').deleteMany({
    deliveryPartnerId: partnerId
  });
  console.log(`Deleted ${bonusDel.deletedCount} bonus transactions.`);

  // 5b. Delete earning addon history
  const addonHistoryDel = await mongoose.connection.db.collection('food_earning_addon_history').deleteMany({
    deliveryPartnerId: partnerId
  });
  console.log(`Deleted ${addonHistoryDel.deletedCount} earning addon history documents.`);

  // 6. Unassign any other orders currently assigned to this rider
  const orderUpdate = await mongoose.connection.db.collection('food_orders').updateMany(
    { "dispatch.deliveryPartnerId": partnerId },
    { 
      $set: { 
        "dispatch.deliveryPartnerId": null, 
        "dispatch.status": "unassigned" 
      } 
    }
  );
  console.log(`Unassigned ${orderUpdate.modifiedCount} active orders.`);

  console.log('Data wipe completed successfully.');
  await mongoose.disconnect();
}

run().catch(console.error);
