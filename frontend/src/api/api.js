import axios from 'axios'
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants/constants'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        "ngrok-skip-browser-warning": "true",
        "Content-Type": "application/json"
    }
})

// 1. Request Interceptor: Attaches the token to every request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(ACCESS_TOKEN)
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// 2. Response Interceptor: Handles 401 errors and refreshes the token
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Check if the error is a 401 (Unauthorized) or specific "token_not_valid" code
        // AND ensure we haven't already tried to retry this specific request
        const isTokenError = error.response?.status === 401 || error.response?.data?.code === 'token_not_valid';
        
        // Check if the request that failed was actually the refresh endpoint itself (to prevent infinite loops)
        const isRefreshEndpoint = originalRequest?.url?.includes('/api/token/refresh/');

        if (isTokenError && !originalRequest._retry && !isRefreshEndpoint) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem(REFRESH_TOKEN);

                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                // Attempt to get a new access token
                const res = await api.post('/api/token/refresh/', { 
                    refresh: refreshToken 
                });

                const newAccessToken = res.data.access;

                if (newAccessToken) {
                    // 1. Update local storage
                    localStorage.setItem(ACCESS_TOKEN, newAccessToken);

                    // 2. Update the header of the original failed request
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                    // 3. Retry the original request with the new token
                    return api(originalRequest);
                }

            } catch (refreshError) {
                // If refresh fails (e.g., refresh token is also expired):
                // Clear storage and redirect to login
                console.error("Token refresh failed:", refreshError);
                localStorage.removeItem(ACCESS_TOKEN);
                localStorage.removeItem(REFRESH_TOKEN);
                
                // Optional: Force redirect to login page
                // window.location.href = '/login';
                
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
)

export default api