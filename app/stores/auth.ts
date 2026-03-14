import { create } from "zustand";
import axios, { type AxiosError } from "axios";

import { apiClient } from "../api/apiClient";
import { setupApiInterceptors } from "../api/apiClient";
import type { User } from "../types/domain";

type AuthStatus =
    | "initializing"
    | "recovering"
    | "authenticated"
    | "unauthenticated"
    | "forced-logout";

export type AuthError = { code: string; message: string };
export type AuthUser = User;
type EndSessionReason =
    | "LOGOUT"
    | "FORCED"
    | "NO_REFRESH"
    | "TOKEN_VERSION"
    | (string & {});

type HeartbeatId = ReturnType<typeof setInterval>;

type AuthState = {
    token: string;
    user: AuthUser | null;
    status: AuthStatus;
    error: AuthError | null;
    lastEvent: string;
    _inFlight: Promise<AuthUser> | null;
    _heartbeatId: HeartbeatId | null;
    _heartbeatDelay: number;

    _setStatus: (status: AuthStatus) => void;
    _setError: (code: string | null, message: string) => void;
    _setEvent: (evt: string) => void;

    setToken: (token: string) => void;
    setUser: (user: AuthUser | null) => void;
    isAuthenticated: () => boolean;
    clearSession: () => void;

    endSession: (reason?: EndSessionReason) => Promise<void>;
    refreshAccess: () => Promise<string>;
    _fetchMe: (token: string) => Promise<AuthUser>;
    ensureSession: () => Promise<AuthUser>;

    _desiredHeartbeatDelay: () => number;
    _adjustHeartbeat: () => void;
    startHeartbeat: () => void;
    stopHeartbeat: () => void;
    forceReconnect: () => Promise<AuthUser | void>;
};

type LogLevel = "info" | "warn" | "error";
const log = (level: LogLevel, msg: string, meta?: unknown) => {
    const prefix = `[AUTH ${level.toUpperCase()}]`;
    const fn = console[level] ?? console.log;
    if (meta !== undefined) fn(`(${new Date().toLocaleTimeString()})`, prefix, msg, meta);
    else fn(`(${new Date().toLocaleTimeString()})`, prefix, msg);
};

const getHttpStatus = (e: unknown): number | undefined => {
    if (!axios.isAxiosError(e)) return undefined;
    return e.response?.status;
};

export const useAuthStore = create<AuthState>((set, get) => ({
    token: "",
    user: null,
    status: "initializing",
    error: null,
    lastEvent: "",
    _inFlight: null,
    _heartbeatId: null,
    _heartbeatDelay: 30000,

    _setStatus: (status) => set({ status }),
    _setError: (code, message) => set({ error: code ? { code, message } : null }),
    _setEvent: (evt) => set({ lastEvent: evt }),

    setToken: (token) => set({ token }),
    setUser: (user) => set({ user }),
    isAuthenticated: () => get().status === "authenticated" && !!get().user,
    clearSession: () => set({ token: "", user: null }),

    endSession: async (reason: EndSessionReason = "LOGOUT") => {
        log("info", `Fin de session (${reason})`);
        get().stopHeartbeat();
        set({ token: "", user: null });
        if (["FORCED", "TOKEN_VERSION"].includes(reason))
            get()._setStatus("forced-logout");
        else get()._setStatus("unauthenticated");

        // Best-effort côté serveur; on ne bloque pas l'UI/la redirection sur le réseau.
        void apiClient
            .post("/auth/logout", {}, { skipAuth: true, skipAuthRefresh: true })
            .catch(() => {});
    },

    refreshAccess: async () => {
        log("info", "Refresh access token");
        try {
            const r = await apiClient.post(
                "/auth/refresh",
                {},
                { skipAuth: true, skipAuthRefresh: true },
            );
            const access = (r.data as { access_token?: unknown } | undefined)
                ?.access_token;
            if (typeof access !== "string" || !access) {
                throw new Error("Missing access token in refresh response");
            }
            set({ token: access });
            log("info", "Refresh OK");
            return access;
        } catch (e) {
            const code = getHttpStatus(e);
            if (code === 403) {
                log("warn", "Refresh 403 -> forced logout");
                await get().endSession("FORCED");
            } else if (code === 401) {
                log("warn", "Refresh 401 -> no valid refresh token");
                await get().endSession("NO_REFRESH");
            } else {
                log("error", "Refresh erreur réseau/serveur", e);
            }
            throw e;
        }
    },

    _fetchMe: async (token: string) => {
        const r = await apiClient.get<AuthUser>("/users/me", {
            headers: { Authorization: `Bearer ${token}` },
            skipAuthRefresh: true,
        });
        return r.data;
    },

    ensureSession: async () => {
        const state = get();
        if (state._inFlight) return state._inFlight;

        const promise = (async () => {
            const first = state.status === "initializing";
            log("info", first ? "Init session" : "Check session");
            set({ error: null });

            let token = get().token;
            try {
                if (!token) {
                    log("info", "Pas d'access token -> tentative de refresh");
                    token = await get().refreshAccess();
                }

                let me: AuthUser;
                try {
                    me = await get()._fetchMe(token);
                } catch (e) {
                    const code = getHttpStatus(e);
                    if (code === 401) {
                        log("warn", "/users/me 401 -> tentative refresh");
                        token = await get().refreshAccess();
                        me = await get()._fetchMe(token);
                    } else if (code === 403) {
                        log("warn", "/users/me 403 -> forced logout");
                        await get().endSession("FORCED");
                        throw e;
                    } else {
                        throw e;
                    }
                }

                set({ user: me });
                get()._setStatus("authenticated");
                get()._setEvent("session-ok");
                if (!get()._heartbeatId) get().startHeartbeat();
                else get()._adjustHeartbeat();
                return me;
            } catch (e) {
                if (["forced-logout", "unauthenticated"].includes(get().status)) {
                    get()._setEvent("session-ended");
                } else {
                    const net = !axios.isAxiosError(e) || !e.response;
                    if (net) {
                        log("warn", "Erreur réseau -> recovering", e);
                        get()._setStatus(first ? "initializing" : "recovering");
                        get()._setError("NETWORK", "API injoignable");
                        if (!first) {
                            if (!get()._heartbeatId) get().startHeartbeat();
                            else get()._adjustHeartbeat();
                        }
                    } else {
                        const code = (e as AxiosError).response?.status;
                        get()._setError(`HTTP_${code ?? "UNKNOWN"}`, "Echec session");
                        get()._setStatus("unauthenticated");
                    }
                }
                throw e;
            }
        })();

        set({ _inFlight: promise });
        try {
            return await promise;
        } finally {
            set({ _inFlight: null });
        }
    },

    _desiredHeartbeatDelay: () => (get().status === "recovering" ? 15000 : 30000),

    _adjustHeartbeat: () => {
        const { _heartbeatId, _heartbeatDelay } = get();
        if (!_heartbeatId) return;
        const desired = get()._desiredHeartbeatDelay();
        if (desired !== _heartbeatDelay) {
            clearInterval(_heartbeatId);
            const id = setInterval(() => {
                const st = get().status;
                if (st === "authenticated" || st === "recovering") {
                    get()
                        .ensureSession()
                        .catch(() => {});
                }
                get()._adjustHeartbeat();
            }, desired);
            set({ _heartbeatId: id, _heartbeatDelay: desired });
        }
    },

    startHeartbeat: () => {
        const { _heartbeatId } = get();
        if (_heartbeatId) return;
        const delay = get()._desiredHeartbeatDelay();
        const id = setInterval(() => {
            const st = get().status;
            if (st === "authenticated" || st === "recovering") {
                get()
                    .ensureSession()
                    .catch(() => {});
            }
            get()._adjustHeartbeat();
        }, delay);
        set({ _heartbeatId: id, _heartbeatDelay: delay });
    },

    stopHeartbeat: () => {
        const { _heartbeatId } = get();
        if (_heartbeatId) {
            clearInterval(_heartbeatId);
            set({ _heartbeatId: null });
        }
    },

    forceReconnect: () => {
        const { status, _inFlight } = get();
        if (_inFlight) return _inFlight;
        if (!["initializing", "authenticated"].includes(status))
            get()._setStatus("recovering");
        return get()
            .ensureSession()
            .catch(() => {});
    },
}));

// Installer les interceptors Axios une seule fois au chargement du module.
setupApiInterceptors({
    getAccessToken: () => useAuthStore.getState().token,
    refreshAccessToken: () => useAuthStore.getState().refreshAccess(),
    onForcedLogout: async () => {
        await useAuthStore.getState().endSession("FORCED");
    },
});

export const initializeSessionFromToken = async (accessToken: string) => {
    const { setToken, ensureSession } = useAuthStore.getState();
    setToken(accessToken);
    try {
        await ensureSession();
    } catch {
        // ensureSession peut échouer (réseau); le status reflète l'état
    }
};
