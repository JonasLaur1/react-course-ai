import axios from 'axios';
import { logAPIError, getCookie } from './APIRequest';

const AUTH_API_BASE_URL = 'http://localhost:5255/api/auth';

export function isUserLoggedIn() {
    const cookieValue = getCookie('AuthToken');
    return !!cookieValue;
}

export async function registerUser(data) {
    try {
        const response = await axios.post(`${AUTH_API_BASE_URL}/register`, data, { withCredentials: true });
        return response.data;
    } catch(error) {
        logAPIError(error);
        throw error;  
    }
}

export async function loginUser(data) {
    try {
        const response = await axios.post(`${AUTH_API_BASE_URL}/login`, data, { withCredentials: true });
        return response.data;
    } catch(error) {
        logAPIError(error);
        throw error;
    }
}