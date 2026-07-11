import mongoose from 'mongoose';
import { getDeliveryPartnerWalletEnhanced } from '../src/modules/food/delivery/services/deliveryFinance.service.js';

const resolvedUri = 'mongodb://Ozayra2025:Ozayra2025@ac-zxypxil-shard-00-00.dkjt4ux.mongodb.net:27017,ac-zxypxil-shard-00-01.dkjt4ux.mongodb.net:27017,ac-zxypxil-shard-00-02.dkjt4ux.mongodb.net:27017/ozayra_taxi?ssl=true&authSource=admin&retryWrites=true&w=majority';

async function run() {
  await mongoose.connect(resolvedUri);
  const wallet = await getDeliveryPartnerWalletEnhanced('6a2e6845b78ba3a570859970');
  console.log('Wallet enhanced:', JSON.stringify(wallet, null, 2));
  await mongoose.disconnect();
}

run().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
