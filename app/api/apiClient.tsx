import axios from "axios";

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true, // Inclure les cookies pour les requêtes cross-origin
});

export { apiClient };
