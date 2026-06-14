import mongoose from 'mongoose';

const resolvedUri = 'mongodb://Ozayra2025:Ozayra2025@ac-zxypxil-shard-00-00.dkjt4ux.mongodb.net:27017,ac-zxypxil-shard-00-01.dkjt4ux.mongodb.net:27017,ac-zxypxil-shard-00-02.dkjt4ux.mongodb.net:27017/ishsys_taxi?ssl=true&authSource=admin&retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(resolvedUri);
  const db = mongoose.connection.db;
  const result = await db.collection('food_orders').updateOne(
    { _id: new mongoose.Types.ObjectId('6a2e72bd1d525ed75f3bc58a') },
    { $set: { 'payment.amountDue': 46 } }
  );
  console.log('Update result:', result);
  await mongoose.disconnect();
}

run().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
