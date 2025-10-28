import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom'; 
import api from '../api/api';

const ProtectedRoute = ({ children }) => {
    const [isAuthorized, setIsAuthorized] = useState(null);

    const refreshToken = async () => {
        try{
            await api.post('/api/token/refresh/');
            setIsAuthorized(true)
            return true;
        }
        catch(error){
            console.log('Failed to refresh token: ', error);
            setIsAuthorized(false)
            return false
        }
    }

    const authorized = async () => {
        await refreshToken();
    }

    useEffect(() => {
        authorized().catch(() => setIsAuthorized(false))

        const timer = setTimeout(() => {
            if(isAuthorized === null) return setIsAuthorized(false)
        }, 2000)

        return () =>  clearTimeout(timer);
    }, [isAuthorized])

    if(isAuthorized === null){
        return (
            <div className='flex flex-col text-center items-center justify-center min-h-screen'>
                <h1 className='text-3xl font-bold'>Loading...</h1>
            </div>
        )
    }

    return isAuthorized ? children : <Navigate to="/login"></Navigate>
}

export default ProtectedRoute