import { useMemo } from "react";
import { useNavigate } from "react-router";
import type { ShoppingListView } from "~/stores/shopping_list";
import {
    capitalizeAllWords,
    formatCurrencyEUR,
    formatDateTime,
    capitalizeFirstLetter,
} from "~/tools/formater";

const statusLabel = (status: ShoppingListView["status"]) => {
    switch (status) {
        case "preparation":
            return "Préparation";
        case "in_progress":
            return "En cours";
        case "completed":
            return "Terminée";
        default:
            return status;
    }
};

const statusBadgeClass = (status: ShoppingListView["status"]) => {
    switch (status) {
        case "preparation":
            return "badge badge-ghost badge-outline";
        case "in_progress":
            return "badge badge-warning badge-outline";
        case "completed":
            return "badge badge-success badge-outline";
        default:
            return "badge badge-ghost badge-outline";
    }
};

const computeTotalFromItems = (view: ShoppingListView): number => {
    const items = view.items ?? [];
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, item) => {
        const quantity =
            typeof item?.quantity === "number" && Number.isFinite(item.quantity)
                ? item.quantity
                : 0;
        const price =
            typeof item?.price === "number" && Number.isFinite(item.price)
                ? item.price
                : 0;
        return sum + quantity * price;
    }, 0);
};

export default function LastShoppingListInfoCard({
    view,
}: {
    view: ShoppingListView | null;
}) {
    const total = useMemo(() => {
        if (!view) return 0;
        // Sur la "dernière liste" la DB fournit normalement `total`.
        const apiTotal = (view as ShoppingListView & { total?: number | null }).total;
        if (typeof apiTotal === "number" && Number.isFinite(apiTotal)) return apiTotal;
        return computeTotalFromItems(view);
    }, [view]);

    const navigate = useNavigate();

    if (!view) {
        return (
            <div className="card w-full h-full bg-base-300 shadow-xl">
                <div className="card-body">
                    <h2 className="card-title">Dernière liste</h2>
                    <p className="text-sm opacity-70">
                        Aucune liste précédente disponible.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="card w-full h-fit bg-base-300 shadow-xl">
            <div className="card-body gap-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="card-title">Dernière liste</h2>
                        <p className="text-sm opacity-70 truncate">
                            {capitalizeAllWords(
                                view.house_name?.trim() ?? "Maison inconnue",
                            )}
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <span className={statusBadgeClass(view.status)}>
                            {statusLabel(view.status)}
                        </span>
                    </div>
                </div>

                <div className="divider my-0" />

                <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm opacity-70">Magasin</span>
                        <span className="font-medium text-right truncate max-w-[60%]">
                            {view.mall_name?.trim()
                                ? capitalizeFirstLetter(view.mall_name.trim())
                                : "—"}
                        </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm opacity-70">Localisation</span>
                        <span className="font-medium text-right truncate max-w-[60%]">
                            {view.mall_location?.trim()
                                ? capitalizeFirstLetter(view.mall_location.trim())
                                : "—"}
                        </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm opacity-70">Fermée le</span>
                        <span className="font-medium text-right">
                            {view.closed_at ? formatDateTime(view.closed_at) : "—"}
                        </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm opacity-70">Total</span>
                        <span className="font-semibold text-right">
                            {formatCurrencyEUR(total)}
                        </span>
                    </div>

                    <button
                        className="btn btn-sm btn-outline mt-2 self-end"
                        onClick={() => navigate(`/shopping_history/all`)}
                    >
                        Voir l'historique
                    </button>
                </div>
            </div>
        </div>
    );
}
