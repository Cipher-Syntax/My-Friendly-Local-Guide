import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom'; 
import { jwtDecode } from "jwt-decode"; 
import api from '../api/api';
import { REFRESH_TOKEN, ACCESS_TOKEN } from '../constants/constants'; 

const ProtectedRoute = ({ children }) => {
    const [isAuthorized, setIsAuthorized] = useState(null);

    useEffect(() => {
        auth().catch(() => setIsAuthorized(false))
    }, [])

    const refreshToken = async () => {
        const refreshTokenValue = localStorage.getItem(REFRESH_TOKEN);
        
        if (!refreshTokenValue) {
            setIsAuthorized(false);
            return;
        }

        try {
   
            const res = await api.post('api/token/refresh/', { 
                refresh: refreshTokenValue 
            });

            if (res.status === 200) {
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

        try {
            const decoded = jwtDecode(token);
            const tokenExpiration = decoded.exp;
            const now = Date.now() / 1000;

            if (tokenExpiration < now) {
                await refreshToken();
            } else {
                setIsAuthorized(true);
            }
        } catch (error) {
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

    return isAuthorized ? children : <Navigate to="/" /> 
}

export default ProtectedRoute;