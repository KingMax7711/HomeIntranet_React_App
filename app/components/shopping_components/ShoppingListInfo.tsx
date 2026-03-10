import { useMemo } from "react";
import type { ShoppingListView } from "~/stores/shopping_list";
import {
    formatDateTime,
    capitalizeFirstLetter,
    capitalizeAllWords,
} from "~/tools/formater";
import { useAuthStore } from "~/stores/auth";

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

export default function ShoppingListInfo({
    view,
    onStartShopping,
    onCreateFreshList,
    onCreateFromLast,
    selectedMallId,
    mallsList,
    onMallChange,
}: {
    view: ShoppingListView | null;
    onStartShopping: () => void;
    onCreateFreshList: () => void;
    onCreateFromLast: () => void;
    selectedMallId: number | null;
    mallsList: { id: number; name: string; location?: string | null }[];
    onMallChange: (mallId: number | null) => void;
}) {
    const computedTotal = useMemo(() => {
        if (!view) return 0;
        const apiTotal = (view as ShoppingListView & { total?: number | null }).total;
        if (typeof apiTotal === "number" && Number.isFinite(apiTotal)) return apiTotal;
        return computeTotalFromItems(view);
    }, [view]);

    const userHouseId = useAuthStore((s) => s.user?.house_id);

    if (!userHouseId) {
        return (
            <div className="card w-full h-fit bg-base-300 shadow-xl">
                <div className="card-body gap-5">
                    <h2 className="card-title">Aucune maison associée</h2>
                    <p className="text-sm opacity-70">
                        Votre compte n'est actuellement associé à aucune maison. <br />
                        {"\n"}
                        <span className="italic">
                            Merci de créer ou rejoindre une maison pour accéder aux
                            fonctionnalités de gestion des listes de courses.{" "}
                        </span>
                    </p>
                </div>
            </div>
        );
    }

    if (!view)
        return (
            <div className="card w-full h-fit bg-base-300 shadow-xl">
                <div className="card-body gap-5">
                    <h2 className="card-title">Aucune liste de courses</h2>
                    <p className="text-sm opacity-70">
                        Aucune liste de courses n'est actuellement active. <br />
                        {"\n"}
                        <span className="italic">
                            Vous pouvez en créer une nouvelle ou importer les articles non
                            trouvés de la dernière liste.{" "}
                        </span>
                    </p>
                    <div className="divider my-0" />
                    {/* sélection du magasin pour la nouvelle liste */}
                    <div className="flex flex-col gap-3">
                        <select
                            className="select select-bordered w-full md:w-4/5 self-center"
                            value={selectedMallId ?? ""}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (!v) {
                                    onMallChange(null);
                                    return;
                                }
                                const n = Number(v);
                                if (!Number.isFinite(n)) return;
                                onMallChange(n);
                            }}
                        >
                            <option value="">Sélectionner un magasin</option>
                            {mallsList.map((mall) => (
                                <option key={mall.id} value={mall.id}>
                                    {capitalizeFirstLetter(
                                        mall.name?.trim() || "Magasin",
                                    )}
                                    {" - "}
                                    {capitalizeFirstLetter(
                                        mall.location?.trim() || "Localisation",
                                    )}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col md:flex-row gap-3">
                        <button
                            type="button"
                            className="btn btn-secondary w-full md:w-1/2"
                            disabled={!selectedMallId}
                            onClick={() => {
                                onCreateFreshList();
                            }}
                        >
                            {" "}
                            Créer une nouvelle liste
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary w-full md:w-1/2"
                            disabled={!selectedMallId}
                            onClick={() => {
                                onCreateFromLast();
                            }}
                        >
                            Importer la dernière liste
                        </button>
                    </div>
                </div>
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
                        className="btn btn-primary w-full"
                        onClick={() => {
                            onStartShopping();
                        }}
                    >
                        Démarrer les courses
                    </button>
                </div>
            </div>
        </div>
    );
}
