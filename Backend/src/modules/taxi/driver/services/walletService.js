import mongoose from 'mongoose';
import { env } from '../../../../config/env.js';
import { ApiError } from '../../../../utils/ApiError.js';
import { SetPrice } from '../../admin/models/SetPrice.js';
import { Driver } from '../models/Driver.js';
import { WalletTransaction } from '../models/WalletTransaction.js';
import { Ride } from '../../user/models/Ride.js';
import { getWalletSettings } from '../../services/appSettingsService.js';
import { WithdrawalRequest } from '../../admin/models/WithdrawalRequest.js';

const normalizeAmount = (value, fieldName = 'amount') => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    throw new ApiError(400, `${fieldName} must be a valid number`);
  }

  return Math.round(amount * 100) / 100;
};

const normalizePaymentMethod = (value) => (
  String(value || '').trim().toLowerCase() === 'cash' ? 'cash' : 'online'
);

const normalizeCommissionType = (value) => {
  const numericValue = Number(value);
  return numericValue === 1 ? 'percentage' : 'fixed';
};

const computeCommissionAmount = ({ fare, type, value }) => {
  const safeFare = normalizeAmount(fare, 'fare');
  const safeValue = Math.max(normalizeAmount(value || 0, 'commission'), 0);

  if (normalizeCommissionType(type) === 'percentage') {
    return Math.min(Math.round((safeFare * safeValue)) / 100, safeFare);
  }

  return Math.min(safeValue, safeFare);
};

export const extractAdminCommission = (setPrice, { isParcel = false, weightLabel = 'Under 5kg', fallbackPercent = 20 } = {}) => {
  const defaultVal = Number(fallbackPercent || 0);

  if (!setPrice) {
    return { type: 1, value: defaultVal };
  }

  if (isParcel && Array.isArray(setPrice.parcel_weight_ranges) && setPrice.parcel_weight_ranges.length > 0) {
    const normWeight = String(weightLabel || 'Under 5kg').trim().toLowerCase();
    const weightRule = setPrice.parcel_weight_ranges.find(
      r => String(r.weight_range || '').trim().toLowerCase() === normWeight
    ) || setPrice.parcel_weight_ranges[0];

    if (weightRule) {
      const commVal = Number(weightRule.admin_commission ?? weightRule.admin_commision ?? weightRule.driver_commission ?? 0);
      if (Number.isFinite(commVal) && commVal > 0) {
        const commType = Number(weightRule.admin_commission_type ?? weightRule.admin_commision_type ?? 1);
        return { type: commType, value: commVal };
      }
    }
  }

  const candidates = [
    { type: setPrice.admin_commission_type_from_driver, value: setPrice.admin_commission_from_driver },
    { type: setPrice.admin_commision_type, value: setPrice.admin_commision },
    { type: setPrice.admin_commission_type, value: setPrice.admin_commission },
    { type: setPrice.driver_commission_type, value: setPrice.driver_commission },
    { type: setPrice.customer_commission_type, value: setPrice.customer_commission },
    { type: setPrice.admin_commission_type_for_owner, value: setPrice.admin_commission_for_owner },
  ];

  for (const cand of candidates) {
    const val = Number(cand.value);
    if (Number.isFinite(val) && val > 0) {
      const tVal = cand.type === 'percentage' ? 1 : (cand.type === 'fixed' || cand.type === 0 || cand.type === '0' ? 0 : Number(cand.type ?? 1));
      return { type: tVal, value: val };
    }
  }

  return { type: 1, value: defaultVal };
};

const resolveCommissionConfigForRide = async (ride, session) => {
  const isParcelRide = (ride?.serviceType || 'ride') === 'parcel' || String(ride?.transport_type || '').toLowerCase() === 'delivery';
  const weightLabel = ride?.parcel?.weight || 'Under 5kg';
  const fallbackPercent = Number(env.driverWallet?.commissionPercent || 20);

  if (ride?.pricingSnapshot?.admin_commission_from_driver !== undefined && Number(ride.pricingSnapshot.admin_commission_from_driver) > 0) {
    return {
      source: ride.pricingSnapshot?.setPriceId ? 'ride_snapshot' : 'ride_snapshot_fallback',
      type: Number(ride.pricingSnapshot?.admin_commission_type_from_driver ?? 1),
      value: Number(ride.pricingSnapshot?.admin_commission_from_driver ?? 0),
    };
  }

  if (ride?.vehicleTypeId) {
    const normalizedTransportType = String(ride.transport_type || 'taxi').trim().toLowerCase() || 'taxi';
    const filters = [
      {
        vehicle_type: ride.vehicleTypeId,
        active: 1,
        status: 'active',
        ...(ride.service_location_id ? { service_location_id: ride.service_location_id } : {}),
        transport_type: normalizedTransportType,
      },
      {
        vehicle_type: ride.vehicleTypeId,
        active: 1,
        status: 'active',
        ...(ride.service_location_id ? { service_location_id: ride.service_location_id } : {}),
        transport_type: 'both',
      },
      {
        vehicle_type: ride.vehicleTypeId,
        active: 1,
        status: 'active',
        transport_type: normalizedTransportType,
      },
      {
        vehicle_type: ride.vehicleTypeId,
        active: 1,
        status: 'active',
        transport_type: 'both',
      },
    ];

    for (const filter of filters) {
      const setPrice = await SetPrice.findOne(filter).sort({ updatedAt: -1, createdAt: -1 }).session(session).lean();
      if (setPrice) {
        const extracted = extractAdminCommission(setPrice, { isParcel: isParcelRide, weightLabel, fallbackPercent });
        return {
          source: 'set_price_lookup',
          type: extracted.type,
          value: extracted.value,
          setPriceId: setPrice._id,
        };
      }
    }
  }

  return {
    source: 'env_fallback',
    type: 1,
    value: fallbackPercent,
  };
};

const toNonNegativeNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : fallback;
};

const isEnabledSetting = (value, fallback = true) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
};

const resolveWalletRules = async () => {
  const walletSettings = await getWalletSettings();
  const configuredMinimumBalance = Number(walletSettings.driver_wallet_minimum_amount_to_get_an_order);
  const minimumBalanceForOrders = Number.isFinite(configuredMinimumBalance)
    ? Math.round(configuredMinimumBalance * 100) / 100
    : -toNonNegativeNumber(env.driverWallet.defaultCashLimit, 500);

  return {
    minimumBalanceForOrders,
    cashLimit: Math.abs(Math.min(minimumBalanceForOrders, 0)),
    minimumTopUpAmount: toNonNegativeNumber(walletSettings.minimum_amount_added_to_wallet, 0),
    minimumTransferAmount: toNonNegativeNumber(walletSettings.minimum_wallet_amount_for_transfer, 0),
    isWalletEnabled: isEnabledSetting(walletSettings.show_wallet_feature_for_driver, true),
    isTransferEnabled: isEnabledSetting(walletSettings.enable_wallet_transfer_driver, true),
  };
};

const getWalletSnapshot = async (driver) => {
  const rules = await resolveWalletRules();
  const balance = Number(driver?.wallet?.balance || 0);

  return {
    balance,
    cashLimit: rules.cashLimit,
    minimumBalanceForOrders: rules.minimumBalanceForOrders,
    availableForOrders: Math.round((balance - rules.minimumBalanceForOrders) * 100) / 100,
    isBlocked: Boolean(driver?.wallet?.isBlocked),
    rules,
  };
};

export const serializeDriverWallet = async (driver) => {
  const wallet = await getWalletSnapshot(driver);

  return {
    balance: wallet.balance,
    cashLimit: wallet.cashLimit,
    minimumBalanceForOrders: wallet.minimumBalanceForOrders,
    availableForOrders: wallet.availableForOrders,
    isWalletEnabled: wallet.rules.isWalletEnabled,
    isTransferEnabled: wallet.rules.isTransferEnabled,
    minimumTopUpAmount: wallet.rules.minimumTopUpAmount,
    minimumTransferAmount: wallet.rules.minimumTransferAmount,
    isBlocked: wallet.isBlocked || !wallet.rules.isWalletEnabled || wallet.balance < wallet.minimumBalanceForOrders,
  };
};

export const ensureDriverWalletCanAcceptRide = async (driverOrId, { session } = {}) => {
  const driver =
    typeof driverOrId === 'object' && driverOrId?._id
      ? driverOrId
      : await Driver.findById(driverOrId).session(session);

  if (!driver) {
    throw new ApiError(404, 'Driver not found');
  }

  const wallet = await getWalletSnapshot(driver);
  const isBlocked = wallet.isBlocked || !wallet.rules.isWalletEnabled || wallet.balance < wallet.minimumBalanceForOrders;

  if (isBlocked) {
    await Driver.findByIdAndUpdate(driver._id, {
      'wallet.cashLimit': wallet.cashLimit,
      'wallet.isBlocked': true,
    });
    throw new ApiError(403, wallet.rules.isWalletEnabled
      ? 'Driver wallet minimum balance is not met. Please top up to accept rides.'
      : 'Driver wallet is disabled by admin.');
  }

  if (Number(driver?.wallet?.cashLimit) !== wallet.cashLimit || driver?.wallet?.isBlocked) {
    await Driver.findByIdAndUpdate(driver._id, {
      'wallet.cashLimit': wallet.cashLimit,
      'wallet.isBlocked': false,
    });
  }

  return wallet;
};

export const applyDriverWalletAdjustment = async ({
  driverId,
  amount,
  type,
  rideId = null,
  description = '',
  metadata = {},
  session = null,
}) => {
  const normalizedAmount = normalizeAmount(amount);

  if (!normalizedAmount) {
    throw new ApiError(400, 'Wallet adjustment amount cannot be zero');
  }

  const driver = await Driver.findById(driverId).session(session);

  if (!driver) {
    throw new ApiError(404, 'Driver not found');
  }

  const before = await getWalletSnapshot(driver);
  const balanceAfter = Math.round((before.balance + normalizedAmount) * 100) / 100;
  const isBlockedAfter = !before.rules.isWalletEnabled || balanceAfter < before.minimumBalanceForOrders;

  const updatedDriver = await Driver.findByIdAndUpdate(
    driverId,
    {
      $inc: { 'wallet.balance': normalizedAmount },
      $set: {
        'wallet.cashLimit': before.cashLimit,
        'wallet.isBlocked': isBlockedAfter,
      },
    },
    { new: true, session },
  );

  const [transaction] = await WalletTransaction.create(
    [
      {
        driverId,
        rideId,
        type,
        amount: normalizedAmount,
        balanceBefore: before.balance,
        balanceAfter,
        cashLimit: before.cashLimit,
        isBlockedAfter,
        description,
        metadata,
      },
    ],
    { session },
  );

  return {
    driver: updatedDriver,
    wallet: await serializeDriverWallet(updatedDriver),
    transaction,
  };
};

export const topUpDriverWallet = async ({ driverId, amount, metadata = {} }) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const walletSettings = await getWalletSettings();
    if (!isEnabledSetting(walletSettings.show_wallet_feature_for_driver, true)) {
      throw new ApiError(403, 'Driver wallet is disabled by admin');
    }

    const minimumTopUpAmount = toNonNegativeNumber(walletSettings.minimum_amount_added_to_wallet, 0);
    const normalizedTopUpAmount = Math.abs(normalizeAmount(amount));

    if (minimumTopUpAmount > 0 && normalizedTopUpAmount < minimumTopUpAmount) {
      throw new ApiError(400, `amount must be at least ${minimumTopUpAmount}`);
    }

    const result = await applyDriverWalletAdjustment({
      driverId,
      amount: normalizedTopUpAmount,
      type: 'top_up',
      description: 'Driver wallet top-up',
      metadata: {
        ...metadata,
        minimumTopUpAmount,
      },
      session,
    });

    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const settleCompletedRideWallet = async ({ rideId }) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const ride = await Ride.findOneAndUpdate(
      { _id: rideId, walletSettledAt: null, driverId: { $ne: null } },
      { $set: { walletSettledAt: new Date() } },
      { new: true, session },
    );

    if (!ride) {
      await session.commitTransaction();
      return null;
    }

    const fare = normalizeAmount(ride.fare || 0, 'fare');
    const commissionConfig = await resolveCommissionConfigForRide(ride, session);
    const commissionAmount = computeCommissionAmount({
      fare,
      type: commissionConfig.type,
      value: commissionConfig.value,
    });
    const paymentMethod = normalizePaymentMethod(ride.paymentMethod);
    const driverEarnings = Math.max(Math.round((fare - commissionAmount) * 100) / 100, 0);
    const amount = paymentMethod === 'cash' ? -commissionAmount : driverEarnings;
    const type = paymentMethod === 'cash' ? 'commission_deduction' : 'ride_earning';

    ride.paymentMethod = paymentMethod;
    ride.commissionAmount = commissionAmount;
    ride.driverEarnings = driverEarnings;
    ride.pricingSnapshot = {
      setPriceId: ride.pricingSnapshot?.setPriceId || commissionConfig.setPriceId || null,
      admin_commission_type_from_driver: Number(commissionConfig.type ?? ride.pricingSnapshot?.admin_commission_type_from_driver ?? 1),
      admin_commission_from_driver: Number(commissionConfig.value ?? ride.pricingSnapshot?.admin_commission_from_driver ?? 0),
      resolvedAt: ride.pricingSnapshot?.resolvedAt || new Date(),
    };
    await ride.save({ session });

    if (!amount) {
      await session.commitTransaction();
      return null;
    }

    const result = await applyDriverWalletAdjustment({
      driverId: ride.driverId,
      rideId: ride._id,
      amount,
      type,
      description: paymentMethod === 'cash'
        ? 'Commission deducted for cash ride'
        : 'Driver earning credited for online ride',
      metadata: {
        fare,
        commissionAmount,
        driverEarnings,
        paymentMethod,
        commissionSource: commissionConfig.source,
        commissionType: normalizeCommissionType(commissionConfig.type),
        commissionValue: Number(commissionConfig.value || 0),
      },
      session,
    });

    await session.commitTransaction();
    return {
      ...result,
      ride,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const listMyWithdrawalRequests = async ({ driverId, limit = 50 }) => {
  const withdrawals = await WithdrawalRequest.find({ driver_id: driverId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return withdrawals;
};

export const requestDriverWalletWithdrawal = async ({
  driverId,
  amount,
  paymentMethod = 'UPI',
  upiId = '',
  accountNumber = '',
  ifscCode = '',
  bankName = '',
  accountHolderName = '',
  notes = '',
}) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const walletSettings = await getWalletSettings();
    const minimumTransferAmount = Number(walletSettings?.minimum_wallet_amount_for_transfer || 100);
    const normalizedAmount = Math.abs(normalizeAmount(amount));

    if (normalizedAmount < minimumTransferAmount) {
      throw new ApiError(400, `Minimum withdrawal amount is Rs ${minimumTransferAmount}`);
    }

    const driver = await Driver.findById(driverId).session(session);
    if (!driver) {
      throw new ApiError(404, 'Driver not found');
    }

    const currentBalance = Number(driver.wallet?.balance || 0);

    if (normalizedAmount > currentBalance) {
      throw new ApiError(400, `Insufficient wallet balance. Current balance is Rs ${currentBalance}`);
    }

    const paymentMethodLabel = paymentMethod === 'UPI' && upiId
      ? `UPI (${upiId})`
      : paymentMethod === 'Bank Transfer' && accountNumber
        ? `Bank Transfer (${accountNumber})`
        : paymentMethod || 'UPI/Bank';

    const [withdrawal] = await WithdrawalRequest.create(
      [
        {
          transactionId: `WD${Date.now()}`,
          driver_id: driverId,
          amount: normalizedAmount,
          payment_method: paymentMethodLabel,
          status: 'pending',
          metadata: {
            paymentMethod,
            upiId,
            accountNumber,
            ifscCode,
            bankName,
            accountHolderName,
            notes,
          },
        },
      ],
      { session },
    );

    const result = await applyDriverWalletAdjustment({
      driverId,
      amount: -normalizedAmount,
      type: 'withdrawal_request',
      description: `Withdrawal request (${paymentMethodLabel})`,
      metadata: {
        withdrawalId: String(withdrawal._id),
        transactionId: withdrawal.transactionId,
        paymentMethod: paymentMethodLabel,
        upiId,
        accountNumber,
      },
      session,
    });

    await session.commitTransaction();

    return {
      ...result,
      withdrawal,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

