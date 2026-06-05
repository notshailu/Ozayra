import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('c:/Users/Shailendra Rajpoot/Desktop/ishsys-project/Master/Ishsys master/backend/.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  const db = mongoose.connection.db;

  // 1. Fetch Indore Service Location
  const serviceLoc = await db.collection('taxi_servicelocations').findOne({ name: 'Indore' });
  if (!serviceLoc) {
    console.error('Service location Indore not found in database.');
    await mongoose.disconnect();
    return;
  }
  const serviceLocId = serviceLoc._id;
  console.log('Using Indore Service Location ID:', serviceLocId);

  // 2. Create Vehicle Type "Delivery Bike"
  let vehicle = await db.collection('taxi_vehicles').findOne({ name: 'Delivery Bike' });
  if (!vehicle) {
    console.log('Creating Delivery Bike...');
    const result = await db.collection('taxi_vehicles').insertOne({
      name: 'Delivery Bike',
      short_description: 'Fast parcel delivery',
      description: 'Standard delivery bike for local parcels',
      transport_type: 'delivery',
      dispatch_type: 'normal',
      icon_types: 'bike',
      capacity: 1,
      size: 'Medium',
      is_taxi: 'delivery',
      is_accept_share_ride: 0,
      image: '',
      icon: '',
      status: 1,
      active: true,
      supported_other_vehicle_types: [],
      vehicle_preference: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    vehicle = await db.collection('taxi_vehicles').findOne({ _id: result.insertedId });
  }
  console.log('Using Vehicle Type:', vehicle._id, vehicle.name);

  // 3. Create Zone "Indore Zone"
  let zone = await db.collection('taxi_zones').findOne({ name: 'Indore Zone' });
  if (!zone) {
    console.log('Creating Indore Zone...');
    const result = await db.collection('taxi_zones').insertOne({
      name: 'Indore Zone',
      service_location_id: serviceLocId,
      unit: 'km',
      active: true,
      status: 'active',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [75.7, 22.6],
            [76.0, 22.6],
            [76.0, 22.8],
            [75.7, 22.8],
            [75.7, 22.6]
          ]
        ]
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    zone = await db.collection('taxi_zones').findOne({ _id: result.insertedId });
  }
  console.log('Using Zone:', zone._id, zone.name);

  // 4. Create Set Price Rule for Indore + Delivery Bike
  let setPrice = await db.collection('taxi_setprices').findOne({
    zone_id: zone._id,
    vehicle_type: vehicle._id,
    transport_type: 'delivery'
  });
  if (!setPrice) {
    console.log('Creating Set Price Rule...');
    const result = await db.collection('taxi_setprices').insertOne({
      zone_id: zone._id,
      service_location_id: serviceLocId,
      transport_type: 'delivery',
      vehicle_type: vehicle._id,
      payment_type: ['cash'],
      customer_commission_type: 'percentage',
      customer_commission: 0,
      driver_commission_type: 'percentage',
      driver_commission: 0,
      owner_commission_type: 'percentage',
      owner_commission: 0,
      service_tax: 5,
      eta_sequence: 1,
      base_price: 45,
      base_distance: 2,
      price_per_distance: 10,
      time_price: 0,
      waiting_charge: 0,
      free_waiting_before: 0,
      free_waiting_after: 0,
      enable_airport_ride: false,
      enable_outstation_ride: false,
      user_cancellation_fee_type: 'percentage',
      user_cancellation_fee: 0,
      driver_cancellation_fee_type: 'percentage',
      driver_cancellation_fee: 0,
      cancellation_fee_goes_to: 'admin',
      enable_ride_sharing: false,
      admin_commission_type_for_owner: 1,
      admin_commission_for_owner: 0,
      admin_commision_type: 1,
      admin_commision: 0,
      admin_commission_type_from_driver: 1,
      admin_commission_from_driver: 0,
      airport_surge: 0,
      support_airport_fee: 0,
      support_outstation: 0,
      enable_shared_ride: 0,
      price_per_seat: 0,
      shared_price_per_distance: 0,
      shared_cancel_fee: 0,
      order_number: 1,
      bill_status: 1,
      parcel_weight_ranges: [
        {
          weight_range: 'Under 5kg',
          base_price: 45,
          base_distance: 2,
          price_per_distance: 10,
          admin_commission_type: 1,
          admin_commission: 10
        },
        {
          weight_range: 'Above 5kg',
          base_price: 90,
          base_distance: 2,
          price_per_distance: 18,
          admin_commission_type: 1,
          admin_commission: 15
        }
      ],
      status: 'active',
      active: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    setPrice = await db.collection('taxi_setprices').findOne({ _id: result.insertedId });
  }
  console.log('Set Price Rule configured successfully:', setPrice._id);

  await mongoose.disconnect();
}

run().catch(console.error);
