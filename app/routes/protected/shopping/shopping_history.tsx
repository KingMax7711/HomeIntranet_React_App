import type { Route } from "./+types/shopping_history";
import type {
    ShoppingListRecap,
    ShoppingListRecapDetailed,
    ShoppingListItemDetailed,
} from "~/types/shoppingHistory";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import axios from "axios";
import { apiClient } from "~/api/apiClient";
import ShoppingHistoryRecapCard from "~/components/shopping_components/ShoppingHistoryRecapCard";
import ShoppingHistoryDetailedItemCard, {
    type AddToListState,
} from "~/components/shopping_components/ShoppingHistoryDetailedItemCard";
import { useShoppingListStore } from "~/stores/shopping_list";
import {
    capitalizeAllWords,
    capitalizeFirstLetter,
    formatCurrencyEUR,
    formatDateTime,
} from "~/tools/formater";

export function meta({}: Route.MetaArgs) {
    return [{ title: "NestBoard - Historique" }];
}

const endpointRegisterArticle = "/shopping_list_globals/register_article";

const statusLabel = (status: ShoppingListRecapDetailed["status"]) => {
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

const statusBadgeClass = (status: ShoppingListRecapDetailed["status"]) => {
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

export default function ShoppingHistory() {
    const { id } = useParams();
    const shoppingList = useShoppingListStore((s) => s.view);
    const [recaps, setRecaps] = useState<ShoppingListRecap[]>([]);
    const [recapStatus, setRecapStatus] = useState<
        "idle" | "loading" | "loaded" | "error"
    >("idle");
    const [detail, setDetail] = useState<ShoppingListRecapDetailed | null>(null);
    const [detailStatus, setDetailStatus] = useState<
        "idle" | "loading" | "loaded" | "not-found" | "error"
    >("idle");
    const [addToListById, setAddToListById] = useState<Record<number, AddToListState>>(
        {},
    );

    useEffect(() => {
        if (id !== "all") return;

        const controller = new AbortController();
        setRecapStatus("loading");

        (async () => {
            try {
                const r = await apiClient.get<ShoppingListRecap[]>(
                    "/shopping_list_history/recap_list",
                    {
                        signal: controller.signal,
                    },
                );
                setRecaps(Array.isArray(r.data) ? r.data : []);
                setRecapStatus("loaded");
            } catch (e) {
                if (axios.isAxiosError(e) && e.code === "ERR_CANCELED") return;
                setRecaps([]);
                setRecapStatus("error");
            }
        })();

        return () => controller.abort();
    }, [id]);

    useEffect(() => {
        if (!id || id === "all") return;

        const numericId = Number(id);
        if (!Number.isInteger(numericId) || numericId <= 0) return;

        const controller = new AbortController();
        setDetailStatus("loading");

        (async () => {
            try {
                const r = await apiClient.get<ShoppingListRecapDetailed>(
                    `/shopping_list_history/recap/${numericId}`,
                    {
                        signal: controller.signal,
                    },
                );
                setDetail(r.data);
                setDetailStatus("loaded");
            } catch (e) {
                if (axios.isAxiosError(e) && e.code === "ERR_CANCELED") return;

                const status = axios.isAxiosError(e) ? e.response?.status : undefined;

                if (status === 404) {
                    setDetail(null);
                    setDetailStatus("not-found");
                    return;
                }

                setDetail(null);
                setDetailStatus("error");
            }
        })();

        return () => controller.abort();
    }, [id]);

    const historyId = Number(id);
    const houseName = detail?.house_name?.trim()
        ? capitalizeAllWords(capitalizeFirstLetter(detail.house_name.trim()))
        : "Maison inconnue";
    const mallName = detail?.mall_name?.trim()
        ? capitalizeAllWords(capitalizeFirstLetter(detail.mall_name.trim()))
        : "—";
    const mallLocation = detail?.mall_location?.trim()
        ? capitalizeAllWords(capitalizeFirstLetter(detail.mall_location.trim()))
        : "—";
    const items = Array.isArray(detail?.items) ? detail.items : [];
    const groupedItems = useMemo(() => {
        const sorted = [...items].sort((a, b) => {
            const catA = (a.product?.category ?? "").trim().toLowerCase();
            const catB = (b.product?.category ?? "").trim().toLowerCase();
            if (catA !== catB) return catA.localeCompare(catB);

            const nameA = (a.product?.name ?? "").trim().toLowerCase();
            const nameB = (b.product?.name ?? "").trim().toLowerCase();
            return nameA.localeCompare(nameB);
        });

        const map = new Map<string, ShoppingListItemDetailed[]>();
        for (const item of sorted) {
            const raw = item.product?.category?.trim() || "Sans catégorie";
            const label = capitalizeFirstLetter(raw);
            if (!map.has(label)) map.set(label, []);
            map.get(label)?.push(item);
        }

        return Array.from(map.entries()).map(([category, categoryItems]) => ({
            category,
            items: categoryItems,
        }));
    }, [items]);

    if (!id || (isNaN(Number(id)) && id !== "all")) {
        return (
            <div className="pt-4 md:px-4 md:max-w-3/4 xxl:max-w-2/3 mx-auto">
                <div className="card bg-base-300 shadow-xl">
                    <div className="card-body gap-4">
                        <h2 className="card-title">Historique des courses</h2>
                        <p className="text-sm text-error">
                            Il semblerait que l'identifiant fourni ne soit pas valide.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (id === "all") {
        return (
            <div className="pt-4 md:px-4 md:max-w-3/4 xxl:max-w-2/3 mx-auto">
                <div className="card bg-base-300 shadow-xl">
                    <div className="card-body gap-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h2 className="card-title">Historique des courses</h2>
                                <p className="text-sm opacity-70">
                                    Les 10 dernières listes complétées.
                                </p>
                            </div>
                            {recapStatus === "loaded" ? (
                                <span className="badge badge-ghost badge-outline shrink-0">
                                    {recaps.length} résultat
                                    {recaps.length > 1 ? "s" : ""}
                                </span>
                            ) : null}
                        </div>

                        <div className="divider my-0" />

                        {recapStatus === "loading" ? (
                            <p className="text-sm opacity-70 flex items-center gap-2">
                                <span className="loading loading-spinner loading-xs" />
                                Chargement…
                            </p>
                        ) : recapStatus === "error" ? (
                            <p className="text-sm text-error">
                                Impossible de charger l'historique pour le moment.
                            </p>
                        ) : recaps.length === 0 ? (
                            <p className="text-sm opacity-70">
                                Aucune liste de courses terminée à afficher.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {recaps.map((recap) => (
                                    <ShoppingHistoryRecapCard
                                        key={recap.id}
                                        recap={recap}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (!Number.isInteger(historyId) || historyId <= 0) {
        return <div>Il semblerait que l'ID fourni ne soit pas valide.</div>;
    }

    const handleAddToList = (item: ShoppingListItemDetailed) => {
        const listId = shoppingList?.id;
        if (!listId) {
            alert("Aucune liste de courses active.");
            return;
        }

        const productId = item.product?.id;
        if (!productId) {
            alert("Impossible d'ajouter cet article : produit manquant.");
            return;
        }

        const currentState = addToListById[item.id] ?? "idle";
        if (currentState !== "idle") return;

        (async () => {
            setAddToListById((prev) => ({ ...prev, [item.id]: "adding" }));
            try {
                const price =
                    typeof item.price === "number" && Number.isFinite(item.price)
                        ? item.price
                        : 0;
                const quantity =
                    typeof item.quantity === "number" && Number.isFinite(item.quantity)
                        ? item.quantity
                        : 1;

                const payload = {
                    shopping_list: listId,
                    in_promotion: item.in_promotion,
                    need_coupons: item.need_coupons,
                    price,
                    quantity,
                    product: productId,
                };

                await apiClient.post(endpointRegisterArticle, payload);
                setAddToListById((prev) => ({ ...prev, [item.id]: "added" }));
            } catch (e) {
                const detail = axios.isAxiosError(e)
                    ? (e.response?.data as any)?.detail
                    : undefined;

                alert(
                    typeof detail === "string" && detail.trim()
                        ? detail
                        : "Impossible d’ajouter l’article à la liste.",
                );
                setAddToListById((prev) => ({ ...prev, [item.id]: "idle" }));
            }
        })();
    };

    return (
        <div className="pt-4 md:px-4 md:max-w-3/4 xxl:max-w-2/3 mx-auto">
            <div className="card bg-base-300 shadow-xl">
                <div className="card-body gap-3 md:gap-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <h2 className="card-title">
                                Détail de la liste #{historyId}
                            </h2>
                            {detail ? (
                                <p className="text-sm opacity-70 truncate">{houseName}</p>
                            ) : null}
                        </div>
                        <Link
                            to="/shopping_history/all"
                            className="btn btn-sm btn-outline"
                        >
                            Retour à l'historique
                        </Link>
                    </div>

                    {detailStatus === "loading" ? (
                        <p className="text-sm opacity-70 flex items-center gap-2">
                            <span className="loading loading-spinner loading-xs" />
                            Chargement…
                        </p>
                    ) : detailStatus === "not-found" ? (
                        <p className="text-sm opacity-70">
                            Cette liste de courses n'existe pas ou n'est plus disponible.
                        </p>
                    ) : detailStatus === "error" ? (
                        <p className="text-sm text-error">
                            Impossible de charger le détail de cette liste pour le moment.
                        </p>
                    ) : !detail ? (
                        <p className="text-sm opacity-70">Aucune donnée disponible.</p>
                    ) : (
                        <>
                            <div className="card bg-base-100 shadow">
                                <div className="card-body p-4 gap-2 md:gap-2">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="font-semibold leading-tight truncate">
                                                {mallName}
                                            </h3>
                                            <p className="text-sm opacity-70 truncate">
                                                {mallLocation}
                                            </p>
                                        </div>
                                        <span className={statusBadgeClass(detail.status)}>
                                            {statusLabel(detail.status)}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-6 gap-2 text-sm">
                                        <div className="flex items-center justify-start gap-2 md:col-span-2">
                                            <span className="opacity-70">Maison</span>
                                            <span className="font-medium">
                                                {houseName}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-start gap-2 md:col-span-2">
                                            <span className="opacity-70">Total</span>
                                            <span className="font-semibold">
                                                {detail.total === null
                                                    ? "—"
                                                    : formatCurrencyEUR(detail.total)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-start gap-2 md:col-span-2">
                                            <span className="opacity-70">Articles</span>
                                            <span className="font-medium">
                                                {items.length}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-start gap-2 md:col-span-3">
                                            <span className="opacity-70">Créée le</span>
                                            <span className="font-medium">
                                                {detail.created_at
                                                    ? formatDateTime(detail.created_at)
                                                    : "—"}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-start gap-2 md:col-span-3">
                                            <span className="opacity-70">Fermée le</span>
                                            <span className="font-medium">
                                                {detail.closed_at
                                                    ? formatDateTime(detail.closed_at)
                                                    : "—"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {items.length === 0 ? (
                                <p className="text-sm opacity-70">
                                    Aucun article enregistré sur cette liste.
                                </p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {groupedItems.map((group) => (
                                        <div
                                            key={group.category}
                                            className="flex flex-col gap-2"
                                        >
                                            <div className="divider my-0">
                                                {group.category}
                                            </div>
                                            {group.items.map((item) => (
                                                <ShoppingHistoryDetailedItemCard
                                                    key={item.id}
                                                    item={item}
                                                    onAddToList={handleAddToList}
                                                    addToListState={
                                                        addToListById[item.id] ?? "idle"
                                                    }
                                                    addToListDisabled={
                                                        !shoppingList?.id ||
                                                        !item.product?.id
                                                    }
                                                />
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
