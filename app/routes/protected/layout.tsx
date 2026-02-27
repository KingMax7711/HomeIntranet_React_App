import { Outlet, useLocation, useNavigate } from "react-router";
import { useEffect, useRef } from "react";
import Navbar from "~/components/navbar";

import { useAuthStore } from "../../stores/auth";

export default function ProtectedLayout() {
    return (
        <div className="min-h-screen flex flex-col">
            <RequireAuth>
                <Navbar />
                <Outlet />
            </RequireAuth>
        </div>
    );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const navigate = useNavigate();
    const status = useAuthStore((s) => s.status);
    const error = useAuthStore((s) => s.error);
    const forceReconnect = useAuthStore((s) => s.forceReconnect);

    const didRedirect = useRef(false);

    useEffect(() => {
        if (status !== "unauthenticated" && status !== "forced-logout") {
            didRedirect.current = false;
            return;
        }

        // Si jamais ce layout est monté sur une route d'auth, éviter une redirection en boucle.
        if (location.pathname === "/login" || location.pathname === "/register") return;
        if (didRedirect.current) return;
        didRedirect.current = true;

        const from = `${location.pathname}${location.search}${location.hash}`;
        navigate("/login", { replace: true, state: { from } });
    }, [location.hash, location.pathname, location.search, navigate, status]);

    if (status === "authenticated") return <>{children}</>;

    if (status === "unauthenticated" || status === "forced-logout") {
        return (
            <div className="flex flex-1 items-center justify-center bg-base-100">
                <div className="w-full max-w-md p-4 bg-base-200 rounded-lg shadow-md">
                    <div className="flex items-center gap-3">
                        <span className="loading loading-spinner loading-md" />
                        <h1 className="text-lg font-semibold">Redirection…</h1>
                    </div>
                </div>
            </div>
        );
    }

    // initializing | recovering
    return (
        <div className="flex flex-1 items-center justify-center bg-base-100">
            <div className="w-full max-w-md p-4 bg-base-200 rounded-lg shadow-md">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <span className="loading loading-spinner loading-md" />
                        <h1 className="text-lg font-semibold">Chargement…</h1>
                    </div>

                    {error?.code === "NETWORK" ? (
                        <div className="alert alert-error">
                            <span className="italic text-center">
                                Nous semblons rencontrer des problèmes de connexion.
                                Veuillez vérifier votre réseau et réessayer.
                            </span>
                        </div>
                    ) : error ? (
                        <div className="alert alert-warning">
                            <span>{error.message}</span>
                        </div>
                    ) : null}

                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                            forceReconnect().catch(() => {});
                        }}
                    >
                        Réessayer
                    </button>
                </div>
            </div>
        </div>
    );
}
