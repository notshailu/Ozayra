import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MessageSquare,
    Phone,
    ShieldAlert,
    Check,
    Banknote,
    Wallet,
    QrCode,
    Scan,
    ChevronRight,
    Star,
    CheckCircle2,
    Package,
    User,
    ArrowLeft,
    Clock3,
    MapPinned,
} from 'lucide-react';
import QRCode from "react-qr-code";
import { initRazorpayPayment } from '@food/utils/razorpay';
import { useNavigate, useLocation } from 'react-router-dom';
import { GoogleMap, MarkerF, OverlayView, PolylineF } from '@react-google-maps/api';
import { HAS_VALID_GOOGLE_MAPS_KEY, useAppGoogleMapsLoader } from '../../admin/utils/googleMaps';
import { socketService } from '../../../shared/api/socket';
import api from '../../../shared/api/axiosInstance';
import carIcon from '../../../assets/icons/car.webp';
import bikeIcon from '../../../assets/icons/bike.webp';
import autoIcon from '../../../assets/icons/auto.webp';
import deliveryIcon from '../../../assets/icons/Delivery.webp';
import { getLocalDriverToken } from '../services/registrationService';

const MAP_CONTAINER_STYLE = {
    width: '100%',
    height: '100%',
};

const DEFAULT_CENTER = { lat: 22.7196, lng: 75.8577 };
const DEFAULT_DRIVER_COORDS = [75.8577, 22.7196];

const RAPIDO_MAP_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#f8fafc' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#475569' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f8fafc', weight: 4 }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffffff', weight: 2 }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f1f5f9', weight: 3 }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#e2e8f0', weight: 1 }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e2e8f0' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const getDriverVehicleIcon = (driverObj, isParcel) => {
    const iconType = String(driverObj?.vehicleIconType || driverObj?.vehicleType || '').toLowerCase();
    if (isParcel && !iconType.includes('truck') && !iconType.includes('auto') && !iconType.includes('bike')) return '/5_Parcel.png';
    if (iconType.includes('bike') || iconType.includes('motorcycle')) return '/1_Bike.png';
    if (iconType.includes('auto') || iconType.includes('rickshaw')) return '/2_AutoRickshaw.png';
    if (iconType.includes('ehc')) return '/ehcv.png';
    if (iconType.includes('hcv')) return '/hcv.png';
    if (iconType.includes('lcv')) return '/LCV.png';
    if (iconType.includes('mcv')) return '/mcv.png';
    if (iconType.includes('truck')) return '/truck.png';
    if (iconType.includes('lux')) return '/Luxury.png';
    if (iconType.includes('premium')) return '/Premium.png';
    if (iconType.includes('suv')) return '/SUV.png';
    return '/4_Taxi.png';
};

const toLatLng = (coordinates, fallback = DEFAULT_CENTER) => {
    const [lng, lat] = coordinates || [];

    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
        return { lat: Number(lat), lng: Number(lng) };
    }

    return fallback;
};

const createOffsetPosition = (position, latOffset = -0.0045, lngOffset = -0.0035) => ({
    lat: Number(position?.lat ?? DEFAULT_CENTER.lat) + latOffset,
    lng: Number(position?.lng ?? DEFAULT_CENTER.lng) + lngOffset,
});

const arePositionsNearlyEqual = (first, second, threshold = 0.0002) => (
    Math.abs(Number(first?.lat ?? 0) - Number(second?.lat ?? 0)) < threshold &&
    Math.abs(Number(first?.lng ?? 0) - Number(second?.lng ?? 0)) < threshold
);

const formatAddressFromPoint = (point, fallback) => {
    const [lng, lat] = point?.coordinates || [];

    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
        return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
    }

    return fallback;
};

const normalizeTripType = (job = {}) => {
    const value = String(job.type || job.serviceType || 'ride').toLowerCase();
    if (value === 'parcel') return 'parcel';
    if (value === 'intercity') return 'intercity';
    return 'ride';
};

const getTripTitle = (type) => {
    if (type === 'parcel') return 'Delivery';
    if (type === 'intercity') return 'Intercity Ride';
    return 'Taxi Ride';
};

const buildFallbackRoute = (origin, destination) => [origin, destination];
const toRadians = (value) => (Number(value) * Math.PI) / 180;
const DRIVER_ICON_ROTATION_OFFSET = 0;

const getDistanceMeters = (first, second) => {
    const lat1 = toRadians(first?.lat || 0);
    const lat2 = toRadians(second?.lat || 0);
    const deltaLat = toRadians((second?.lat || 0) - (first?.lat || 0));
    const deltaLng = toRadians((second?.lng || 0) - (first?.lng || 0));
    const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

    return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getPathDistanceMeters = (path = []) => path.slice(1).reduce(
    (total, point, index) => total + getDistanceMeters(path[index], point),
    0,
);

const formatEta = (distanceMeters, phase) => {
    if (phase === 'otp_verification' || phase === 'payment_confirm' || phase === 'review') {
        return '--';
    }

    if (!Number.isFinite(distanceMeters) || distanceMeters <= 20) {
        return 'Arriving';
    }

    const metersPerMinute = phase === 'to_pickup' ? 420 : 520;
    return `${Math.max(1, Math.ceil(distanceMeters / metersPerMinute))} mins`;
};

const getTripStageMeta = (phase) => ({
    to_pickup: { stage: 'To Pickup', route: 'Pickup First' },
    otp_verification: { stage: 'Verify OTP', route: 'At Pickup' },
    in_trip: { stage: 'On Trip', route: 'To Destination' },
    payment_confirm: { stage: 'Collect Pay', route: 'Payment' },
    review: { stage: 'Complete', route: 'Finished' },
}[phase] || { stage: 'Active', route: 'Route' });

const interpolatePosition = (start, end, ratio) => ({
    lat: Number(start.lat) + (Number(end.lat) - Number(start.lat)) * ratio,
    lng: Number(start.lng) + (Number(end.lng) - Number(start.lng)) * ratio,
});

const getBearingDegrees = (start, end) => {
    if (!start || !end || arePositionsNearlyEqual(start, end, 0.000001)) {
        return null;
    }

    const startLat = toRadians(start.lat);
    const endLat = toRadians(end.lat);
    const deltaLng = toRadians(Number(end.lng) - Number(start.lng));
    const y = Math.sin(deltaLng) * Math.cos(endLat);
    const x =
        Math.cos(startLat) * Math.sin(endLat) -
        Math.sin(startLat) * Math.cos(endLat) * Math.cos(deltaLng);
    const bearing = (Math.atan2(y, x) * 180) / Math.PI;

    return (bearing + 360) % 360;
};

const buildSimulationRoute = (path, minimumSteps = 90) => {
    const cleanPath = (path || []).filter((point) =>
        Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng)),
    );

    if (cleanPath.length <= 1) {
        return cleanPath;
    }

    const segmentDistances = cleanPath.slice(1).map((point, index) => getDistanceMeters(cleanPath[index], point));
    const totalDistance = segmentDistances.reduce((sum, distance) => sum + distance, 0);

    if (!totalDistance) {
        return cleanPath;
    }

    const steps = Math.max(minimumSteps, Math.min(180, Math.ceil(totalDistance / 18)));
    const result = [];

    for (let step = 0; step <= steps; step += 1) {
        const targetDistance = (totalDistance * step) / steps;
        let walked = 0;

        for (let segmentIndex = 0; segmentIndex < segmentDistances.length; segmentIndex += 1) {
            const segmentDistance = segmentDistances[segmentIndex];
            const nextWalked = walked + segmentDistance;

            if (targetDistance <= nextWalked || segmentIndex === segmentDistances.length - 1) {
                const ratio = segmentDistance ? (targetDistance - walked) / segmentDistance : 0;
                result.push(interpolatePosition(cleanPath[segmentIndex], cleanPath[segmentIndex + 1], Math.min(Math.max(ratio, 0), 1)));
                break;
            }

            walked = nextWalked;
        }
    }

    return result;
};

const unwrapApiPayload = (response) => response?.data?.data || response?.data || response;
const withDriverAuthorization = (token) => (
    token
        ? {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
        : {}
);

const getCurrentCoords = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
        reject(new Error('Location is not available on this device.'));
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => reject(new Error('Please allow location permission to continue tracking.')),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
});

const ActiveTrip = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const routeState = useMemo(() => location.state || {}, [location.state]);
    const [hydratedTripState, setHydratedTripState] = useState(null);
    const [isHydratingTrip, setIsHydratingTrip] = useState(!routeState?.rideId && !routeState?.request?.rideId);

    useEffect(() => {
        let active = true;

        if (routeState?.rideId || routeState?.request?.rideId) {
            setIsHydratingTrip(false);
            return () => {
                active = false;
            };
        }

        const hydrateTripState = async () => {
            try {
                const driverToken = getLocalDriverToken();
                const [activeDelivery, activeRide] = await Promise.allSettled([
                    api.get('/deliveries/active/me', withDriverAuthorization(driverToken)),
                    api.get('/rides/active/me', withDriverAuthorization(driverToken)),
                ]);

                if (!active) {
                    return;
                }

                const deliveryPayload =
                    activeDelivery.status === 'fulfilled' ? unwrapApiPayload(activeDelivery.value) : null;
                const ridePayload =
                    activeRide.status === 'fulfilled' ? unwrapApiPayload(activeRide.value) : null;

                const currentJob = deliveryPayload?.rideId
                    ? deliveryPayload
                    : ridePayload?.rideId
                        ? ridePayload
                        : null;

                if (!currentJob?.rideId) {
                    navigate('/taxi/driver/home', { replace: true });
                    return;
                }

                const currentType = normalizeTripType(currentJob);

                setHydratedTripState({
                    type: currentType,
                    rideId: currentJob.rideId,
                    request: {
                        type: currentType,
                        title: getTripTitle(currentType),
                        fare: `Rs ${currentJob.fare || 0}`,
                        payment: currentJob.paymentMethod || 'Cash',
                        pickup: currentJob.pickupAddress || formatAddressFromPoint(currentJob.pickupLocation, 'Pickup Location'),
                        drop: currentJob.dropAddress || formatAddressFromPoint(currentJob.dropLocation, 'Drop Location'),
                        requestId: currentJob.rideId,
                        rideId: currentJob.rideId,
                        raw: currentJob,
                    },
                    currentDriverCoords: currentJob.lastDriverLocation?.coordinates || null,
                });
            } catch {
                if (active) {
                    navigate('/taxi/driver/home', { replace: true });
                }
            } finally {
                if (active) {
                    setIsHydratingTrip(false);
                }
            }
        };

        hydrateTripState();

        return () => {
            active = false;
        };
    }, [navigate, routeState]);

    const effectiveState = hydratedTripState || routeState;

    const tripType = effectiveState?.type || 'ride';
    const isParcel = tripType === 'parcel';
    const liveRequest = effectiveState?.request || {};
    const liveRaw = liveRequest.raw || {};
    const rideId = liveRequest?.rideId || effectiveState?.rideId || '';

    const pickupCoords = liveRaw.pickupLocation?.coordinates || effectiveState?.pickupCoords || DEFAULT_DRIVER_COORDS;
    const dropCoords = useMemo(
        () => liveRaw.dropLocation?.coordinates || effectiveState?.dropCoords || [75.8937, 22.7533],
        [effectiveState?.dropCoords, liveRaw.dropLocation?.coordinates],
    );
    const assignedDriverCoords =
        liveRaw.driverLocation?.coordinates ||
        liveRequest.driverLocation?.coordinates ||
        effectiveState?.driverCoords ||
        effectiveState?.currentDriverCoords ||
        null;

    const pickupPosition = useMemo(() => toLatLng(pickupCoords), [pickupCoords]);
    const dropPosition = useMemo(() => toLatLng(dropCoords), [dropCoords]);
    const initialDriverPosition = useMemo(
        () => assignedDriverCoords ? toLatLng(assignedDriverCoords, pickupPosition) : createOffsetPosition(pickupPosition),
        [assignedDriverCoords, pickupPosition],
    );

    const [phase, setPhase] = useState('to_pickup');
    const [otp, setOtp] = useState(['', '', '', '']);
    const [otpError, setOtpError] = useState('');
    const [userImageBroken, setUserImageBroken] = useState(false);
    const [selectedRating, setSelectedRating] = useState(0);
    const [driverPaymentStatus, setDriverPaymentStatus] = useState('pending');
    const [selectedPaymentMode, setSelectedPaymentMode] = useState('');
    const [map, setMap] = useState(null);
    const [driverPosition, setDriverPosition] = useState(initialDriverPosition);
    const [driverHeading, setDriverHeading] = useState(0);
    const driverPositionRef = useRef(initialDriverPosition);
    const driverHeadingRef = useRef(0);
    const [routePath, setRoutePath] = useState([]);
    const [routeError, setRouteError] = useState('');
    const [isSimulatingMovement, setIsSimulatingMovement] = useState(false);
    const [simulationRoute, setSimulationRoute] = useState([]);
    const [simulationStep, setSimulationStep] = useState(0);
    const simulationActiveRef = useRef(false);
    const { isLoaded, loadError } = useAppGoogleMapsLoader();

    const activeDestination = phase === 'to_pickup' || phase === 'otp_verification' ? pickupPosition : dropPosition;
    const canSimulateMovement = phase === 'to_pickup' || phase === 'in_trip';
    const visibleRoutePath = useMemo(() => {
        if (!isSimulatingMovement || simulationRoute.length <= 1) {
            return routePath;
        }

        return [driverPosition, ...simulationRoute.slice(simulationStep + 1)];
    }, [driverPosition, isSimulatingMovement, routePath, simulationRoute, simulationStep]);

    const simulationProgress = useMemo(() => {
        if (!simulationRoute.length) return 0;
        return Math.min(100, Math.round((simulationStep / Math.max(simulationRoute.length - 1, 1)) * 100));
    }, [simulationRoute.length, simulationStep]);
    const remainingDistanceMeters = useMemo(
        () => getPathDistanceMeters(visibleRoutePath.length > 1 ? visibleRoutePath : [driverPosition, activeDestination]),
        [activeDestination, driverPosition, visibleRoutePath],
    );
    const tripStageMeta = useMemo(() => getTripStageMeta(phase), [phase]);
    const tripStats = useMemo(() => ([
        {
            label: 'Trip Stage',
            value: tripStageMeta.stage,
            icon: null,
        },
        {
            label: 'ETA',
            value: formatEta(remainingDistanceMeters, phase),
            icon: Clock3,
            iconClassName: 'text-orange-500',
        },
        {
            label: 'Route',
            value: tripStageMeta.route,
            icon: MapPinned,
            iconClassName: 'text-slate-500',
        },
    ]), [phase, remainingDistanceMeters, tripStageMeta]);

    const tripData = isParcel ? {
        sender: {
            name: liveRaw.parcel?.senderName || 'Sender',
            rating: '5.0',
            phone: liveRaw.parcel?.senderMobile || '',
        },
        receiver: {
            name: liveRaw.parcel?.receiverName || 'Receiver',
            phone: liveRaw.parcel?.receiverMobile || '',
        },
        pickup: liveRaw.pickupAddress || liveRequest?.pickup || formatAddressFromPoint(liveRaw.pickupLocation, 'Flat 402, Swamclose Apts, JP Nagar'),
        drop: liveRaw.dropAddress || liveRequest?.drop || formatAddressFromPoint(liveRaw.dropLocation, 'Tea Villa Cafe, 12th Main, HSR Layout'),
        fare: `₹${liveRaw.fare || effectiveState?.fare || 120}`,
        payment: effectiveState?.paymentMethod || 'Online',
        distance: liveRaw.distance || liveRequest?.distance || '4.2 km'
    } : {
        user: {
            name: liveRaw.user?.name || liveRequest?.user?.name || 'Passenger',
            rating: liveRaw.user?.rating || liveRequest?.user?.rating || '4.8',
            phone: liveRaw.user?.phone || liveRequest?.user?.phone || '',
            profileImage: liveRaw.user?.profileImage || liveRequest?.user?.profileImage || liveRaw.user?.profile_picture || liveRaw.user?.photo || '',
        },
        pickup: liveRaw.pickupAddress || liveRequest?.pickup || formatAddressFromPoint(liveRaw.pickupLocation, 'Swamclose Apartments, JP Nagar'),
        drop: liveRaw.dropAddress || liveRequest?.drop || formatAddressFromPoint(liveRaw.dropLocation, 'Tea Villa Cafe, HSR Layout'),
        fare: `₹${liveRaw.fare || effectiveState?.fare || 120}`,
        payment: liveRequest?.payment || effectiveState?.paymentMethod || 'Online',
        distance: liveRaw.distance || liveRequest?.distance || '4.2 km'
    };

    const displayFare = liveRequest?.fare || tripData.fare;
    const expectedOtp = String(liveRequest?.raw?.otp || liveRequest?.otp || effectiveState?.otp || '1234');
    const activeDriver = liveRaw?.driver || liveRequest?.driver || {};
    const currentVehicleIcon = useMemo(() => getDriverVehicleIcon(activeDriver, isParcel), [activeDriver, isParcel]);

    useEffect(() => {
        if (!liveRaw) return;

        const currentStatus = String(liveRaw.status || '').toLowerCase();
        const currentLiveStatus = String(liveRaw.liveStatus || '').toLowerCase();

        if (currentStatus === 'ongoing' || currentLiveStatus === 'started') {
            setPhase((prevPhase) => prevPhase !== 'in_trip' && prevPhase !== 'payment_confirm' && prevPhase !== 'review' ? 'in_trip' : prevPhase);
        } else if (currentStatus === 'completed') {
            const isPaymentPending = String(liveRaw.paymentStatus || '').toLowerCase() === 'pending' || String(liveRequest?.paymentStatus || '').toLowerCase() === 'pending' || driverPaymentStatus === 'pending';
            setPhase(isPaymentPending ? 'payment_confirm' : 'review');
        } else if (currentLiveStatus === 'arriving') {
            setPhase((prevPhase) => prevPhase === 'to_pickup' ? 'otp_verification' : prevPhase);
        }
    }, [driverPaymentStatus, liveRaw, liveRequest?.paymentStatus]);

    const publishRideStatus = useCallback((nextStatus, paymentMethod = null) => {
        if (!rideId) {
            return;
        }

        socketService.emit('ride:status:update', { rideId, status: nextStatus, paymentMethod });
    }, [rideId]);

    const updateDriverPosition = useCallback((position, heading = null) => {
        const nextHeading = Number.isFinite(Number(heading))
            ? Number(heading)
            : getBearingDegrees(driverPositionRef.current, position);

        if (Number.isFinite(Number(nextHeading))) {
            driverHeadingRef.current = nextHeading;
            setDriverHeading(nextHeading);
        }

        driverPositionRef.current = position;
        setDriverPosition(position);
    }, []);

    const publishDriverPosition = useCallback((position, heading = null) => {
        if (!rideId) {
            return;
        }

        socketService.emit('ride:driver-location:update', {
            rideId,
            coordinates: [position.lng, position.lat],
            heading: Number.isFinite(Number(heading)) ? Number(heading) : driverHeadingRef.current,
        });
    }, [rideId]);

    const startMovementSimulation = useCallback(() => {
        if (!canSimulateMovement || isSimulatingMovement) {
            return;
        }

        const basePath = routePath.length > 1 ? routePath : buildFallbackRoute(driverPosition, activeDestination);
        const nextSimulationRoute = buildSimulationRoute([driverPosition, ...basePath.slice(1)]);

        if (nextSimulationRoute.length <= 1) {
            const nextHeading = getBearingDegrees(driverPosition, activeDestination);
            updateDriverPosition(activeDestination, nextHeading);
            publishDriverPosition(activeDestination, nextHeading);
            return;
        }

        const initialHeading = getBearingDegrees(nextSimulationRoute[0], nextSimulationRoute[1]) ?? driverHeading;
        setSimulationRoute(nextSimulationRoute);
        setSimulationStep(0);
        setIsSimulatingMovement(true);
        updateDriverPosition(nextSimulationRoute[0], initialHeading);
        publishDriverPosition(nextSimulationRoute[0], initialHeading);
    }, [activeDestination, canSimulateMovement, driverHeading, driverPosition, isSimulatingMovement, publishDriverPosition, routePath, updateDriverPosition]);

    const startTripAfterOtp = (enteredOtp) => {
        if (String(enteredOtp).length !== 4) {
            setOtpError('Enter the full 4 digit PIN.');
            return;
        }

        if (String(enteredOtp) !== expectedOtp) {
            setOtpError('Wrong PIN. Ask the passenger again.');
            return;
        }

        setOtpError('');
        setPhase('in_trip');
        publishRideStatus('started');
    };

    useEffect(() => {
        simulationActiveRef.current = isSimulatingMovement;
    }, [isSimulatingMovement]);

    useEffect(() => {
        driverPositionRef.current = driverPosition;
    }, [driverPosition]);

    useEffect(() => {
        driverHeadingRef.current = driverHeading;
    }, [driverHeading]);

    useEffect(() => {
        if (!isSimulatingMovement || simulationRoute.length <= 1) {
            return undefined;
        }

        const timer = window.setInterval(() => {
            setSimulationStep((currentStep) => {
                const nextStep = Math.min(currentStep + 1, simulationRoute.length - 1);
                const nextPosition = simulationRoute[nextStep];

                if (nextPosition) {
                    const nextHeading =
                        getBearingDegrees(simulationRoute[currentStep], nextPosition) ??
                        getBearingDegrees(nextPosition, simulationRoute[nextStep + 1]) ??
                        driverHeadingRef.current;

                    updateDriverPosition(nextPosition, nextHeading);
                    publishDriverPosition(nextPosition, nextHeading);
                }

                if (nextStep >= simulationRoute.length - 1) {
                    window.clearInterval(timer);
                    setIsSimulatingMovement(false);

                    if (phase === 'to_pickup') {
                        setPhase('otp_verification');
                        publishRideStatus('arriving');
                    } else if (phase === 'in_trip') {
                        setPhase('payment_confirm');
                    }
                }

                return nextStep;
            });
        }, 180);

        return () => window.clearInterval(timer);
    }, [isSimulatingMovement, phase, publishDriverPosition, publishRideStatus, simulationRoute, updateDriverPosition]);

    useEffect(() => {
        if (!simulationActiveRef.current) {
            updateDriverPosition(initialDriverPosition);
        }
    }, [initialDriverPosition, updateDriverPosition]);

    useEffect(() => {
        let watchId = null;
        let cancelled = false;
        const socket = socketService.connect({ role: 'driver' });
        const leaveCancelledRide = (payload = {}) => {
            if (!rideId || String(payload.rideId || '') !== String(rideId)) {
                return;
            }

            navigate('/taxi/driver/home', {
                replace: true,
                state: {
                    rideClosedReason: payload.message || payload.reason || 'Ride was cancelled.',
                },
            });
        };

        if (socket && rideId) {
            socketService.emit('ride:join', { rideId });
        }

        socketService.on('rideRequestClosed', leaveCancelledRide);
        socketService.on('rideCancelled', leaveCancelledRide);

        getCurrentCoords()
            .then((position) => {
                if (!cancelled && !simulationActiveRef.current) {
                    updateDriverPosition(position);
                    publishDriverPosition(position);
                }
            })
            .catch(() => {});

        if (!navigator.geolocation) {
            return () => {
                cancelled = true;
                socketService.off('rideRequestClosed', leaveCancelledRide);
                socketService.off('rideCancelled', leaveCancelledRide);
            };
        }

        watchId = navigator.geolocation.watchPosition(
            (pos) => {
                if (cancelled || simulationActiveRef.current) {
                    return;
                }

                const nextPosition = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                };
                const nextHeading = Number.isFinite(Number(pos.coords.heading))
                    ? Number(pos.coords.heading)
                    : getBearingDegrees(driverPositionRef.current, nextPosition);

                updateDriverPosition(nextPosition, nextHeading);

                if (rideId) {
                    socketService.emit('ride:driver-location:update', {
                        rideId,
                        coordinates: [nextPosition.lng, nextPosition.lat],
                        heading: Number.isFinite(Number(nextHeading)) ? nextHeading : driverHeadingRef.current,
                        speed: pos.coords.speed,
                    });
                }
            },
            () => {},
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 15000,
            },
        );

        return () => {
            cancelled = true;
            socketService.off('rideRequestClosed', leaveCancelledRide);
            socketService.off('rideCancelled', leaveCancelledRide);
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [navigate, publishDriverPosition, rideId, updateDriverPosition]);

    useEffect(() => {
        if (isSimulatingMovement) {
            return undefined;
        }

        if (!isLoaded || !window.google?.maps?.DirectionsService) {
            setRoutePath(buildFallbackRoute(driverPosition, activeDestination));
            setRouteError('');
            return;
        }

        if (arePositionsNearlyEqual(driverPosition, activeDestination)) {
            setRoutePath([driverPosition]);
            setRouteError('');
            return;
        }

        let active = true;
        const directionsService = new window.google.maps.DirectionsService();

        directionsService.route(
            {
                origin: driverPosition,
                destination: activeDestination,
                travelMode: window.google.maps.TravelMode.DRIVING,
                provideRouteAlternatives: false,
            },
            (result, status) => {
                if (!active) {
                    return;
                }

                if (status === 'OK' && result?.routes?.[0]?.overview_path?.length) {
                    setRoutePath(
                        result.routes[0].overview_path.map((point) => ({
                            lat: point.lat(),
                            lng: point.lng(),
                        })),
                    );
                    setRouteError('');
                    return;
                }

                setRoutePath(buildFallbackRoute(driverPosition, activeDestination));
                setRouteError(status || 'Directions unavailable');
            },
        );

        return () => {
            active = false;
        };
    }, [activeDestination, driverPosition, isLoaded, isSimulatingMovement]);

    useEffect(() => {
        if (!map || !window.google?.maps) {
            return;
        }

        if (arePositionsNearlyEqual(driverPosition, activeDestination)) {
            map.setCenter(driverPosition);
            map.setZoom(15);
            return;
        }

        const bounds = new window.google.maps.LatLngBounds();

        if (visibleRoutePath.length > 1) {
            visibleRoutePath.forEach((point) => bounds.extend(point));
            bounds.extend(driverPosition);
            bounds.extend(activeDestination);
            map.fitBounds(bounds, 72);
            return;
        }

        bounds.extend(driverPosition);
        bounds.extend(activeDestination);
        map.fitBounds(bounds, 80);
    }, [activeDestination, driverPosition, map, visibleRoutePath]);

    const handleOTPChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const nextOtp = [...otp];
        nextOtp[index] = value;
        setOtp(nextOtp);

        if (value && index < 3) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            if (nextInput) {
                nextInput.focus();
            }
        }

        setOtpError('');

        if (nextOtp.join('').length === 4 && nextOtp.join('') === expectedOtp) {
            setTimeout(() => startTripAfterOtp(nextOtp.join('')), 250);
        }
    };

    const handleOTPKeyDown = (index, event) => {
        if (event.key !== 'Backspace') {
            return;
        }

        if (otp[index]) {
            const nextOtp = [...otp];
            nextOtp[index] = '';
            setOtp(nextOtp);
            setOtpError('');
            return;
        }

        if (index > 0) {
            const previousInput = document.getElementById(`otp-${index - 1}`);
            if (previousInput) {
                previousInput.focus();
            }
        }
    };

    const mapOptions = useMemo(() => ({
        styles: RAPIDO_MAP_STYLE,
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
        gestureHandling: 'greedy',
    }), []);

    return (
        <div className="relative mx-auto min-h-[100dvh] max-w-lg overflow-hidden bg-slate-200 font-sans select-none">
            {isHydratingTrip && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-200/90 backdrop-blur-sm">
                    <div className="rounded-[16px] bg-white/95 px-4 py-3 shadow-sm text-[12px] font-semibold text-slate-700">
                        Restoring active trip...
                    </div>
                </div>
            )}
            <div className="absolute inset-0 z-0 overflow-hidden bg-slate-200">
                {!HAS_VALID_GOOGLE_MAPS_KEY ? (
                    <div className="flex h-full w-full items-center justify-center bg-slate-200 px-6 text-center">
                        <div className="rounded-[18px] bg-white/90 px-4 py-4 shadow-sm">
                            <p className="text-[12px] font-semibold text-slate-900">Google Maps key missing</p>
                            <p className="mt-1 text-[11px] font-bold text-slate-500">Set `VITE_GOOGLE_MAPS_API_KEY` in `frontend/.env`.</p>
                        </div>
                    </div>
                ) : loadError ? (
                    <div className="flex h-full w-full items-center justify-center bg-slate-200 px-6 text-center">
                        <div className="rounded-[18px] bg-white/90 px-4 py-4 shadow-sm">
                            <p className="text-[12px] font-semibold text-slate-900">Google Maps failed to load</p>
                            <p className="mt-1 text-[11px] font-bold text-slate-500">Check the browser key restrictions and reload.</p>
                        </div>
                    </div>
                ) : isLoaded ? (
                    <GoogleMap
                        mapContainerStyle={MAP_CONTAINER_STYLE}
                        center={pickupPosition}
                        zoom={14}
                        onLoad={setMap}
                        onUnmount={() => setMap(null)}
                        options={mapOptions}
                    >
                        {visibleRoutePath.length > 1 && (
                            <PolylineF
                                path={visibleRoutePath}
                                options={{
                                    strokeColor: '#111827',
                                    strokeOpacity: 0.9,
                                    strokeWeight: 5,
                                }}
                            />
                        )}
                        <OverlayView
                            position={driverPosition}
                            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                        >
                            <div
                                className="pointer-events-none"
                                style={{
                                    transform: 'translate(-50%, -50%)',
                                }}
                            >
                                <div
                                    className="h-11 w-11"
                                    style={{
                                        transform: `rotate(${driverHeading + DRIVER_ICON_ROTATION_OFFSET}deg)`,
                                        transformOrigin: '50% 50%',
                                        transition: 'transform 180ms linear',
                                    }}
                                >
                                    <img
                                        src={currentVehicleIcon}
                                        alt="Driver vehicle"
                                        className="h-full w-full object-contain mix-blend-multiply"
                                    />
                                </div>
                            </div>
                        </OverlayView>
                        <MarkerF
                            position={activeDestination}
                            title={phase === 'to_pickup' || phase === 'otp_verification' ? 'Pickup' : 'Drop'}
                            icon={{
                                path: window.google.maps.SymbolPath.CIRCLE,
                                fillColor: phase === 'to_pickup' || phase === 'otp_verification' ? '#10b981' : '#ef4444',
                                fillOpacity: 1,
                                strokeColor: '#ffffff',
                                strokeWeight: 2,
                                scale: 7,
                            }}
                        />
                    </GoogleMap>
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-200">
                        <div className="rounded-[16px] bg-white/90 px-4 py-3 shadow-sm text-[12px] font-semibold text-slate-700">
                            Loading map
                        </div>
                    </div>
                )}

                <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-white/70 via-white/25 to-transparent pointer-events-none" />

                <div className="absolute top-10 left-4 right-4 z-50 flex items-center bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)] rounded-[1.25rem] p-1.5">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-11 h-11 shrink-0 rounded-[1rem] bg-slate-50 flex items-center justify-center text-slate-700 active:scale-95 transition-all hover:bg-slate-100"
                    >
                        <ArrowLeft size={18} strokeWidth={2.5} />
                    </button>

                    <div className="flex-1 flex items-center pl-2 pr-1">
                        {tripStats.map((stat, idx) => {
                            const Icon = stat.icon;
                            return (
                                <React.Fragment key={stat.label}>
                                    <div className="flex flex-col items-center justify-center min-w-0 flex-1 px-1">
                                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                        <div className="flex items-center justify-center gap-1.5 w-full">
                                            {Icon && <Icon size={12} strokeWidth={2.5} className={`shrink-0 ${stat.iconClassName || 'text-slate-400'}`} />}
                                            <p className="text-[12px] font-bold text-slate-800 truncate">{stat.value}</p>
                                        </div>
                                    </div>
                                    {idx < tripStats.length - 1 && <div className="w-px h-8 bg-slate-100 shrink-0"></div>}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>


                {routeError && (
                    <div className="absolute top-44 right-4 z-40 rounded-2xl bg-white/92 border border-amber-100 shadow-lg px-3 py-2 min-w-[148px]">
                        <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-amber-500">Route</p>
                        <p className="mt-1 text-[10px] font-semibold text-slate-700">Using fallback path while directions load.</p>
                    </div>
                )}
            </div>

            <div className="absolute bottom-0 left-0 right-0 z-40">
                <AnimatePresence mode="wait">
                    {phase === 'to_pickup' && (
                        <motion.div
                            key="to_pickup"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="bg-white rounded-t-[2.5rem] p-5 pb-8 shadow-2xl border-t border-slate-100"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center overflow-hidden">
                                        {isParcel ? <Package size={22} className="text-slate-900" /> : (tripData.user.profileImage && !userImageBroken ? <img src={tripData.user.profileImage} alt={tripData.user.name} className="w-full h-full object-cover" onError={() => setUserImageBroken(true)} /> : <User size={22} className="text-slate-400" />)}
                                    </div>
                                    <div className="space-y-0.5">
                                        <h4 className="text-[15px] font-semibold text-slate-900 tracking-tight uppercase">
                                            {isParcel ? tripData.sender.name : tripData.user.name}
                                        </h4>
                                        <div className="flex items-center gap-1.5 opacity-60">
                                            <Star size={10} fill="#f0c419" className="text-yellow-500" />
                                            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
                                                {isParcel ? tripData.sender.rating : tripData.user.rating} • 1.2 KM
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => navigate('/taxi/driver/ride/chat?role=driver')} className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600 active:scale-95 transition-transform"><MessageSquare size={18} strokeWidth={2.5} /></button>
                                    <button onClick={() => { console.log('Dialing sender/user:', isParcel ? tripData.sender.phone : tripData.user.phone); window.location.href = `tel:${isParcel ? tripData.sender.phone : tripData.user.phone}`; }} className="w-11 h-11 bg-slate-50 rounded-xl flex items-center justify-center text-emerald-500 active:scale-95 transition-transform"><Phone size={18} strokeWidth={2.5} /></button>
                                </div>
                            </div>
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                    setPhase('otp_verification');
                                    publishRideStatus('arriving');
                                }}
                                className="w-full h-15 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-3 text-[14px] font-semibold uppercase tracking-wide shadow-lg shadow-slate-900/20"
                            >
                                {isParcel ? 'Arrived at Sender' : 'I Have Arrived'} <CheckCircle2 size={18} strokeWidth={3} />
                            </motion.button>
                        </motion.div>
                    )}

                    {phase === 'otp_verification' && (
                        <motion.div
                            key="otp_verification"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="bg-white rounded-t-[2.5rem] p-6 pb-8 shadow-2xl border-t border-slate-100"
                        >
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Enter PIN</h3>
                                <p className="text-[13px] font-medium text-slate-500 mt-1">
                                    Ask <span className="font-bold text-slate-800">{isParcel ? 'sender' : 'passenger'}</span> for the 4-digit PIN
                                </p>
                            </div>
                            <div className="flex justify-center gap-4 mb-8">
                                {otp.map((digit, index) => (
                                    <input
                                        key={index}
                                        id={`otp-${index}`}
                                        type="tel"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOTPChange(index, e.target.value)}
                                        onKeyDown={(e) => handleOTPKeyDown(index, e)}
                                        className="w-14 h-16 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center text-3xl font-bold text-slate-900 focus:outline-none focus:border-[#FACC15] focus:bg-white transition-all shadow-sm"
                                    />
                                ))}
                            </div>
                            {otpError && (
                                <p className="-mt-4 mb-6 text-center text-[12px] font-bold text-red-500">
                                    {otpError}
                                </p>
                            )}
                            <button
                                onClick={() => startTripAfterOtp(otp.join(''))}
                                className="mb-3 h-14 w-full rounded-2xl bg-[#FACC15] text-[15px] font-bold uppercase tracking-wide text-slate-900 active:scale-95 transition-all shadow-lg shadow-[#FACC15]/30"
                            >
                                Verify & Start Ride
                            </button>
                            <button onClick={() => {
                                setPhase('to_pickup');
                                publishRideStatus('accepted');
                            }} className="h-12 w-full text-slate-500 rounded-2xl text-[14px] font-semibold active:scale-95 transition-all hover:bg-slate-50">
                                Go Back
                            </button>
                        </motion.div>
                    )}

                    {phase === 'in_trip' && (
                        <motion.div
                            key="in_trip"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="bg-white rounded-t-[2.5rem] p-5 pb-8 shadow-2xl border-t border-slate-100"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                                        {isParcel ? <Package size={20} className="text-slate-400" /> : (tripData.user.profileImage && !userImageBroken ? <img src={tripData.user.profileImage} alt={tripData.user.name} className="w-full h-full object-cover" onError={() => setUserImageBroken(true)} /> : <User size={20} className="text-slate-300" />)}
                                    </div>
                                    <div>
                                        <h3 className="text-[18px] font-semibold text-slate-900 tracking-tight capitalize">{isParcel ? tripData.receiver.name : tripData.user.name}</h3>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <Star size={12} className="text-slate-400 fill-slate-400" />
                                            <span className="text-[13px] text-slate-500">{isParcel ? '5.0' : tripData.user.rating || '4.8'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => navigate('/taxi/driver/security')} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors">
                                        <ShieldAlert size={18} strokeWidth={2} />
                                    </button>
                                    <button onClick={() => { window.location.href = `tel:${isParcel ? tripData.receiver.phone : tripData.user.phone}`; }} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-900 hover:bg-slate-100 transition-colors">
                                        <Phone size={18} strokeWidth={2} />
                                    </button>
                                </div>
                            </div>

                            <div className="w-full h-px bg-slate-100 mb-6"></div>

                            <div className="mb-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-6 flex flex-col items-center pt-1.5">
                                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[13px] font-medium text-slate-400 mb-0.5">{isParcel ? 'Delivery Address' : 'Drop-off Location'}</p>
                                        <p className="text-[16px] font-medium text-slate-800 leading-relaxed">
                                            {tripData.drop}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="w-full h-px bg-slate-100 mb-6"></div>

                            <div className="flex items-center justify-between mb-8 px-1">
                                <div className="flex flex-col">
                                    <p className="text-[12px] font-medium text-slate-400 mb-1">Total Fare</p>
                                    <p className="text-[16px] font-bold text-slate-900">{displayFare || tripData.fare}</p>
                                </div>
                                <div className="w-px h-8 bg-slate-100"></div>
                                <div className="flex flex-col items-center">
                                    <p className="text-[12px] font-medium text-slate-400 mb-1">Distance</p>
                                    <p className="text-[16px] font-bold text-slate-900">{tripData.distance}</p>
                                </div>
                                <div className="w-px h-8 bg-slate-100"></div>
                                <div className="flex flex-col items-end">
                                    <p className="text-[12px] font-medium text-slate-400 mb-1">Payment</p>
                                    <p className="text-[16px] font-bold text-slate-900 capitalize">{tripData.payment}</p>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setPhase('payment_confirm');
                                }}
                                className="w-full h-14 bg-slate-900 text-white rounded-xl flex items-center justify-center text-[15px] font-medium active:scale-[0.98] transition-transform shadow-sm hover:bg-slate-800"
                            >
                                {isParcel ? 'Deliver Parcel' : 'Arrived at Destination'}
                            </button>
                        </motion.div>
                    )}

                    {phase === 'payment_confirm' && (
                        <motion.div
                            key="payment_confirm"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            className="bg-white rounded-t-[2.5rem] p-6 pb-8 shadow-2xl border-t border-slate-100"
                        >
                            <div className="text-center mb-6">
                                <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-lg transition-all duration-500 ${driverPaymentStatus === 'success' ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}>
                                    {driverPaymentStatus === 'success' ? <Check size={32} strokeWidth={4} /> : <Scan size={32} strokeWidth={2} />}
                                </div>
                                <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">
                                    {driverPaymentStatus === 'success' ? 'Payment Received' : 'Collect Payment'}
                                </h2>
                                <p className="text-[14px] font-medium text-slate-500 mt-1">
                                    Total Amount Due: <span className="font-bold text-slate-900">{displayFare}</span>
                                </p>
                            </div>
                            
                            {driverPaymentStatus === 'pending' && (
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    {[
                                        { id: 'cash', label: 'Cash', icon: Banknote },
                                        { id: 'online', label: 'Online', icon: Scan },
                                    ].map((mode) => (
                                        <button
                                            key={mode.id}
                                            onClick={() => {
                                                setSelectedPaymentMode(mode.id);
                                                setDriverPaymentStatus(mode.id === 'online' ? 'qr_generated' : 'success');
                                            }}
                                            className={`flex flex-col items-center justify-center py-5 rounded-[1.25rem] border-2 transition-all ${selectedPaymentMode === mode.id ? 'border-slate-900 bg-slate-50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                                        >
                                            <mode.icon size={24} className={selectedPaymentMode === mode.id ? 'text-slate-900' : 'text-slate-400'} strokeWidth={selectedPaymentMode === mode.id ? 2.5 : 2} />
                                            <span className={`text-[13px] font-semibold mt-3 ${selectedPaymentMode === mode.id ? 'text-slate-900' : 'text-slate-500'}`}>{mode.label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {driverPaymentStatus === 'qr_generated' && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-50 rounded-[1.5rem] p-6 mb-8 text-center border border-slate-100">
                                    <div className="bg-white p-4 rounded-2xl inline-block mb-4 shadow-sm border border-slate-100 relative overflow-hidden">
                                        <QRCode 
                                            value={`upi://pay?pa=razorpay@icici&pn=Razorpay%20Merchant&am=${String(displayFare).replace(/[^0-9.]/g, '')}&cu=INR`} 
                                            size={140} 
                                            level="M" 
                                        />
                                        <motion.div animate={{ top: ['0%', '100%', '0%'] }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="absolute left-0 w-full h-0.5 bg-[#FACC15]" />
                                    </div>
                                    <p className="text-slate-600 font-medium text-[13px] mb-5">Scan this Razorpay QR code to pay {displayFare}</p>
                                    <button onClick={() => setDriverPaymentStatus('success')} className="w-full h-12 bg-white text-slate-900 rounded-xl text-[14px] font-semibold border border-slate-200 hover:bg-slate-50 shadow-sm transition-all">Confirm Payment Received</button>
                                </motion.div>
                            )}

                            <button
                                disabled={driverPaymentStatus !== 'success'}
                                onClick={() => setPhase('review')}
                                className={`w-full h-14 rounded-xl flex items-center justify-center text-[15px] font-medium transition-transform shadow-sm ${driverPaymentStatus === 'success' ? 'bg-slate-900 text-white active:scale-[0.98] hover:bg-slate-800' : 'bg-slate-100 text-slate-400 pointer-events-none'}`}
                            >
                                {driverPaymentStatus === 'success' ? 'Complete Trip' : 'Awaiting Payment'}
                            </button>
                        </motion.div>
                    )}

                    {phase === 'review' && (
                        <motion.div
                            key="review"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-white rounded-t-[2.5rem] p-6 pb-8 shadow-2xl border-t border-slate-50 text-center"
                        >
                            <div className="mb-8 space-y-4">
                                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 flex items-center justify-center text-white overflow-hidden shadow-lg shadow-black/5 mx-auto">
                                    {isParcel ? <Package size={24} /> : (tripData.user?.profileImage && !userImageBroken ? <img src={tripData.user.profileImage} alt={tripData.user.name} className="w-full h-full object-cover" onError={() => setUserImageBroken(true)} /> : <User size={24} />)}
                                </div>
                                <h3 className="text-xl font-semibold text-slate-900 uppercase tracking-tight">Rate Experience</h3>
                                <div className="flex justify-center gap-2">
                                    {[1, 2, 3, 4, 5].map((score) => (
                                        <Star
                                            key={score}
                                            size={28}
                                            onClick={() => setSelectedRating(score)}
                                            className={`transition-all ${score <= selectedRating ? 'text-yellow-500' : 'text-slate-100'}`}
                                            fill={score <= selectedRating ? 'currentColor' : 'transparent'}
                                            strokeWidth={2}
                                        />
                                    ))}
                                </div>
                            </div>
                            <button onClick={() => {
                                publishRideStatus('completed', selectedPaymentMode);
                                navigate('/taxi/driver/home');
                            }} className="w-full h-15 bg-slate-900 text-white rounded-xl flex items-center justify-center gap-3 text-[14px] font-semibold uppercase tracking-wide shadow-xl active:scale-95 transition-all">Done <Check size={20} strokeWidth={4} /></button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ActiveTrip;
