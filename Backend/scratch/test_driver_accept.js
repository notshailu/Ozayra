import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('c:/Users/Shailendra Rajpoot/Desktop/ishsys-project/Master/Ishsys master/backend/.env') });

const MONGODB_URI = process.env.MONGODB_URI;

import { Driver } from '../src/modules/taxi/driver/models/Driver.js';
import { User } from '../src/modules/taxi/user/models/User.js';
import { Ride } from '../src/modules/taxi/user/models/Ride.js';
import { acceptRideAssignment } from '../src/modules/taxi/services/rideService.js';

async function run() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected!');

  // 1. Get driver sethvipozayra
  const driver = await Driver.findOne({ name: 'sethvipozayra' });
  if (!driver) {
    console.error('Driver sethvipozayra not found.');
    await mongoose.disconnect();
    return;
  }
  console.log('Found Driver:', driver.name, 'ID:', driver._id);

  // Ensure driver is online and not on a ride, and wallet is not blocked
  driver.isOnline = true;
  driver.isOnRide = false;
  driver.wallet = {
    balance: 1000,
    cashLimit: 500,
    isBlocked: false
  };
  await driver.save();
  console.log('Reset driver availability states.');

  // 2. Find or create a test user
  let user = await User.findOne({ name: 'Test Ride User' });
  if (!user) {
    user = await User.create({
      name: 'Test Ride User',
      phone: '9999990001',
      password: 'dummyPassword123',
      isActive: true
    });
    console.log('Created test user.');
  } else {
    console.log('Found test user:', user.name);
  }

  // 3. Create a ride requesting the driver's vehicle type
  console.log('Creating test ride requesting vehicleTypeId:', driver.vehicleTypeId);
  const testRide = await Ride.create({
    userId: user._id,
    vehicleTypeId: driver.vehicleTypeId,
    dispatchVehicleTypeIds: [driver.vehicleTypeId],
    vehicleIconType: driver.vehicleIconType || 'car',
    serviceType: 'ride',
    pickupLocation: { type: 'Point', coordinates: [75.8577, 22.7196] },
    pickupAddress: 'Test Pickup Address',
    dropLocation: { type: 'Point', coordinates: [75.8777, 22.7396] },
    dropAddress: 'Test Drop Address',
    fare: 150,
    paymentMethod: 'cash',
    status: 'searching',
    liveStatus: 'searching'
  });
  console.log('Created Ride ID:', testRide._id, 'Status:', testRide.status);

  // 4. Try accepting the ride via the backend service function
  try {
    console.log('Simulating acceptRideAssignment...');
    const acceptedRide = await acceptRideAssignment({
      rideId: testRide._id,
      driverId: driver._id
    });
    console.log('Acceptance Successful!');
    console.log('Ride status after acceptance:', acceptedRide.status);
    console.log('Ride liveStatus after acceptance:', acceptedRide.liveStatus);
    console.log('Ride assigned driver ID:', acceptedRide.driverId);

    const updatedDriver = await Driver.findById(driver._id);
    console.log('Driver status after acceptance: isOnline =', updatedDriver.isOnline, ', isOnRide =', updatedDriver.isOnRide);
    console.log('Driver wallet:', JSON.stringify(updatedDriver.wallet, null, 2));

  } catch (error) {
    console.error('Acceptance failed with error:', error);
  } finally {
    // Cleanup the test ride
    console.log('Cleaning up test ride...');
    await Ride.deleteOne({ _id: testRide._id });
    console.log('Cleanup finished.');

    // Restore driver isOnline and isOnRide
    const finalDriver = await Driver.findById(driver._id);
    finalDriver.isOnRide = false;
    finalDriver.isOnline = true;
    finalDriver.wallet = {
      balance: 1000,
      cashLimit: 500,
      isBlocked: false
    };
    await finalDriver.save();
    console.log('Restored driver to available state.');
  }

  await mongoose.disconnect();
}

run().catch(console.error);
