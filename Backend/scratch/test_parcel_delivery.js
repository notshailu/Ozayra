import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import { User } from '../src/modules/taxi/user/models/User.js';
import { Vehicle } from '../src/modules/taxi/admin/models/Vehicle.js';
import { Driver } from '../src/modules/taxi/driver/models/Driver.js';
import { Ride } from '../src/modules/taxi/user/models/Ride.js';
import { Delivery } from '../src/modules/taxi/user/models/Delivery.js';

import { createDeliveryRecord } from '../src/modules/taxi/user/services/deliveryService.js';
import { acceptRideAssignment, updateRideLifecycle } from '../src/modules/taxi/services/rideService.js';
import { RIDE_LIVE_STATUS } from '../src/modules/taxi/constants/index.js';

const runTest = async () => {
  const mongodbUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongodbUri) {
    console.error("No MONGO_URI or MONGODB_URI found in environment");
    process.exit(1);
  }

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongodbUri);
    console.log("Connected successfully!");

    // 1. Find or create a test User
    console.log("Finding/creating test User...");
    let testUser = await User.findOne({ phone: "9999999991" });
    if (!testUser) {
      testUser = await User.create({
        name: "Test Parcel User",
        phone: "9999999991",
        email: "testuser@example.com",
        isActive: true,
      });
    }
    console.log("Test User ID:", testUser._id);

    // 2. Find or create a test Vehicle Type
    console.log("Finding/creating test Vehicle...");
    let testVehicle = await Vehicle.findOne({ icon_types: "bike" });
    if (!testVehicle) {
      testVehicle = await Vehicle.create({
        name: "Test Delivery Bike",
        transport_type: "delivery",
        icon_types: "bike",
        status: 1,
        active: true,
      });
    }
    console.log("Test Vehicle ID:", testVehicle._id);

    // 3. Find or create a test Driver/Delivery Boy
    console.log("Finding/creating test Driver...");
    let testDriver = await Driver.findOne({ phone: "9999999992" });
    if (testDriver) {
      // Reset status to ensure they are online and available
      testDriver.isOnline = true;
      testDriver.isOnRide = false;
      testDriver.vehicleTypeId = testVehicle._id;
      testDriver.vehicleType = "bike";
      testDriver.vehicleIconType = "bike";
      testDriver.wallet = { balance: 1000, cashLimit: 500, isBlocked: false };
      testDriver.location = { type: "Point", coordinates: [75.8577, 22.7196] };
      await testDriver.save();
    } else {
      testDriver = await Driver.create({
        name: "Test Delivery Boy",
        phone: "9999999992",
        password: "hashedDummyPassword123",
        vehicleType: "bike",
        vehicleTypeId: testVehicle._id,
        vehicleIconType: "bike",
        isOnline: true,
        isOnRide: false,
        wallet: { balance: 1000, cashLimit: 500, isBlocked: false },
        location: { type: "Point", coordinates: [75.8577, 22.7196] }
      });
    }
    console.log("Test Driver ID:", testDriver._id);

    // 4. Create a delivery record (simulating booking request)
    console.log("Creating test delivery record (booking parcel)...");
    const deliveryPayload = {
      userId: testUser._id,
      pickup: [75.8577, 22.7196],
      drop: [75.8777, 22.7396],
      pickupAddress: "Indore Central Mall",
      dropAddress: "Vijay Nagar Square",
      fare: 120,
      vehicleTypeId: testVehicle._id,
      vehicleIconType: "bike",
      paymentMethod: "cash",
      parcel: {
        category: "Food/Documents",
        weight: "Under 5kg",
        description: "Important urgent documents",
        senderName: "Alice",
        senderMobile: "9999999991",
        receiverName: "Bob",
        receiverMobile: "9999999993"
      }
    };

    const deliveryRecord = await createDeliveryRecord(deliveryPayload);
    console.log("Delivery Record created successfully!");
    console.log("Ride ID:", deliveryRecord.rideId);
    console.log("Delivery ID:", deliveryRecord.deliveryId);
    console.log("Initial status in payload:", deliveryRecord.status);

    // Verify in db
    const initialRide = await Ride.findById(deliveryRecord.rideId);
    const initialDelivery = await Delivery.findById(deliveryRecord.deliveryId);
    console.log("DB Ride status:", initialRide.status);
    console.log("DB Delivery status:", initialDelivery.status);

    // 5. Simulate Driver Acceptance
    console.log("Simulating driver accepting the delivery...");
    const acceptedRide = await acceptRideAssignment({
      rideId: deliveryRecord.rideId,
      driverId: testDriver._id
    });
    console.log("Accepted ride status:", acceptedRide.status);

    // Verify syncing
    const acceptedDelivery = await Delivery.findById(deliveryRecord.deliveryId);
    console.log("Synced Delivery status after acceptance:", acceptedDelivery.status);
    console.log("Assigned driver ID in Delivery:", acceptedDelivery.driverId);

    // 6. Simulate Status Updates
    console.log("Updating status to ARRIVING...");
    let updatedRide = await updateRideLifecycle({
      rideId: deliveryRecord.rideId,
      driverId: testDriver._id,
      nextStatus: RIDE_LIVE_STATUS.ARRIVING
    });
    console.log("Arriving status:", updatedRide.liveStatus);

    console.log("Updating status to STARTED (parcel picked up)...");
    updatedRide = await updateRideLifecycle({
      rideId: deliveryRecord.rideId,
      driverId: testDriver._id,
      nextStatus: RIDE_LIVE_STATUS.STARTED
    });
    console.log("Started status:", updatedRide.liveStatus);

    console.log("Updating status to COMPLETED (parcel delivered)...");
    updatedRide = await updateRideLifecycle({
      rideId: deliveryRecord.rideId,
      driverId: testDriver._id,
      nextStatus: RIDE_LIVE_STATUS.COMPLETED
    });
    console.log("Completed status:", updatedRide.liveStatus);

    // Verify driver is freed
    const finalDriver = await Driver.findById(testDriver._id);
    console.log("Driver isOnRide status (should be false):", finalDriver.isOnRide);

    // Verify synced Delivery record is COMPLETED
    const finalDelivery = await Delivery.findById(deliveryRecord.deliveryId);
    console.log("Final Delivery status (should be COMPLETED):", finalDelivery.status);

    // Clean up
    console.log("Cleaning up test documents from database...");
    await Ride.deleteOne({ _id: deliveryRecord.rideId });
    await Delivery.deleteOne({ _id: deliveryRecord.deliveryId });
    console.log("Cleanup finished.");

    console.log("TEST SUCCESSFUL!");
    process.exit(0);
  } catch (error) {
    console.error("Test failed with error:", error);
    process.exit(1);
  }
};

runTest();
