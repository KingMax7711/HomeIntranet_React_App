import { create } from "zustand";
import axios from "axios";
import { apiClient } from "../api/apiClient";
import { useAuthStore } from "./auth";

export type UserInList = {
    id: number;
    first_name: string;
    last_name: string;
};

export type ProductBase = {
    id: number;
    name: string;
    comment?: string;
    category?: string;
};

export type ShoppingListItemDetailed = {
    id: number;
    quantity: number;
    price?: number;
    status: "pending" | "found" | "not_found" | "given_up";
    in_promotion?: boolean;

    product?: ProductBase | null;
    affected_user?: UserInList | null;
};

export type ShoppingListView = {
    id: number;

    house_name?: string | null;

    mall_name?: string | null;
    mall_location?: string | null;

    items?: ShoppingListItemDetailed[] | null;

    created_at?: string | null;
    closed_at?: string | null;
    status: "preparation" | "in_progress" | "completed";
    total?: number;

    version: number;
};

type ShoppingListSyncStatus =
    | "idle"
    | "starting"
    | "syncing"
    | "ready"
    | "no-list"
    | "recovering"
    | "error";

export type ShoppingListError = { code: string; message: string };

type HeartbeatId = ReturnType<typeof setInterval>;

type ShoppingListState = {
    enabled: boolean;
    status: ShoppingListSyncStatus;
    error: ShoppingListError | null;
    lastEvent: string;

    view: ShoppingListView | null;
    etag: string | null;
    lastSyncAt: number | null;

    _inFlight: Promise<ShoppingListView | null> | null;
    _heartbeatId: HeartbeatId | null;
    _heartbeatDelay: number;

    _setStatus: (status: ShoppingListSyncStatus) => void;
    _setError: (code: string | null, message: string) => void;
    _setEvent: (evt: string) => void;

    clear: () => void;
    startSync: () => Promise<ShoppingListView | null>;
    stopSync: () => void;
    forceSync: () => Promise<ShoppingListView | null>;
    ensureSync: () => Promise<ShoppingListView | null>;

    _fetchSync: (opts?: {
        ignoreEtag?: boolean;
    }) => Promise<
        | { kind: "updated"; view: ShoppingListView; etag: string | null }
        | { kind: "not-modified"; etag: string | null }
        | { kind: "no-list" }
    >;

    _desiredHeartbeatDelay: () => number;
    _adjustHeartbeat: () => void;
    startHeartbeat: () => void;
    stopHeartbeat: () => void;
};

type LogLevel = "info" | "warn" | "error";
const log = (level: LogLevel, msg: string, meta?: unknown) => {
    const prefix = `[SHOPPING ${level.toUpperCase()}]`;
    const fn = console[level] ?? console.log;
    if (meta !== undefined) fn(`(${new Date().toLocaleTimeString()})`, prefix, msg, meta);
    else fn(`(${new Date().toLocaleTimeString()})`, prefix, msg);
};

const getHttpStatus = (e: unknown): number | undefined => {
    if (!axios.isAxiosError(e)) return undefined;
    return e.response?.status;
};

const getEtagHeader = (headers: unknown): string | null => {
    if (!headers || typeof headers !== "object") return null;
    const h = headers as Record<string, unknown>;
    const etag = h.etag ?? h.ETag;
    return typeof etag === "string" && etag.trim() ? etag.trim() : null;
};

const endpointSynchronize = "/shopping_list_view/shopping_list/synchronize";

export const useShoppingListStore = create<ShoppingListState>((set, get) => ({
    enabled: false,
    status: "idle",
    error: null,
    lastEvent: "",

    view: null,
    etag: null,
    lastSyncAt: null,

    _inFlight: null,
    _heartbeatId: null,
    _heartbeatDelay: 3000,

    _setStatus: (status) => set({ status }),
    _setError: (code, message) => set({ error: code ? { code, message } : null }),
    _setEvent: (evt) => set({ lastEvent: evt }),

    clear: () => {
        set({ view: null, etag: null, lastSyncAt: null, error: null, lastEvent: "" });
    },

    _fetchSync: async ({ ignoreEtag } = {}) => {
        const etag = ignoreEtag ? null : get().etag;
        const headers: Record<string, string> = {};
        if (etag) headers["If-None-Match"] = etag;

        const res = await apiClient.get<ShoppingListView>(endpointSynchronize, {
            headers,
            validateStatus: (s) => (s >= 200 && s < 300) || s === 304 || s === 404,
        });

        const newEtag = getEtagHeader(res.headers);
        if (res.status === 304) return { kind: "not-modified", etag: newEtag };
        if (res.status === 404) return { kind: "no-list" };
        return { kind: "updated", view: res.data, etag: newEtag };
    },

    ensureSync: async () => {
        const state = get();
        if (!state.enabled) return state.view;
        if (state._inFlight) return state._inFlight;

        const promise = (async () => {
            set({ error: null });
            if (!["ready", "no-list"].includes(get().status)) get()._setStatus("syncing");
            log("info", "Synchronisation liste de courses");

            try {
                const r = await get()._fetchSync();

                if (r.kind === "no-list") {
                    set({ view: null, etag: null, lastSyncAt: Date.now() });
                    get()._setStatus("no-list");
                    get()._setEvent("no-current-list");
                    log("info", "Aucune liste en cours (404)");
                    return null;
                }

                if (r.kind === "not-modified") {
                    if (r.etag) set({ etag: r.etag });
                    set({ lastSyncAt: Date.now() });
                    if (!["ready", "no-list"].includes(get().status))
                        get()._setStatus("ready");
                    get()._setEvent("not-modified");
                    log("info", "Liste inchangée (304)");
                    return get().view;
                }

                const derivedEtag = r.etag ?? `"${r.view.version}"`;
                set({ view: r.view, etag: derivedEtag, lastSyncAt: Date.now() });
                get()._setStatus("ready");
                get()._setEvent("updated");
                log("info", `Liste mise à jour (v${r.view.version})`);
                return r.view;
            } catch (e) {
                const code = getHttpStatus(e);
                const net = !axios.isAxiosError(e) || !e.response;

                if (net) {
                    log("warn", "Erreur réseau -> recovering", e);
                    // Aligner l'UX: si l'API tombe, on déclenche aussi la logique "recovering" d'auth
                    // pour afficher le message global (et typiquement démonter les routes qui arrêtent le polling).
                    useAuthStore
                        .getState()
                        .forceReconnect()
                        .catch(() => {});
                    get()._setStatus("recovering");
                    get()._setError("NETWORK", "API injoignable");
                } else {
                    log("error", "Erreur API liste de courses", e);
                    get()._setStatus("error");
                    get()._setError(`HTTP_${code ?? "UNKNOWN"}`, "Echec synchronisation");
                }
                throw e;
            } finally {
                get()._adjustHeartbeat();
            }
        })();

        set({ _inFlight: promise });
        try {
            return await promise;
        } finally {
            set({ _inFlight: null });
        }
    },

    forceSync: async () => {
        if (!get().enabled) return get().view;
        if (get()._inFlight) return get()._inFlight;
        log("info", "Force sync liste de courses");

        const promise = (async () => {
            set({ error: null });
            get()._setStatus("syncing");
            try {
                const r = await get()._fetchSync({ ignoreEtag: true });
                if (r.kind === "no-list") {
                    set({ view: null, etag: null, lastSyncAt: Date.now() });
                    get()._setStatus("no-list");
                    get()._setEvent("no-current-list");
                    return null;
                }

                if (r.kind === "not-modified") {
                    if (r.etag) set({ etag: r.etag });
                    set({ lastSyncAt: Date.now() });
                    get()._setStatus("ready");
                    get()._setEvent("not-modified");
                    return get().view;
                }

                const derivedEtag = r.etag ?? `"${r.view.version}"`;
                set({ view: r.view, etag: derivedEtag, lastSyncAt: Date.now() });
                get()._setStatus("ready");
                get()._setEvent("updated");
                return r.view;
            } finally {
                get()._adjustHeartbeat();
            }
        })();

        set({ _inFlight: promise });
        try {
            return await promise;
        } finally {
            set({ _inFlight: null });
        }
    },

    startSync: async () => {
        if (get().enabled) return get().view;
        log("info", "Démarrage sync liste de courses");
        set({ enabled: true });
        get()._setStatus(get().status === "idle" ? "starting" : get().status);
        get().startHeartbeat();
        try {
            return await get().ensureSync();
        } catch {
            // On laisse le store vivre (recovering/error) et le heartbeat retentera.
            return get().view;
        }
    },

    stopSync: () => {
        if (!get().enabled) return;
        log("info", "Arrêt sync liste de courses");
        set({ enabled: false });
        get().stopHeartbeat();
        get()._setStatus("idle");
        get()._setEvent("stopped");
    },

    _desiredHeartbeatDelay: () => (get().status === "recovering" ? 15000 : 3000),

    _adjustHeartbeat: () => {
        const { _heartbeatId, _heartbeatDelay } = get();
        if (!_heartbeatId) return;
        const desired = get()._desiredHeartbeatDelay();
        if (desired !== _heartbeatDelay) {
            clearInterval(_heartbeatId);
            const id = setInterval(() => {
                if (!get().enabled) return;
                get()
                    .ensureSync()
                    .catch(() => {});
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
            if (!get().enabled) return;
            get()
                .ensureSync()
                .catch(() => {});
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
}));
