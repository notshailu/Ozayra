import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const uri = process.env.MONGODB_URI;
console.log('Connecting to URI:', uri);

await mongoose.connect(uri);
console.log('Connected to MongoDB!');

const zoneSchema = new mongoose.Schema({}, { strict: false });
const Zone = mongoose.model('TaxiZone', zoneSchema, 'taxi_zones');

const zones = await Zone.find().lean();
console.log('Found Zones in database:');
console.log(zones.map(z => ({ id: z._id, name: z.name, active: z.active })));

// Test Varanasi coordinates: longitude ~82.9739, latitude ~25.3176
const pickupCoords = [82.9739, 25.3176];
console.log('Testing coordinates:', pickupCoords);

const match = await Zone.findOne({
  geometry: {
    $geoIntersects: {
      $geometry: {
        type: 'Point',
        coordinates: pickupCoords,
      },
    },
  },
});

console.log('Match result:', match ? { id: match._id, name: match.name } : 'NO MATCH');

await mongoose.disconnect();
console.log('Disconnected.');
