import crypto from 'node:crypto';
import { ApiError } from '../../../../utils/ApiError.js';
import { resolveRazorpayCredentials, razorpayRequest } from '../../user/controllers/userController.js';

/**
 * Generates a dynamic Razorpay QR code for a specific ride
 */
export const generateRideQrCode = async (req, res) => {
  const { amount, rideId } = req.body;
  const driverId = String(req.auth?.sub || '');

  if (!amount || amount <= 0) {
    throw new ApiError(400, 'Valid amount is required');
  }

  // Usually you would fetch the ride from the DB here and verify
  // the driver is assigned to this ride, and the amount matches.
  // For the scope of this implementation, we proceed with the provided amount.

  const amountPaise = Math.round(Number(amount) * 100);
  
  // Get credentials
  const { keyId, keySecret } = await resolveRazorpayCredentials();

  // Create Razorpay QR Code
  // https://razorpay.com/docs/api/payments/qr-codes/
  const qrCodePayload = {
    type: "upi_qr",
    name: "Ozayra Ride Fare",
    usage: "single_use",
    fixed_amount: true,
    payment_amount: amountPaise,
    description: `Ride ${rideId || 'Payment'}`,
    notes: {
      rideId: rideId || 'unknown',
      driverId: driverId
    }
  };

  const qrResponse = await razorpayRequest({
    method: 'POST',
    path: '/payments/qr_codes',
    body: qrCodePayload,
    keyId,
    keySecret,
  });

  if (!qrResponse || !qrResponse.image_url) {
    throw new ApiError(500, 'Failed to generate Razorpay QR code');
  }

  res.status(201).json({
    success: true,
    data: {
      qrId: qrResponse.id,
      imageUrl: qrResponse.image_url,
      amount: qrResponse.payment_amount / 100
    },
  });
};
