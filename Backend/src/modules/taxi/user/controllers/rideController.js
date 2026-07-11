import mongoose from 'mongoose';
import crypto from 'node:crypto';
import { ApiError } from '../../../../utils/ApiError.js';
import { normalizePoint } from '../../../../utils/geo.js';
import { Driver } from '../../driver/models/Driver.js';
import { Vehicle } from '../../admin/models/Vehicle.js';
import { Ride } from '../../user/models/Ride.js';
import { settleCompletedRideWallet } from '../../driver/services/walletService.js';
import { getIO } from '../../../../config/socket.js';
import { SOCKET_EVENTS } from '../../socket/events.js';
import { resolveRazorpayCredentials, razorpayRequest } from './userController.js';

const getMockVehicleDetails = (typeName = '') => {
  const lower = typeName.toLowerCase();
  if (lower.includes('bike') || lower.includes('motorcycle')) {
    return { make: 'Honda', model: 'Activa', color: 'Black' };
  }
  if (lower.includes('auto') || lower.includes('rickshaw')) {
    return { make: 'Bajaj', model: 'RE', color: 'Yellow-Green' };
  }
  if (lower.includes('suv')) {
    return { make: 'Toyota', model: 'Innova', color: 'White' };
  }
  if (lower.includes('sedan')) {
    return { make: 'Suzuki', model: 'Dzire', color: 'Silver' };
  }
  return { make: 'Toyota', model: 'Etios', color: 'White' };
};
import { RIDE_LIVE_STATUS } from '../../constants/index.js';
import {
  createRideRecord,
  ensureRideParticipantAccess,
  getActiveRideForIdentity,
  getRideDetails,
  getRideRoom,
  listRideHistoryForIdentity,
  serializeRideRealtime,
  submitRideFeedback,
  updateRideLifecycle,
} from '../../services/rideService.js';
import { cancelRideByUser, startDispatchFlow } from '../../services/dispatchService.js';
import { getTipSettings } from '../../services/appSettingsService.js';

const EARTH_RADIUS_METERS = 6371000;
const AVERAGE_CITY_SPEED_KMPH = 24;

const toRadians = (value) => (Number(value) * Math.PI) / 180;

const calculateDistanceMeters = (fromCoords = [], toCoords = []) => {
  const [fromLng, fromLat] = fromCoords;
  const [toLng, toLat] = toCoords;

  if (![fromLng, fromLat, toLng, toLat].every((value) => Number.isFinite(Number(value)))) {
    return null;
  }

  const latDelta = toRadians(toLat - fromLat);
  const lngDelta = toRadians(toLng - fromLng);
  const startLat = toRadians(fromLat);
  const endLat = toRadians(toLat);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(lngDelta / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_METERS * c);
};

const estimateEtaMinutes = (distanceMeters) => {
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
    return 1;
  }

  const metersPerMinute = (AVERAGE_CITY_SPEED_KMPH * 1000) / 60;
  return Math.max(1, Math.round(distanceMeters / metersPerMinute));
};

export const createRide = async (req, res) => {
  const { pickup, drop, pickupAddress, dropAddress, fare, estimatedDistanceMeters, estimatedDurationMinutes, vehicleTypeId, vehicleIconType, paymentMethod, serviceType, intercity, promo_code, service_location_id, transport_type, otp } =
    req.body;

  if (!pickup || !drop) {
    throw new ApiError(400, 'pickup and drop are required');
  }

  const ride = await createRideRecord({
    userId: req.auth.sub,
    pickupCoords: normalizePoint(pickup, 'pickup'),
    dropCoords: normalizePoint(drop, 'drop'),
    pickupAddress,
    dropAddress,
    fare: Number(fare || 0),
    estimatedDistanceMeters: Number(estimatedDistanceMeters || 0),
    estimatedDurationMinutes: Number(estimatedDurationMinutes || 0),
    vehicleTypeId,
    vehicleIconType,
    paymentMethod,
    serviceType,
    intercity,
    promo_code,
    service_location_id,
    transport_type,
    otp,
  });

  if (String(paymentMethod).toLowerCase() !== 'online') {
    await startDispatchFlow(ride);
  }

  res.status(201).json({
    success: true,
    data: {
      ride,
      realtime: {
        room: getRideRoom(ride._id),
        rideId: String(ride._id),
      },
    },
  });
};

export const getRideById = async (req, res) => {
  await ensureRideParticipantAccess({
    rideId: req.params.rideId,
    role: req.auth.role,
    entityId: req.auth.sub,
  });

  const ride = await getRideDetails(req.params.rideId);

  res.json({
    success: true,
    data: ride,
  });
};

export const getMyActiveRide = async (req, res) => {
  const ride = await getActiveRideForIdentity({
    role: req.auth.role,
    entityId: req.auth.sub,
  });

  res.json({
    success: true,
    data: ride ? serializeRideRealtime(ride) : null,
  });
};

export const listMyRides = async (req, res) => {
  const rides = await listRideHistoryForIdentity({
    role: req.auth.role,
    entityId: req.auth.sub,
    limit: req.query.limit,
  });

  res.json({
    success: true,
    data: {
      results: rides,
      total: rides.length,
    },
  });
};

export const updateRideStatus = async (req, res) => {
  if (req.auth.role !== 'driver') {
    throw new ApiError(403, 'Only drivers can update ride status');
  }

  const nextStatus = String(req.body.status || '').trim().toLowerCase();

  if (![RIDE_LIVE_STATUS.ARRIVING, RIDE_LIVE_STATUS.STARTED, RIDE_LIVE_STATUS.COMPLETED].includes(nextStatus)) {
    throw new ApiError(400, 'status must be arriving, started, or completed');
  }

  const ride = await updateRideLifecycle({
    rideId: req.params.rideId,
    driverId: req.auth.sub,
    nextStatus,
  });

  res.json({
    success: true,
    data: serializeRideRealtime(ride),
  });
};

export const submitRideReview = async (req, res) => {
  if (req.auth.role !== 'user') {
    throw new ApiError(403, 'Only users can rate completed rides');
  }

  const ride = await submitRideFeedback({
    rideId: req.params.rideId,
    userId: req.auth.sub,
    rating: req.body.rating,
    comment: req.body.comment,
    tipAmount: req.body.tipAmount,
  });

  res.json({
    success: true,
    data: serializeRideRealtime(ride),
  });
};

export const getRideAppTipSettings = async (_req, res) => {
  const tipSettings = await getTipSettings();

  res.json({
    success: true,
    data: {
      settings: tipSettings,
    },
  });
};

export const cancelRide = async (req, res) => {
  const ride = await cancelRideByUser({
    rideId: req.params.rideId,
    userId: req.auth.sub,
  });

  if (!ride) {
    throw new ApiError(404, 'Ride not found');
  }

  res.json({
    success: true,
    data: {
      rideId: String(ride._id),
      status: ride.status,
      liveStatus: ride.liveStatus,
    },
  });
};

export const listAvailableDrivers = async (req, res) => {
  const { vehicleTypeId, lat, lng, maxDistance, limit = 30, transport_type } = req.query;
  const latitude = Number(lat);
  const longitude = Number(lng);
  const distance = Number(maxDistance);

  if (!vehicleTypeId) {
    throw new ApiError(400, 'vehicleTypeId is required');
  }

  if (!mongoose.Types.ObjectId.isValid(vehicleTypeId)) {
    throw new ApiError(400, 'vehicleTypeId is invalid');
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new ApiError(400, 'lat and lng are required');
  }

  const near = {
    $geometry: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
  };

  if (Number.isFinite(distance) && distance > 0) {
    near.$maxDistance = Math.min(distance, 25000);
  }

  const serviceFilter = String(transport_type || 'taxi').toLowerCase() === 'delivery'
    ? { registerFor: { $in: ['delivery', 'both'] } }
    : { registerFor: { $in: ['taxi', 'both'] } };

  const drivers = await Driver.find({
    isOnline: true,
    isOnRide: false,
    vehicleTypeId,
    ...serviceFilter,
    location: {
      $near: near,
    },
  })
    .limit(Math.min(Number(limit) || 30, 50))
    .select('name phone vehicleTypeId vehicleType vehicleIconType vehicleNumber vehicleColor vehicleMake vehicleModel rating location')
    .lean();

  let enrichedDrivers = drivers.map((driver) => {
    const distanceMeters = calculateDistanceMeters([longitude, latitude], driver.location?.coordinates || []);
    const etaMinutes = estimateEtaMinutes(distanceMeters);

    return {
      id: driver._id,
      name: driver.name,
      vehicleTypeId: driver.vehicleTypeId,
      vehicleType: driver.vehicleType,
      vehicleIconType: driver.vehicleIconType,
      vehicleNumber: driver.vehicleNumber,
      vehicleColor: driver.vehicleColor,
      vehicleMake: driver.vehicleMake,
      vehicleModel: driver.vehicleModel,
      rating: driver.rating,
      location: driver.location,
      distanceMeters,
      etaMinutes,
    };
  });

  if (enrichedDrivers.length === 0) {
    try {
      const vehicleTypeObj = await Vehicle.findById(vehicleTypeId).lean();
      const typeName = vehicleTypeObj?.name || 'Vehicle';
      const iconType = vehicleTypeObj?.icon_types || 'car';
      const mockVehicle = getMockVehicleDetails(typeName);

      const mockConfigs = [
        { name: 'Rahul Sharma', num: 'MP09AB1234', latOffset: 0.0008, lngOffset: 0.0009, rating: 4.8 },
        { name: 'Amit Patel', num: 'MP09CD5678', latOffset: -0.0012, lngOffset: 0.0005, rating: 4.9 },
        { name: 'Vikram Singh', num: 'MP09EF9012', latOffset: 0.0006, lngOffset: -0.0011, rating: 4.7 }
      ];

      enrichedDrivers = mockConfigs.map((config, index) => {
        const mockLat = latitude + config.latOffset;
        const mockLng = longitude + config.lngOffset;
        const distanceMeters = calculateDistanceMeters([longitude, latitude], [mockLng, mockLat]);
        const etaMinutes = estimateEtaMinutes(distanceMeters);

        return {
          id: `mock-driver-${index}-${vehicleTypeId}`,
          name: config.name,
          vehicleTypeId,
          vehicleType: typeName,
          vehicleIconType: iconType,
          vehicleNumber: config.num,
          vehicleColor: mockVehicle.color,
          vehicleMake: mockVehicle.make,
          vehicleModel: mockVehicle.model,
          rating: config.rating,
          location: {
            type: 'Point',
            coordinates: [mockLng, mockLat]
          },
          distanceMeters,
          etaMinutes,
        };
      });
    } catch (err) {
      console.warn('Failed to generate mock drivers:', err);
    }
  }

  const closestDriver = enrichedDrivers[0] || null;

  res.json({
    success: true,
    data: {
      totalDrivers: enrichedDrivers.length,
      closestDriverDistanceMeters: closestDriver?.distanceMeters ?? null,
      closestDriverEtaMinutes: closestDriver?.etaMinutes ?? null,
      drivers: enrichedDrivers,
    },
  });
};

export const createRazorpayRideOrder = async (req, res) => {
  const { rideId } = req.params;
  const tipAmount = Number(req.body?.tipAmount || 0);

  const ride = await Ride.findById(rideId);
  if (!ride) {
    throw new ApiError(404, 'Ride not found');
  }

  // Calculate total amount
  const totalAmount = ride.fare + tipAmount;
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    throw new ApiError(400, 'Total amount must be a positive number');
  }

  const { keyId, keySecret } = await resolveRazorpayCredentials();
  const amountPaise = Math.round(totalAmount * 100);
  // Razorpay limits receipt identifiers to 40 characters maximum
  const receipt = `r_${String(rideId).slice(-12)}_${Date.now().toString().slice(-8)}`;

  const order = await razorpayRequest({
    method: 'POST',
    path: '/orders',
    body: {
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes: { rideId: String(rideId), tipAmount: String(tipAmount) },
    },
    keyId,
    keySecret,
  });

  res.status(201).json({
    success: true,
    data: {
      keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency || 'INR',
    },
  });
};

export const verifyRazorpayRidePayment = async (req, res) => {
  const { rideId } = req.params;
  const orderId = String(req.body?.razorpay_order_id || '');
  const paymentId = String(req.body?.razorpay_payment_id || '');
  const signature = String(req.body?.razorpay_signature || '');
  const tipAmount = Number(req.body?.tipAmount || 0);

  if (!orderId || !paymentId || !signature) {
    throw new ApiError(400, 'Payment verification fields are required');
  }

  const ride = await Ride.findById(rideId);
  if (!ride) {
    throw new ApiError(404, 'Ride not found');
  }

  const { keyId, keySecret } = await resolveRazorpayCredentials();

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  if (expectedSignature !== signature) {
    throw new ApiError(400, 'Invalid payment signature');
  }

  // Fetch the order from Razorpay to verify details
  const order = await razorpayRequest({
    method: 'GET',
    path: `/orders/${encodeURIComponent(orderId)}`,
    keyId,
    keySecret,
  });

  const amountPaise = Number(order?.amount);
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
    throw new ApiError(400, 'Invalid order amount');
  }

  const verifiedAmount = Math.round(amountPaise) / 100;
  // Ensure the amount matches ride.fare + tipAmount (allow slight rounding issues)
  const expectedAmount = ride.fare + tipAmount;
  if (Math.abs(verifiedAmount - expectedAmount) > 0.05) {
    throw new ApiError(400, 'Payment amount mismatch');
  }

  // Update ride payment status
  ride.paymentStatus = 'paid';
  ride.paymentMethod = 'online';
  if (tipAmount > 0) {
    ride.feedback = ride.feedback || {};
    ride.feedback.tipAmount = tipAmount;
  }
  await ride.save();

  // Start matching/dispatching drivers if the booking is newly created upfront
  if (['pending', 'searching'].includes(ride.status) && !ride.driverId) {
    const { startDispatchFlow } = await import('../../services/dispatchService.js');
    await startDispatchFlow(ride);
  }

  // Try settling wallet for the driver
  let walletUpdate = null;
  if (!ride.walletSettledAt && ride.status === 'completed') {
    walletUpdate = await settleCompletedRideWallet({ rideId: ride._id });
  }

  // Emit status update and ride state via Socket.io
  const io = getIO();
  if (io) {
    const room = getRideRoom(ride._id);
    const updatedRide = await getRideDetails(ride._id);
    const realtimePayload = serializeRideRealtime(updatedRide);

    const statusPayload = {
      rideId: String(ride._id),
      status: ride.status,
      liveStatus: ride.liveStatus,
      paymentStatus: ride.paymentStatus,
      acceptedAt: ride.acceptedAt,
      startedAt: ride.startedAt,
      completedAt: ride.completedAt,
    };

    io.to(room).emit(SOCKET_EVENTS.RIDE_STATUS_UPDATED, statusPayload);
    io.to(room).emit(SOCKET_EVENTS.RIDE_STATE, realtimePayload);

    // Notify driver about wallet update if they are connected
    if (walletUpdate && ride.driverId) {
      const { getDriverRoom } = await import('../../services/dispatchService.js');
      io.to(getDriverRoom(ride.driverId)).emit('driver:wallet:updated', {
        wallet: walletUpdate.wallet,
        transaction: walletUpdate.transaction,
      });
    }
  }

  res.json({
    success: true,
    data: serializeRideRealtime(ride),
  });
};

import { findZoneByPickup } from '../../services/matchingService.js';

export const checkZoneByCoords = async (req, res) => {
  const { lat, lng } = req.query;
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new ApiError(400, 'lat and lng are required');
  }

  const zone = await findZoneByPickup([longitude, latitude]);

  res.json({
    success: true,
    data: {
      inZone: !!zone,
      zone: zone || null,
    },
  });
};

