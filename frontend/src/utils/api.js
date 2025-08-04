import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE_URL = 'https://slideforge-82jm.onrender.com/api';

// Create a custom axios instance with default config
const createApiInstance = (config = {}) => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 seconds timeout
    withCredentials: true, // Important for CORS with credentials
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    ...config,
    // Override headers if provided in config
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...config.headers
    }
  });

  // Request interceptor
  instance.interceptors.request.use(
    (config) => {
      // Add timestamp to prevent caching
      config.params = {
        ...config.params,
        t: Date.now()
      };
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor with retry logic
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      // If the error is due to timeout or network error, retry
      if ((error.code === 'ECONNABORTED' || !error.response) && !originalRequest._retry) {
        originalRequest._retry = true;
        
        // Show loading toast
        const toastId = toast.loading('Connecting to server...');
        
        try {
          // Wait for 2 seconds before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
          const response = await instance(originalRequest);
          toast.dismiss(toastId);
          return response;
        } catch (retryError) {
          toast.update(toastId, {
            render: 'Connection failed. Please check your internet connection and try again.',
            type: 'error',
            isLoading: false,
            autoClose: 5000,
          });
          return Promise.reject(retryError);
        }
      }

      if (error.response) {
        switch (error.response.status) {
          case 401:
            toast.error('Session expired. Please log in again.');
            break;
          case 404:
            console.error('Resource not found:', error.config.url);
            toast.error('The requested resource was not found.');
            break;
          case 500:
            console.error('Server error:', error.response.data);
            toast.error('A server error occurred. Please try again later.');
            break;
          case 504:
            toast.error('The server is taking too long to respond. Please try again later.');
            break;
          default:
            console.error('API Error:', error.response.data);
        }
      } else if (error.request) {
        console.error('No response received:', error.request);
        toast.error('No response from server. Please check your connection.');
      } else {
        console.error('Request setup error:', error.message);
        toast.error('An error occurred while setting up the request.');
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

// Create the main API instance
export const api = createApiInstance();

// Create a separate instance for uploads with longer timeout
export const uploadApi = createApiInstance({
  timeout: 120000, // 2 minutes for uploads
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

export default api;