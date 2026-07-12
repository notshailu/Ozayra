import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clearDriverAuthState, getCurrentDriver, getLocalDriverToken } from '../services/registrationService';
import IncomingRideRequest from '../pages/IncomingRideRequest';
import { socketService } from '../../../shared/api/socket';
import api from '../../../shared/api/axiosInstance';

const unwrapDriver = (response) => response?.data?.data || response?.data || response;

const getCurrentCoords = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
        reject(new Error('Location is not available on this device.'));
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
        () => reject(new Error('Please allow location permission to go online.')),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
});

const toLatLng = (coordinates) => {
    const [lng, lat] = coordinates || [];

    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
        return { lat: 22.7196, lng: 75.8577 };
    }

    return { lat: Number(lat), lng: Number(lng) };
};

const normalizeJobType = (job = {}) => {
    const value = String(job.type || job.serviceType || 'ride').toLowerCase();
    if (value === 'parcel') return 'parcel';
    if (value === 'intercity') return 'intercity';
    return 'ride';
};

const getJobTitle = (type) => {
    if (type === 'parcel') return 'Delivery';
    if (type === 'intercity') return 'Intercity Ride';
    return 'Taxi Ride';
};

const formatTripDistance = (job = {}) => {
    const estimatedMeters = Number(job.estimatedDistanceMeters || job.raw?.estimatedDistanceMeters || 0);

    if (Number.isFinite(estimatedMeters) && estimatedMeters > 0) {
        return estimatedMeters < 1000
            ? `${Math.max(50, Math.round(estimatedMeters / 10) * 10)} m`
            : `${(estimatedMeters / 1000).toFixed(estimatedMeters >= 10000 ? 0 : 1)} km`;
    }

    if (job.intercity?.distance) {
        return `${job.intercity.distance} km`;
    }

    if (job.raw?.intercity?.distance) {
        return `${job.raw.intercity.distance} km`;
    }

    if (job.radius) {
        return `within ${(Number(job.radius) / 1000).toFixed(1)} km`;
    }

    if (job.raw?.radius) {
        return `within ${(Number(job.raw.radius) / 1000).toFixed(1)} km`;
    }

    return 'nearby';
};

const formatPoint = (point, fallback) => {
    const [lng, lat] = point?.coordinates || [];

    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
        return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
    }

    return fallback;
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

const isDriverApproved = (driver) => {
    if (!driver) {
        return false;
    }

    const approval = String(driver.approve ?? '').toLowerCase();
    const status = String(driver.status || '').toLowerCase();

    return (
        driver.approve === true ||
        driver.approve === 1 ||
        ['true', '1', 'yes', 'approved'].includes(approval) ||
        ['approved', 'active', 'verified'].includes(status)
    );
};

const onboardingRoutes = new Set([
    '/taxi/driver/lang-select',
    '/taxi/driver/welcome',
    '/taxi/driver/login',
    '/taxi/driver/reg-phone',
    '/taxi/driver/otp-verify',
    '/taxi/driver/step-personal',
    '/taxi/driver/step-referral',
    '/taxi/driver/step-vehicle',
    '/taxi/driver/step-documents',
    '/taxi/driver/registration-status',
    '/taxi/driver/status',
]);

const redirectToDriverLogin = (navigate) => {
    clearDriverAuthState();
    navigate('/taxi/driver/login', { replace: true });
};

const DriverLayout = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isChecking, setIsChecking] = useState(false);
    const [isAllowed, setIsAllowed] = useState(true);

    const [isOnline, setIsOnline] = useState(false);
    const [showRequest, setShowRequest] = useState(false);
    const [currentRequest, setCurrentRequest] = useState(null);
    const [driverCoords, setDriverCoords] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [acceptingRideId, setAcceptingRideId] = useState('');
    const [walletSummary, setWalletSummary] = useState({ balance: 0, cashLimit: 500, isBlocked: false });
    const [vehicleIconType, setVehicleIconType] = useState('car');
    
    const driverCoordsRef = useRef(null);
    const acceptingRideIdRef = useRef('');
    const currentRequestRef = useRef(null);

    const fetchActiveJob = useCallback(async (type = 'ride') => {
        const normalizedType = String(type || 'ride').toLowerCase();
        const endpoint = normalizedType === 'parcel' ? '/deliveries/active/me' : '/rides/active/me';
        const driverToken = getLocalDriverToken();
        const response = await api.get(endpoint, {
            ...withDriverAuthorization(driverToken),
            params: { t: Date.now(), type: normalizedType },
        });
        return unwrapApiPayload(response);
    }, []);

    const updateDriverLocation = useCallback(async ({ quiet = false } = {}) => {
        try {
            const coordinates = await getCurrentCoords();
            driverCoordsRef.current = coordinates;
            setDriverCoords(coordinates);
            if (!quiet) {
                setStatusMessage('Current location updated.');
            }
            return coordinates;
        } catch (error) {
            if (!quiet) {
                setStatusMessage(error.message || 'Could not fetch current location.');
            }
            throw error;
        }
    }, []);

    const goOnline = useCallback(async () => {
        try {
            const coordinates = await updateDriverLocation({ quiet: true });
            const socket = socketService.connect({ role: 'driver' });

            if (!socket) {
                setStatusMessage('Driver session missing. Please login again.');
                return;
            }

            const response = await api.patch('/drivers/online', { location: coordinates });
            const driver = response?.data?.data || response?.data || response;
            
            setIsOnline(Boolean(driver?.isOnline));
            if (Array.isArray(driver?.location?.coordinates) && driver.location.coordinates.length === 2) {
                driverCoordsRef.current = driver.location.coordinates;
                setDriverCoords(driver.location.coordinates);
                socketService.emit('locationUpdate', { coordinates: driver.location.coordinates });
            } else {
                socketService.emit('locationUpdate', { coordinates });
            }
            setStatusMessage('You are online. Waiting for bookings.');
        } catch (error) {
            setStatusMessage(error.message || 'Could not go online.');
        }
    }, [updateDriverLocation]);

    const goOffline = useCallback(async () => {
        try {
            await api.patch('/drivers/offline');
            setIsOnline(false);
            setShowRequest(false);
            setCurrentRequest(null);
            setStatusMessage('You are offline.');
            socketService.disconnect();
        } catch (error) {
            setStatusMessage(error.message || 'Could not go offline.');
        }
    }, []);

    const hydrateDriverState = useCallback(async () => {
        const response = await getCurrentDriver();
        const driver = unwrapDriver(response);
        const savedCoords = driver?.location?.coordinates;

        setVehicleIconType(driver?.vehicleIconType || driver?.vehicleType || 'car');
        setIsOnline(Boolean(driver?.isOnline));
        if (driver?.wallet) {
            setWalletSummary(driver.wallet);
        }

        if (Array.isArray(savedCoords) && savedCoords.length === 2) {
            driverCoordsRef.current = savedCoords;
            setDriverCoords(savedCoords);
        }

        return driver;
    }, []);

    useEffect(() => {
        const currentPath = location.pathname;

        if (onboardingRoutes.has(currentPath)) {
            setIsAllowed(true);
            setIsChecking(false);
            return;
        }

        const token = localStorage.getItem('driverToken') || localStorage.getItem('token');

        if (!token) {
            setIsAllowed(false);
            redirectToDriverLogin(navigate);
            return;
        }

        let active = true;

        const verifyDriver = async () => {
            setIsChecking(true);

            try {
                const response = await getCurrentDriver();
                const driver = unwrapDriver(response);
                const isApproved = isDriverApproved(driver);

                if (!active) {
                    return;
                }

                if (!isApproved) {
                    setIsAllowed(false);
                    navigate('/taxi/driver/registration-status', { replace: true });
                    return;
                }

                setIsAllowed(true);
                // Hydrate online status & wallet state from verified profile
                setVehicleIconType(driver?.vehicleIconType || driver?.vehicleType || 'car');
                setIsOnline(Boolean(driver?.isOnline));
                if (driver?.wallet) {
                    setWalletSummary(driver.wallet);
                }
                const savedCoords = driver?.location?.coordinates;
                if (Array.isArray(savedCoords) && savedCoords.length === 2) {
                    driverCoordsRef.current = savedCoords;
                    setDriverCoords(savedCoords);
                }

                // Check for active parcel or taxi rides on initial load
                const [activeDelivery, activeRide] = await Promise.allSettled([
                    fetchActiveJob('parcel'),
                    fetchActiveJob('ride'),
                ]);

                if (!active) {
                    return;
                }

                const deliveryPayload = activeDelivery.status === 'fulfilled' ? activeDelivery.value : null;
                const ridePayload = activeRide.status === 'fulfilled' ? activeRide.value : null;
                const currentJob = deliveryPayload?.rideId ? deliveryPayload : ridePayload?.rideId ? ridePayload : null;

                if (currentJob?.rideId) {
                    const currentType = normalizeJobType(currentJob);
                    
                    const isAllowedActiveRidePath = currentPath.includes('/active-trip') || 
                                                    currentPath.includes('/ride/chat') || 
                                                    currentPath.includes('/security');
                                                    
                    if (!isAllowedActiveRidePath) {
                        navigate('/taxi/driver/active-trip', {
                            replace: true,
                            state: {
                                type: currentType,
                                rideId: currentJob.rideId,
                                request: {
                                    type: currentType,
                                    title: getJobTitle(currentType),
                                    fare: `Rs ${currentJob.fare || 0}`,
                                    payment: currentJob.paymentMethod || 'Cash',
                                    pickup: currentJob.pickupAddress || formatPoint(currentJob.pickupLocation, 'Pickup Location'),
                                    drop: currentJob.dropAddress || formatPoint(currentJob.dropLocation, 'Drop Location'),
                                    distance: formatTripDistance(currentJob),
                                    requestId: currentJob.rideId,
                                    rideId: currentJob.rideId,
                                    raw: currentJob,
                                },
                                currentDriverCoords: driverCoordsRef.current || currentJob.lastDriverLocation?.coordinates || null,
                            },
                        });
                    }
                }
            } catch (error) {
                if (!active) {
                    return;
                }

                setIsAllowed(false);

                if (error?.status === 401) {
                    redirectToDriverLogin(navigate);
                    return;
                }

                if (error?.status === 404) {
                    redirectToDriverLogin(navigate);
                    return;
                }

                if (error?.status === 403) {
                    navigate('/taxi/driver/registration-status', { replace: true });
                    return;
                }

                navigate('/taxi/driver/registration-status', { replace: true });
            } finally {
                if (active) {
                    setIsChecking(false);
                }
            }
        };

        verifyDriver();

        return () => {
            active = false;
        };
    }, [location.pathname, navigate]);

    // Socket listeners at layout level so requests work across all tabs
    useEffect(() => {
        if (isOnline && isAllowed) {
            const socket = socketService.connect({ role: 'driver' });

            if (!socket) {
                setIsOnline(false);
                return undefined;
            }

            if (driverCoordsRef.current) {
                socketService.emit('locationUpdate', { coordinates: driverCoordsRef.current });
            }

            const onRideRequest = (data) => {
                const requestType = normalizeJobType(data);
                const request = {
                    type: requestType,
                    title: getJobTitle(requestType),
                    fare: `Rs ${data.fare || 0}`,
                    payment: data.paymentMethod || 'Cash',
                    pickup: data.pickupAddress || formatPoint(data.pickupLocation, 'Pickup Location'),
                    drop: data.dropAddress || formatPoint(data.dropLocation, 'Drop Location'),
                    distance: formatTripDistance(data),
                    requestId: data.rideId,
                    rideId: data.rideId,
                    raw: data,
                };
                setCurrentRequest(request);
                currentRequestRef.current = request;
                setShowRequest(true);
                setStatusMessage('New booking received.');
            };

            const onRideRequestClosed = ({ rideId, reason, message }) => {
                if (acceptingRideIdRef.current && acceptingRideIdRef.current === rideId) {
                    return;
                }
                const curReq = currentRequestRef.current;
                if (!curReq?.rideId || curReq.rideId === rideId) {
                    setShowRequest(false);
                    setCurrentRequest(null);
                    currentRequestRef.current = null;
                    if (reason === 'user-cancelled') {
                        setStatusMessage(message || 'User cancelled the ride.');
                    } else if (reason === 'deleted-by-admin') {
                        setStatusMessage('Ride was cancelled by admin.');
                    } else if (reason === 'unmatched') {
                        setStatusMessage('Ride request expired without a match.');
                    }
                }
            };

            const onSocketError = ({ message }) => {
                setStatusMessage(message || 'Socket error.');
                if (String(message || '').toLowerCase().includes('no longer available')) {
                    setShowRequest(false);
                    setCurrentRequest(null);
                    currentRequestRef.current = null;
                }
                acceptingRideIdRef.current = '';
                setAcceptingRideId('');
            };

            const openAcceptedRide = async (payload) => {
                if (!payload?.rideId || payload.rideId !== acceptingRideIdRef.current) {
                    return;
                }

                const curReq = currentRequestRef.current;
                const nextType = curReq?.type || 'ride';
                let currentJob = null;

                try {
                    currentJob = await fetchActiveJob(nextType);
                } catch {
                    currentJob = null;
                }

                setShowRequest(false);
                acceptingRideIdRef.current = '';
                setAcceptingRideId('');
                navigate('/taxi/driver/active-trip', {
                    state: {
                        type: nextType,
                        rideId: currentJob?.rideId || payload.rideId,
                        request: {
                            ...curReq,
                            rideId: currentJob?.rideId || payload.rideId,
                            raw: currentJob || {
                                ...(curReq?.raw || {}),
                                status: payload.status,
                                liveStatus: payload.liveStatus,
                                acceptedAt: payload.acceptedAt,
                            },
                        },
                        currentDriverCoords: driverCoordsRef.current || null,
                    },
                });
            };

            const onWalletUpdated = (payload) => {
                if (payload?.wallet) {
                    setWalletSummary(payload.wallet);
                }
            };

            socketService.on('rideRequest', onRideRequest);
            socketService.on('rideRequestClosed', onRideRequestClosed);
            socketService.on('errorMessage', onSocketError);
            socketService.on('rideAccepted', openAcceptedRide);
            socketService.on('driver:wallet:updated', onWalletUpdated);

            const locationInterval = setInterval(() => {
                getCurrentCoords()
                    .then((coordinates) => {
                        driverCoordsRef.current = coordinates;
                        setDriverCoords(coordinates);
                        socketService.emit('locationUpdate', { coordinates });
                    })
                    .catch((error) => {
                        setStatusMessage(error.message || 'Could not update live location.');
                    });
            }, 10000);

            return () => {
                socketService.off('rideRequest', onRideRequest);
                socketService.off('rideRequestClosed', onRideRequestClosed);
                socketService.off('errorMessage', onSocketError);
                socketService.off('rideAccepted', openAcceptedRide);
                socketService.off('driver:wallet:updated', onWalletUpdated);
                clearInterval(locationInterval);
            };
        } else {
            socketService.disconnect();
        }
        return undefined;
    }, [isOnline, isAllowed, navigate, fetchActiveJob]);

    const handleAccept = () => {
        const curReq = currentRequestRef.current;
        if (!curReq?.rideId || acceptingRideId) {
            return;
        }

        acceptingRideIdRef.current = curReq.rideId;
        setAcceptingRideId(curReq.rideId);
        setStatusMessage('Accepting ride...');
        socketService.emit('acceptRide', { rideId: curReq.rideId });
    };

    const handleDecline = () => {
        const curReq = currentRequestRef.current;
        if (curReq?.rideId) {
            socketService.emit('rejectRide', { rideId: curReq.rideId });
        }
        setShowRequest(false);
        setCurrentRequest(null);
        currentRequestRef.current = null;
    };

    return (
        <div className="driver-theme min-h-screen">
            {isChecking && !onboardingRoutes.has(location.pathname) ? (
                <div className="min-h-screen flex items-center justify-center bg-white">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
                </div>
            ) : (
                <>
                    <IncomingRideRequest 
                        visible={showRequest && Boolean(currentRequest)}
                        requestData={currentRequest}
                        isAccepting={Boolean(acceptingRideId)}
                        onAccept={handleAccept} 
                        onDecline={handleDecline}
                    />
                    <Outlet context={{ 
                        isAllowed, 
                        isOnline, 
                        goOnline, 
                        goOffline, 
                        driverCoords, 
                        statusMessage, 
                        setStatusMessage, 
                        walletSummary, 
                        setWalletSummary,
                        vehicleIconType
                    }} />
                </>
            )}
        </div>
    );
};

export default DriverLayout;
