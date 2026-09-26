import { useEffect, useState } from "react";
import { ChevronRight, RefreshCw } from "lucide-react";
import type { FridgeItemLite, FridgeRecap } from "~/types/fridges";
import FridgeProductCard from "~/components/fridge_components/FridgeProductCard";

export default function FridgeRecapCard({
    fridgeRecap,
    onLoadProducts,
    onEditProduct,
    onDeleteProduct,
    availableFridges,
    onMoveProduct,
    refreshToken,
}: {
    fridgeRecap: FridgeRecap;
    onLoadProducts: (fridgeId: number) => Promise<FridgeItemLite[]>;
    onEditProduct: (
        fridgeId: number,
        item: FridgeItemLite,
    ) => Promise<FridgeItemLite | null>;
    onDeleteProduct: (fridgeId: number, item: FridgeItemLite) => Promise<boolean>;
    availableFridges: FridgeRecap[];
    onMoveProduct: (item: FridgeItemLite, newFridgeId: number) => Promise<void>;
    refreshToken: number;
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [products, setProducts] = useState<FridgeItemLite[] | null>(null);
    const [itemCount, setItemCount] = useState(fridgeRecap.number_of_items);
    const [isLoading, setIsLoading] = useState(false);
    const [activeProductId, setActiveProductId] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const loadProducts = async () => {
        setIsLoading(true);
        setErrorMessage(null);

        try {
            const loadedProducts = await onLoadProducts(fridgeRecap.fridge_id);
            setProducts(loadedProducts);
            setItemCount(loadedProducts.length);
        } catch (error) {
            console.error("Error fetching fridge products:", error);
            setErrorMessage("Impossible de charger les produits de ce frigo.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle = async () => {
        const nextExpandedState = !isExpanded;
        setIsExpanded(nextExpandedState);

        if (nextExpandedState && products === null && !isLoading) {
            await loadProducts();
        }
    };

    const handleRefreshProducts = async () => {
        if (isLoading) return;
        await loadProducts();
    };

    const handleEditProduct = async (item: FridgeItemLite) => {
        setActiveProductId(item.id);

        try {
            const updatedItem = await onEditProduct(fridgeRecap.fridge_id, item);
            if (!updatedItem) return;

            if (updatedItem.fridge_id !== fridgeRecap.fridge_id) {
                setProducts((current) =>
                    (current ?? []).filter((currentItem) => currentItem.id !== item.id),
                );
                setItemCount((current) => Math.max(0, current - 1));
                return;
            }

            setProducts((current) =>
                (current ?? []).map((currentItem) =>
                    currentItem.id === item.id ? updatedItem : currentItem,
                ),
            );
        } finally {
            setActiveProductId(null);
        }
    };

    const handleDeleteProduct = async (item: FridgeItemLite) => {
        setActiveProductId(item.id);

        try {
            const deleted = await onDeleteProduct(fridgeRecap.fridge_id, item);
            if (!deleted) return;

            setProducts((current) =>
                (current ?? []).filter((currentItem) => currentItem.id !== item.id),
            );
            setItemCount((current) => Math.max(0, current - 1));
        } finally {
            setActiveProductId(null);
        }
    };

    useEffect(() => {
        if (!isExpanded) return;
        void loadProducts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshToken]);

    return (
        <div className="card bg-base-200 border border-base-300 shadow-sm mb-4">
            <div className="card-body p-4 gap-3">
                <div className="flex items-center justify-between gap-3">
                    <button
                        type="button"
                        className="min-w-0 text-left flex-1"
                        onClick={handleToggle}
                        aria-expanded={isExpanded}
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <h2 className="text-lg md:text-xl font-bold truncate">
                                {fridgeRecap.fridge_name}
                            </h2>
                            {fridgeRecap.fridge_main ? (
                                <span className="badge badge-primary badge-soft badge-sm shrink-0">
                                    Principal
                                </span>
                            ) : null}
                        </div>

                        <p className="text-sm opacity-80">
                            Nombre d'articles : {itemCount}
                        </p>
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => {
                                void handleRefreshProducts();
                            }}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="loading loading-spinner loading-xs" />
                            ) : (
                                <RefreshCw className="w-4 h-4" />
                            )}
                            Actualiser
                        </button>

                        <button
                            type="button"
                            className="shrink-0 rounded-full bg-base-100 p-1 btn btn-circle btn-sm btn-ghost"
                            onClick={handleToggle}
                            aria-label={
                                isExpanded
                                    ? "Replier le contenu du frigo"
                                    : "Déplier le contenu du frigo"
                            }
                        >
                            <ChevronRight
                                className={`w-5 h-5 transition-transform duration-200 ease-out ${
                                    isExpanded ? "rotate-90" : "rotate-0"
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </div>

            <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                    isExpanded
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                }`}
            >
                <div className="overflow-hidden">
                    <div className="px-4 pb-4 -mt-1">
                        <div className="divider my-1" />

                        {isLoading ? (
                            <div className="mt-3 rounded-2xl border border-base-content/10 bg-base-100 p-3">
                                <div className="flex items-center gap-2 text-sm opacity-80 py-1">
                                    <span className="loading loading-spinner loading-sm" />
                                    Chargement des produits...
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                    {Array.from({ length: 4 }).map((_, index) => (
                                        <div
                                            key={`fridge-product-skeleton-${index}`}
                                            className="card bg-base-100 border border-base-200 shadow-sm"
                                        >
                                            <div className="card-body p-3 md:p-4">
                                                <div className="skeleton h-4 w-1/2" />
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    <div className="skeleton h-3 w-3/4" />
                                                    <div className="skeleton h-3 w-1/2 justify-self-end" />
                                                    <div className="skeleton h-3 w-3/4" />
                                                    <div className="skeleton h-3 w-1/2 justify-self-end" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : errorMessage ? (
                            <div className="alert alert-error alert-soft">
                                <span>{errorMessage}</span>
                                <button
                                    type="button"
                                    className="btn btn-xs btn-outline"
                                    onClick={() => {
                                        void loadProducts();
                                    }}
                                >
                                    Réessayer
                                </button>
                            </div>
                        ) : products && products.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                {products
                                    .sort((a, b) =>
                                        a.product_name.localeCompare(b.product_name),
                                    )
                                    .map((product) => (
                                        <FridgeProductCard
                                            key={product.id}
                                            item={product}
                                            onEdit={(productItem) => {
                                                void handleEditProduct(productItem);
                                            }}
                                            onDelete={(productItem) => {
                                                void handleDeleteProduct(productItem);
                                            }}
                                            onMove={async (productItem, newFridgeId) => {
                                                await onMoveProduct(
                                                    productItem,
                                                    newFridgeId,
                                                );

                                                if (
                                                    newFridgeId !== fridgeRecap.fridge_id
                                                ) {
                                                    setProducts((current) =>
                                                        (current ?? []).filter(
                                                            (currentItem) =>
                                                                currentItem.id !==
                                                                productItem.id,
                                                        ),
                                                    );
                                                    setItemCount((current) =>
                                                        Math.max(0, current - 1),
                                                    );
                                                }
                                            }}
                                            availableFridges={availableFridges}
                                            isBusy={activeProductId === product.id}
                                        />
                                    ))}
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-dashed border-base-content/20 bg-base-100 px-4 py-3">
                                <p className="text-sm opacity-80">
                                    Ce frigo ne contient pas encore de produits.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
