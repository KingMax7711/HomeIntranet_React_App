import type { FridgeItemLite, FridgeRecap } from "~/types/fridges";
import { apiClient } from "~/api/apiClient";
import { useEffect, useState } from "react";
import FridgeRecapCard from "~/components/fridge_components/FridgeRecapCard";

export function meta() {
    return [
        {
            title: "NestBoard - Frigo",
        },
    ];
}

export default function FridgeHome() {
    const [fridgeRecaps, setFridgeRecaps] = useState<FridgeRecap[]>([]);
    const [fridgeRecapsStatus, setFridgeRecapsStatus] = useState<
        "idle" | "loading" | "loaded" | "error"
    >("idle");

    const toSafeId = (value: unknown, fallback: number): number => {
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "string") {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) return parsed;
        }
        return fallback;
    };

    const toSafeQuantity = (value: unknown): number => {
        if (typeof value === "number" && Number.isFinite(value)) return value;

        if (typeof value === "string") {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) return parsed;
        }

        return 0;
    };

    const normalizeFridgeItems = (data: unknown): FridgeItemLite[] => {
        const payload = (data ?? {}) as any;
        const rawItems = Array.isArray(payload) ? payload : payload.items;

        if (!Array.isArray(rawItems)) return [];

        return rawItems.map((rawItem, index) => {
            const item = (rawItem ?? {}) as any;

            const idSource = item.id ?? item.fridge_item_id;
            const id = toSafeId(idSource, index + 1);

            const productName =
                typeof item.product_name === "string" && item.product_name.trim()
                    ? item.product_name
                    : typeof item.product?.name === "string" && item.product.name.trim()
                      ? item.product.name
                      : "Produit";

            const expirationDate =
                typeof item.expiration_date === "string" ? item.expiration_date : null;

            return {
                id,
                product_name: productName,
                quantity: toSafeQuantity(item.quantity),
                expiration_date: expirationDate,
            } satisfies FridgeItemLite;
        });
    };

    const loadFridgeProducts = async (fridgeId: number): Promise<FridgeItemLite[]> => {
        const response = await apiClient.get<unknown>(
            `/fridge_items_view/fridge_detailed/${fridgeId}`,
        );

        return normalizeFridgeItems(response.data);
    };

    const onEditFridgeProduct = async (
        fridgeId: number,
        item: FridgeItemLite,
    ): Promise<FridgeItemLite | null> => {
        console.log("Fridge edit product clicked", {
            fridgeId,
            item,
        });

        return null;
    };

    const onDeleteFridgeProduct = async (
        fridgeId: number,
        item: FridgeItemLite,
    ): Promise<boolean> => {
        console.log("Fridge delete product clicked", {
            fridgeId,
            item,
        });

        return false;
    };

    const handleGlobalAddArticle = () => {
        console.log("Ajout d'un article");
    };

    useEffect(() => {
        const fetchFridgeRecaps = async () => {
            setFridgeRecapsStatus("loading");

            try {
                const response = await apiClient.get<FridgeRecap[]>(
                    "/fridge_items_view/my_fridges_recap",
                );
                setFridgeRecaps(response.data);
                setFridgeRecapsStatus("loaded");
            } catch (error) {
                console.error("Error fetching fridge recaps:", error);
                setFridgeRecapsStatus("error");
            }
        };

        fetchFridgeRecaps();
    }, []);

    return (
        <div className="py-4 md:max-w-3/4 xxl:max-w-2/3 mx-auto">
            <div className="card bg-base-300 shadow-xl mb-6">
                <div className="card-body">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                            <h1 className="card-title text-2xl">Frigo</h1>
                            <p className="text-sm opacity-80">
                                Bienvenue dans la section Frigo de NestBoard.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={handleGlobalAddArticle}
                        >
                            Ajouter un article
                        </button>
                    </div>
                </div>
            </div>

            <div className="card bg-base-300 shadow-xl">
                <div className="card-body gap-4">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="card-title">Mes frigos</h2>
                    </div>

                    <div className="divider my-0" />

                    {fridgeRecapsStatus === "loading" ? (
                        <div className="flex items-center gap-2 text-sm opacity-80 py-2">
                            <span className="loading loading-spinner loading-sm" />
                            Chargement des frigos...
                        </div>
                    ) : fridgeRecapsStatus === "error" ? (
                        <p className="text-sm text-error">
                            Impossible de charger les frigos pour le moment.
                        </p>
                    ) : fridgeRecaps.length === 0 ? (
                        <p className="text-sm opacity-80">
                            Aucun frigo trouvé. Veuillez en créer un pour commencer à
                            ajouter des produits.
                        </p>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {fridgeRecaps.map((recap) => (
                                <FridgeRecapCard
                                    key={recap.fridge_id}
                                    fridgeRecap={recap}
                                    onLoadProducts={loadFridgeProducts}
                                    onEditProduct={onEditFridgeProduct}
                                    onDeleteProduct={onDeleteFridgeProduct}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
