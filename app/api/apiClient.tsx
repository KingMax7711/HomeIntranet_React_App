import axios from "axios";

declare module "axios" {
    export interface AxiosRequestConfig {
        skipAuth?: boolean;
        skipAuthRefresh?: boolean;
    }
}

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true, // Inclure les cookies pour les requêtes cross-origin
});

type SetupInterceptorsOptions = {
    getAccessToken: () => string | undefined;
    refreshAccessToken: () => Promise<string>;
    onForcedLogout?: () => void | Promise<void>;
};

let installed = false;
let requestInterceptorId: number | null = null;
let responseInterceptorId: number | null = null;

const setAuthHeader = (headers: unknown, token: string) => {
    if (!headers) return;
    const anyHeaders = headers as any;
    if (typeof anyHeaders.set === "function") {
        anyHeaders.set("Authorization", `Bearer ${token}`);
    } else {
        anyHeaders.Authorization = `Bearer ${token}`;
    }
};

export const setupApiInterceptors = (options: SetupInterceptorsOptions) => {
    if (installed) return;
    installed = true;

    if (requestInterceptorId !== null)
        apiClient.interceptors.request.eject(requestInterceptorId);
    if (responseInterceptorId !== null)
        apiClient.interceptors.response.eject(responseInterceptorId);

    requestInterceptorId = apiClient.interceptors.request.use((config) => {
        const cfg = config as any;
        if (cfg.skipAuth) return config;

        const token = options.getAccessToken();
        if (!token) return config;

        if (!config.headers) cfg.headers = {};
        setAuthHeader(config.headers, token);
        return config;
    });

    responseInterceptorId = apiClient.interceptors.response.use(
        (res) => res,
        async (error) => {
            const status = error?.response?.status as number | undefined;
            const originalConfig = (error?.config ?? {}) as any;

            // Pas de refresh automatique sur ces requêtes (login/refresh/logout…)
            if (originalConfig.skipAuthRefresh) throw error;

            if (status !== 401) throw error;
            if (originalConfig._retry) throw error;
            originalConfig._retry = true;

            try {
                const newToken = await options.refreshAccessToken();
                if (!originalConfig.headers) originalConfig.headers = {};
                setAuthHeader(originalConfig.headers, newToken);
                return await apiClient.request(originalConfig);
            } catch (refreshError) {
                await options.onForcedLogout?.();
                throw refreshError;
            }
        },
    );
};

export { apiClient };
