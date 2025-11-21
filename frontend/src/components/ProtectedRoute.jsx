import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom'; 
import { jwtDecode } from "jwt-decode"; // Optional: if you want to check expiration locally
import api from '../api/api';
import { REFRESH_TOKEN, ACCESS_TOKEN } from '../constants/constants'; // <--- IMPORT THESE

const ProtectedRoute = ({ children }) => {
    const [isAuthorized, setIsAuthorized] = useState(null);

    useEffect(() => {
        auth().catch(() => setIsAuthorized(false))
    }, [])

    const refreshToken = async () => {
        const refreshTokenValue = localStorage.getItem(REFRESH_TOKEN);
        
        // If we don't have a refresh token, we can't refresh.
        if (!refreshTokenValue) {
            setIsAuthorized(false);
            return;
        }

        try {
            // FIX: Send the refresh token in the body
            // Note: Make sure the URL matches your urls.py. 
            // If your axios baseURL ends in /api/, remove /api/ here.
            const res = await api.post('api/token/refresh/', { 
                refresh: refreshTokenValue 
            });

            if (res.status === 200) {
                // FIX: Save the NEW access token required for future requests
                localStorage.setItem(ACCESS_TOKEN, res.data.access);
                setIsAuthorized(true);
            } else {
                setIsAuthorized(false);
            }
        } catch (error) {
            console.log('Failed to refresh token: ', error);
            setIsAuthorized(false);
        }
    }

    const auth = async () => {
        const token = localStorage.getItem(ACCESS_TOKEN);
        
        if (!token) {
            setIsAuthorized(false);
            return;
        }

        // Simple logic: If we have a token, try to decode it to see if it's expired
        try {
            const decoded = jwtDecode(token);
            const tokenExpiration = decoded.exp;
            const now = Date.now() / 1000;

            if (tokenExpiration < now) {
                // Token expired, try to refresh
                await refreshToken();
            } else {
                // Token valid, let them pass
                setIsAuthorized(true);
            }
        } catch (error) {
            // If decoding fails (invalid token), try to refresh
            await refreshToken();
        }
    }

    if (isAuthorized === null) {
        return (
            <div className='flex flex-col text-center items-center justify-center min-h-screen'>
                <h1 className='text-3xl font-bold'>Loading...</h1>
            </div>
        )
    }

    return isAuthorized ? children : <Navigate to="/" /> // Redirect to login if failed
}

export default ProtectedRoute;