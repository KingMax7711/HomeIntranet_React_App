import {
    CircleUserRound,
    House,
    LogOut,
    NotebookPen,
    ShoppingBasket,
    Settings,
    Refrigerator,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import { apiClient } from "~/api/apiClient";
import { useAuthStore } from "~/stores/auth";
import type { User } from "~/types/domain";
import { capitalizeAllWords } from "~/tools/formater";
import logo from "../resources/logo.ico";

type HouseDetailed = {
    id: number;
    name: string;
    members: User[];
};

export default function Navbar() {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const endSession = useAuthStore((s) => s.endSession);

    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [house, setHouse] = useState<HouseDetailed | null>(null);
    const [houseStatus, setHouseStatus] = useState<
        "idle" | "loading" | "loaded" | "none" | "error"
    >("idle");

    const fullName = useMemo(() => {
        if (!user) return "Utilisateur";
        return capitalizeAllWords(`${user.first_name} ${user.last_name}`);
    }, [user]);

    useEffect(() => {
        if (!user) {
            setHouse(null);
            setHouseStatus("idle");
            return;
        }

        const controller = new AbortController();
        setHouseStatus("loading");

        (async () => {
            try {
                const r = await apiClient.get<HouseDetailed>("/houses/my_house", {
                    signal: controller.signal,
                });
                setHouse(r.data);
                setHouseStatus("loaded");
            } catch (e) {
                if (axios.isAxiosError(e) && e.code === "ERR_CANCELED") return;

                const status = axios.isAxiosError(e) ? e.response?.status : undefined;
                if (status === 404) {
                    setHouse(null);
                    setHouseStatus("none");
                    return;
                }

                setHouse(null);
                setHouseStatus("error");
            }
        })();

        return () => controller.abort();
    }, [user?.id, user?.house_id]);

    const handleLogout = async () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        try {
            await endSession("LOGOUT");
        } finally {
            setIsLoggingOut(false);
            navigate("/login", { replace: true });
        }
    };

    return (
        <div className="navbar bg-base-100">
            <div className="navbar-start">
                <div className="">
                    <button
                        className="btn btn-ghost normal-case text-xl hidden sm:block"
                        onClick={() => navigate("/")}
                        aria-label="Accueil"
                    >
                        NestBoard
                    </button>
                    <button
                        className="sm:hidden"
                        onClick={() => navigate("/")}
                        aria-label="Accueil"
                    >
                        <img src={logo} alt="Logo" className="w-11 h-11" />
                    </button>
                </div>
            </div>
            <div className="navbar-center">
                <div className="container px-2 rounded-full bg-base-300">
                    <ul className="menu menu-horizontal px-1">
                        <li>
                            <button
                                onClick={() => navigate("/")}
                                className="btn btn-ghost btn-circle"
                                aria-label="Accueil"
                            >
                                <House className="w-6 h-6" />
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => navigate("/shopping_home")}
                                className="btn btn-ghost btn-circle"
                                aria-label="Courses"
                            >
                                <ShoppingBasket className="w-6 h-6" />
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => navigate("/fridge_home")}
                                className="btn btn-ghost btn-circle"
                                aria-label="Frigo"
                            >
                                <Refrigerator className="w-6 h-6" />
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => navigate("/task_home")}
                                className="btn btn-ghost btn-circle"
                                aria-label="Tâches"
                            >
                                <NotebookPen className="w-6 h-6" />
                            </button>
                        </li>
                        <li>
                            <button
                                onClick={() => navigate("/settings")}
                                className="btn btn-ghost btn-circle"
                                aria-label="Paramètres"
                            >
                                <Settings className="w-6 h-6" />
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
            <div className="navbar-end">
                <div className="dropdown dropdown-end dropdown-bottom">
                    <div tabIndex={0} role="button" className="btn btn-circle avatar">
                        <CircleUserRound className="w-6 h-6" />
                    </div>
                    <div
                        tabIndex={0}
                        className="dropdown-content card bg-base-100 z-1 w-80 shadow-md"
                    >
                        <div className="card-body gap-4">
                            <div className="flex items-center gap-3">
                                <div className="btn btn-circle btn-ghost pointer-events-none">
                                    <CircleUserRound className="w-6 h-6" />
                                </div>
                                <div className="min-w-0">
                                    <p className="font-semibold leading-tight truncate">
                                        {fullName}
                                    </p>
                                    <p className="text-sm opacity-70 truncate">
                                        {user?.email ?? ""}
                                    </p>
                                </div>
                            </div>

                            <div className="divider my-0" />

                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <House className="w-4 h-4 opacity-70" />
                                    <span className="text-sm opacity-70">Maison</span>
                                </div>

                                {houseStatus === "loading" ? (
                                    <span className="text-sm opacity-70 flex items-center gap-2">
                                        <span className="loading loading-spinner loading-xs" />
                                        Chargement…
                                    </span>
                                ) : houseStatus === "loaded" ? (
                                    <span className="badge badge-primary badge-outline max-w-48 truncate">
                                        {capitalizeAllWords(house?.name ?? "")}
                                    </span>
                                ) : houseStatus === "none" ? (
                                    <span className="badge badge-ghost badge-outline">
                                        Aucune
                                    </span>
                                ) : houseStatus === "error" ? (
                                    <span className="text-sm text-error">
                                        Indisponible
                                    </span>
                                ) : (
                                    <span className="text-sm opacity-50">—</span>
                                )}
                            </div>

                            <button
                                type="button"
                                className="btn btn-error btn-outline w-full"
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                            >
                                {isLoggingOut ? (
                                    <span className="loading loading-spinner loading-sm" />
                                ) : (
                                    <LogOut className="w-5 h-5" />
                                )}
                                Se déconnecter
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
