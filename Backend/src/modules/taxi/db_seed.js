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

  // 2. Create Vehicle Types
  const vehiclesToSeed = [
    {
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
    },
    {
      name: 'Auto Rickshaw',
      short_description: 'Affordable auto rides',
      description: 'Standard 3-wheeler auto rickshaw',
      transport_type: 'taxi',
      dispatch_type: 'normal',
      icon_types: 'auto',
      capacity: 3,
      size: 'Medium',
      is_taxi: 'taxi',
      is_accept_share_ride: 0,
      image: '',
      icon: '',
      status: 1,
      active: true,
      supported_other_vehicle_types: [],
      vehicle_preference: [],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Sedan',
      short_description: 'Comfortable car rides',
      description: 'Premium Sedan for high comfort rides',
      transport_type: 'taxi',
      dispatch_type: 'normal',
      icon_types: 'car',
      capacity: 4,
      size: 'Medium',
      is_taxi: 'taxi',
      is_accept_share_ride: 0,
      image: '',
      icon: '',
      status: 1,
      active: true,
      supported_other_vehicle_types: [],
      vehicle_preference: [],
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'xuv 700',
      short_description: 'comfortable suv',
      description: 'Comfortable 6-seater SUV rides',
      transport_type: 'taxi',
      dispatch_type: 'normal',
      icon_types: 'suv',
      capacity: 6,
      size: 'Large',
      is_taxi: 'taxi',
      is_accept_share_ride: 0,
      image: '',
      icon: '',
      status: 1,
      active: true,
      supported_other_vehicle_types: [],
      vehicle_preference: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const vehicleMap = {};

  for (const vData of vehiclesToSeed) {
    let vehicle = await db.collection('taxi_vehicles').findOne({ name: vData.name });
    if (!vehicle) {
      console.log(`Creating ${vData.name}...`);
      const result = await db.collection('taxi_vehicles').insertOne(vData);
      vehicle = await db.collection('taxi_vehicles').findOne({ _id: result.insertedId });
    }
    vehicleMap[vData.name] = vehicle;
    console.log(`Using Vehicle Type: ${vehicle._id} (${vehicle.name})`);
  }

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

  // 4. Create Set Price Rules for Indore
  const priceRules = [
    {
      vehicleName: 'Delivery Bike',
      transport_type: 'delivery',
      base_price: 45,
      base_distance: 2,
      price_per_distance: 10,
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
      ]
    },
    {
      vehicleName: 'Auto Rickshaw',
      transport_type: 'taxi',
      base_price: 30,
      base_distance: 2,
      price_per_distance: 12,
      parcel_weight_ranges: []
    },
    {
      vehicleName: 'Sedan',
      transport_type: 'taxi',
      base_price: 60,
      base_distance: 2,
      price_per_distance: 16,
      parcel_weight_ranges: []
    },
    {
      vehicleName: 'xuv 700',
      transport_type: 'taxi',
      base_price: 90,
      base_distance: 2,
      price_per_distance: 22,
      parcel_weight_ranges: []
    }
  ];

  for (const rule of priceRules) {
    const vType = vehicleMap[rule.vehicleName];
    if (!vType) continue;

    let setPrice = await db.collection('taxi_setprices').findOne({
      zone_id: zone._id,
      vehicle_type: vType._id,
      transport_type: rule.transport_type
    });

    if (!setPrice) {
      console.log(`Creating Set Price Rule for ${rule.vehicleName}...`);
      await db.collection('taxi_setprices').insertOne({
        zone_id: zone._id,
        service_location_id: serviceLocId,
        transport_type: rule.transport_type,
        vehicle_type: vType._id,
        payment_type: ['cash', 'online', 'wallet'],
        customer_commission_type: 'percentage',
        customer_commission: 0,
        driver_commission_type: 'percentage',
        driver_commission: 0,
        owner_commission_type: 'percentage',
        owner_commission: 0,
        service_tax: 5,
        eta_sequence: 1,
        base_price: rule.base_price,
        base_distance: rule.base_distance,
        price_per_distance: rule.price_per_distance,
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
        parcel_weight_ranges: rule.parcel_weight_ranges,
        status: 'active',
        active: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`Set Price Rule for ${rule.vehicleName} configured.`);
    }
  }

  // 5. Update logged-in driver's vehicleTypeId to Sedan or Auto so they are visible
  const activeDriver = await db.collection('taxi_drivers').findOne({ name: 'sethvipozayra' });
  if (activeDriver) {
    const sedanType = vehicleMap['Sedan'];
    console.log('Updating driver sethvipozayra to Sedan type...');
    await db.collection('taxi_drivers').updateOne(
      { _id: activeDriver._id },
      {
        $set: {
          vehicleTypeId: sedanType._id,
          vehicleType: sedanType.name,
          vehicleIconType: sedanType.icon_types
        }
      }
    );
    console.log('Driver sethvipozayra updated successfully.');
  }

  await mongoose.disconnect();
  console.log('Seeding done successfully!');
}

run().catch(console.error);
