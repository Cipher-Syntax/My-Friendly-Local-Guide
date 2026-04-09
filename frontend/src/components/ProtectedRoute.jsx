import React, { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom'; 
import { jwtDecode } from "jwt-decode"; 
import api from '../api/api';
import { REFRESH_TOKEN, ACCESS_TOKEN } from '../constants/constants'; 

const hasRequiredRole = (requiredRole, profile, decodedToken) => {
    if (!requiredRole) return true;

    if (requiredRole === 'admin') {
        return Boolean(profile?.is_superuser || decodedToken?.is_superuser);
    }

    if (requiredRole === 'agency') {
        return Boolean(profile?.agency_profile) && !profile?.is_superuser && !profile?.is_local_guide;
    }

    if (requiredRole === 'agency-onboarding') {
        return !profile?.is_superuser && !profile?.is_local_guide;
    }

    return true;
};

const resolveUnauthorizedRedirect = (requiredRole, profile, fallbackPath) => {
    if (requiredRole === 'admin') {
        if (profile?.agency_profile) return '/agency';
        return '/admin-signin';
    }

    if (requiredRole === 'agency') {
        if (profile?.is_superuser) return '/admin';
        if (profile?.is_local_guide) return '/portal';
        if (!profile?.agency_profile) return '/agency/complete-profile';
    }

    if (requiredRole === 'agency-onboarding') {
        if (profile?.is_superuser) return '/admin';
        if (profile?.is_local_guide) return '/portal';
    }

    return fallbackPath;
};

const ProtectedRoute = ({ children, requiredRole = null, redirectTo = '/' }) => {
    const [isAuthorized, setIsAuthorized] = useState(null);
    const [redirectPath, setRedirectPath] = useState(redirectTo);



    const fetchProfile = async () => {
        try {
            const res = await api.get('api/profile/');
            return res.data;
        } catch {
            return null;
        }
    };

    const finalizeAuthorization = useCallback(async (token) => {
        let decoded = null;
        try {
            decoded = jwtDecode(token);
        } catch {
            decoded = null;
        }

        const profile = await fetchProfile();
        const allowed = hasRequiredRole(requiredRole, profile, decoded);

        if (!allowed) {
            setRedirectPath(resolveUnauthorizedRedirect(requiredRole, profile, redirectTo));
            setIsAuthorized(false);
            return;
        }

        setIsAuthorized(true);
    }, [requiredRole, redirectTo]);

    const refreshToken = useCallback(async () => {
        const refreshTokenValue = localStorage.getItem(REFRESH_TOKEN);
        
        if (!refreshTokenValue) {
            setRedirectPath(redirectTo);
            setIsAuthorized(false);
            return;
        }

        try {
   
            const res = await api.post('api/token/refresh/', { 
                refresh: refreshTokenValue 
            });

            if (res.status === 200) {
                localStorage.setItem(ACCESS_TOKEN, res.data.access);
                await finalizeAuthorization(res.data.access);
            } else {
                setRedirectPath(redirectTo);
                setIsAuthorized(false);
            }
        } catch (error) {
            console.log('Failed to refresh token: ', error);
            setRedirectPath(redirectTo);
            setIsAuthorized(false);
        }
    }, [finalizeAuthorization, redirectTo])

    const auth = useCallback(async () => {
        const token = localStorage.getItem(ACCESS_TOKEN);
        
        if (!token) {
            setRedirectPath(redirectTo);
            setIsAuthorized(false);
            return;
        }

        try {
            const decoded = jwtDecode(token);
            const tokenExpiration = decoded.exp;
            const now = Date.now() / 1000;

            if (tokenExpiration < now) {
                await refreshToken();
            } else {
                await finalizeAuthorization(token);
            }
        } catch {
            await refreshToken();
        }
    }, [finalizeAuthorization, redirectTo, refreshToken])

    useEffect(() => {
        auth().catch(() => {
            setRedirectPath(redirectTo);
            setIsAuthorized(false);
        });
    }, [requiredRole, redirectTo, auth]);

    if (isAuthorized === null) {
        return (
            <div className='flex flex-col text-center items-center justify-center min-h-screen'>
                <h1 className='text-3xl font-bold'>Loading...</h1>
            </div>
        )
    }

    return isAuthorized ? children : <Navigate to={redirectPath} replace /> 
}

export default ProtectedRoute;