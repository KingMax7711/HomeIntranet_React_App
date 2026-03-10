import { useMemo } from "react";
import type { ShoppingListView } from "~/stores/shopping_list";
import {
    formatDateTime,
    capitalizeFirstLetter,
    capitalizeAllWords,
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

const formatCurrencyEUR = (value: number) => {
    const safe = Number.isFinite(value) ? value : 0;
    return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 2,
    }).format(safe);
};

export default function ShoppingListInProgressInfo({
    view,
    onEndShopping,
    isEndingShopping = false,
}: {
    view: ShoppingListView | null;
    onEndShopping: () => void;
    isEndingShopping?: boolean;
}) {
    const computedTotal = useMemo(() => {
        if (!view) return 0;
        const apiTotal = (view as ShoppingListView & { total?: number | null }).total;
        if (typeof apiTotal === "number" && Number.isFinite(apiTotal)) return apiTotal;
        return computeTotalFromItems(view);
    }, [view]);

    if (!view)
        return (
            <div className="card w-full h-full bg-base-300 shadow-xl">
                <h2 className="card-title">Aucune liste de courses</h2>
                <p className="text-sm opacity-70">
                    Créez votre première liste pour commencer à ajouter des articles.
                </p>
            </div>
        );

    return (
        <div className="card w-full h-fit bg-base-300 shadow-xl">
            <div className="card-body gap-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="card-title">Liste de courses</h2>
                        <p className="text-sm opacity-70 truncate">
                            {capitalizeAllWords(
                                view.house_name?.trim() ?? "Maison inconnue",
                            )}
                        </p>
                    </div>
                    <span className={statusBadgeClass(view.status)}>
                        {statusLabel(view.status)}
                    </span>
                </div>

                <div className="divider my-0" />

                <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm opacity-70">Magasin</span>
                        <span className="font-medium text-right truncate max-w-[60%]">
                            {capitalizeFirstLetter(view.mall_name?.trim() ?? "") || "—"}
                        </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm opacity-70">Localisation</span>
                        <span className="font-medium text-right truncate max-w-[60%]">
                            {capitalizeFirstLetter(view.mall_location?.trim() ?? "") ||
                                "—"}
                        </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm opacity-70">Créée le</span>
                        <span className="font-medium text-right">
                            {view.created_at ? formatDateTime(view.created_at) : "—"}
                        </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm opacity-70">Total</span>
                        <span className="font-semibold text-right">
                            {formatCurrencyEUR(computedTotal)}
                        </span>
                    </div>
                </div>

                <div className="divider my-0" />

                <div className="flex">
                    <button
                        type="button"
                        className="btn btn-error btn-outline w-full"
                        disabled={isEndingShopping}
                        aria-busy={isEndingShopping}
                        onClick={() => {
                            onEndShopping();
                        }}
                    >
                        {isEndingShopping && (
                            <span
                                className="loading loading-spinner loading-sm"
                                aria-hidden="true"
                            />
                        )}
                        {isEndingShopping
                            ? "Finalisation des courses..."
                            : "Terminer les courses"}
                    </button>
                </div>
            </div>
        </div>
    );
}
