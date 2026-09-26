import axios from "axios";
import type { FridgeItemLite, FridgeRecap } from "~/types/fridges";
import { apiClient } from "~/api/apiClient";
import { useCallback, useEffect, useRef, useState } from "react";
import FridgeRecapCard from "~/components/fridge_components/FridgeRecapCard";
import FormEditFridgeItem from "~/components/fridge_components/FormEditFridgeItem";
import FormManageFridges from "~/components/fridge_components/FormManageFridges";
import FormAddFridgeItem from "~/components/fridge_components/FormAddFridgeItem";
import FormImportFromShoppingList from "~/components/fridge_components/FormImportFromShoppingList";

export function meta() {
    return [
        {
            title: "NestBoard - Frigo",
        },
    ];
}

export default function FridgeHome() {
    const [fridgeRecaps, setFridgeRecaps] = useState<FridgeRecap[]>([]);
    const [fridgeRefreshTokens, setFridgeRefreshTokens] = useState<
        Record<number, number>
    >({});
    const [fridgeRecapsStatus, setFridgeRecapsStatus] = useState<
        "idle" | "loading" | "loaded" | "error"
    >("idle");
    const addItemDialogRef = useRef<HTMLDialogElement | null>(null);
    const manageFridgesDialogRef = useRef<HTMLDialogElement | null>(null);
    const importDialogRef = useRef<HTMLDialogElement | null>(null);
    const editDialogRef = useRef<HTMLDialogElement | null>(null);
    const deleteDialogRef = useRef<HTMLDialogElement | null>(null);
    const [importRefreshToken, setImportRefreshToken] = useState(0);
    const editResolverRef = useRef<((value: FridgeItemLite | null) => void) | null>(null);
    const deleteResolverRef = useRef<((value: boolean) => void) | null>(null);
    const [selectedEditContext, setSelectedEditContext] = useState<{
        fridgeId: number;
        item: FridgeItemLite;
    } | null>(null);
    const [selectedDeleteContext, setSelectedDeleteContext] = useState<{
        fridgeId: number;
        item: FridgeItemLite;
    } | null>(null);

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

    const isValidDateInput = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

    const normalizeFridgeItem = (
        data: unknown,
        fallback: FridgeItemLite,
    ): FridgeItemLite => {
        const item = (data ?? {}) as any;

        const productName =
            typeof item.product_name === "string" && item.product_name.trim()
                ? item.product_name
                : typeof item.product?.name === "string" && item.product.name.trim()
                  ? item.product.name
                  : fallback.product_name;

        const addedAt =
            typeof item.added_at === "string"
                ? item.added_at
                : typeof item.created_at === "string"
                  ? item.created_at
                  : fallback.added_at;

        const expirationDate =
            typeof item.expiration_date === "string"
                ? item.expiration_date
                : fallback.expiration_date;

        const comment =
            typeof item.comment === "string"
                ? item.comment
                : item.comment === null
                  ? null
                  : fallback.comment;

        return {
            id: toSafeId(item.id ?? item.fridge_item_id, fallback.id),
            fridge_id: toSafeId(item.fridge_id ?? item.fridgeId, fallback.fridge_id),
            product_name: productName,
            quantity: toSafeQuantity(item.quantity ?? fallback.quantity),
            added_at: addedAt,
            expiration_date: expirationDate,
            comment,
        };
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

            const addedAt = typeof item.added_at === "string" ? item.added_at : null;

            const comment =
                typeof item.comment === "string"
                    ? item.comment
                    : typeof item.product?.comment === "string"
                      ? item.product.comment
                      : null;

            return {
                id,
                fridge_id: toSafeId(item.fridge_id, 0),
                product_id: toSafeId(item.product?.id ?? item.product_id, 0),
                product_name: productName,
                quantity: toSafeQuantity(item.quantity),
                added_at: addedAt,
                comment: comment,
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

    const refreshFridgeRecap = async (fridgeId: number) => {
        const products = await loadFridgeProducts(fridgeId);

        setFridgeRecaps((current) =>
            current.map((recap) =>
                recap.fridge_id === fridgeId
                    ? { ...recap, number_of_items: products.length }
                    : recap,
            ),
        );

        return products;
    };

    const openDialogAtTop = (dlg: HTMLDialogElement | null) => {
        if (!dlg) return;
        dlg.showModal();

        const run = () => {
            const box = dlg.querySelector<HTMLElement>(".modal-box");
            box?.scrollTo({ top: 0 });
            try {
                dlg.focus();
            } catch {
                // ignore
            }
            box?.scrollTo({ top: 0 });
        };

        requestAnimationFrame(() => {
            run();
            setTimeout(run, 50);
        });
    };

    const closeEditDialog = () => {
        editDialogRef.current?.close();
    };

    const handleEditDialogClose = () => {
        if (editResolverRef.current) {
            editResolverRef.current(null);
            editResolverRef.current = null;
        }
        setSelectedEditContext(null);
    };

    const closeDeleteDialog = () => {
        deleteDialogRef.current?.close();
    };

    const handleDeleteDialogClose = () => {
        if (deleteResolverRef.current) {
            deleteResolverRef.current(false);
            deleteResolverRef.current = null;
        }
        setSelectedDeleteContext(null);
    };

    const requestEditFridgeProduct = async (
        fridgeId: number,
        item: FridgeItemLite,
    ): Promise<FridgeItemLite | null> => {
        return await new Promise<FridgeItemLite | null>((resolve) => {
            editResolverRef.current = resolve;
            setSelectedEditContext({ fridgeId, item });
            openDialogAtTop(editDialogRef.current);
        });
    };

    const onEditFridgeProduct = async (
        fridgeId: number,
        item: FridgeItemLite,
    ): Promise<FridgeItemLite | null> => {
        const openedItem = await requestEditFridgeProduct(fridgeId, item);
        if (!openedItem) return null;

        return openedItem;
    };

    const handleMoveFridgeProduct = async (
        item: FridgeItemLite,
        newFridgeId: number,
    ): Promise<void> => {
        try {
            const response = await apiClient.post<unknown>(
                `/fridge_items/move/${item.id}`,
                null,
                {
                    params: {
                        new_fridge_id: newFridgeId,
                    },
                },
            );

            normalizeFridgeItem(response.data, {
                ...item,
                fridge_id: newFridgeId,
            });
            await refreshFridgeRecap(item.fridge_id);
            await refreshFridgeRecap(newFridgeId);
            setFridgeRefreshTokens((current) => ({
                ...current,
                [item.fridge_id]: (current[item.fridge_id] ?? 0) + 1,
                [newFridgeId]: (current[newFridgeId] ?? 0) + 1,
            }));
            return;
        } catch (error) {
            const message = axios.isAxiosError(error)
                ? (error.response?.data?.detail ?? error.message)
                : "Une erreur est survenue pendant le déplacement.";
            console.error("Failed to move fridge item", error);
            throw new Error(String(message));
        }
    };

    const handleEditSubmit = async (values: {
        quantity: number;
        expirationDate: string;
        comment: string;
    }) => {
        if (!selectedEditContext) {
            throw new Error("Aucun article sélectionné.");
        }

        const payload: Record<string, unknown> = {
            fridge_id: selectedEditContext.fridgeId,
            quantity: values.quantity,
            comment: values.comment.trim().length > 0 ? values.comment.trim() : null,
        };

        const trimmedExpiration = values.expirationDate.trim();
        if (trimmedExpiration.length > 0) {
            if (!isValidDateInput(trimmedExpiration)) {
                throw new Error("La date de péremption doit être au format AAAA-MM-JJ.");
            }

            payload.expiration_date = trimmedExpiration;
        }

        try {
            const response = await apiClient.post<unknown>(
                `/fridge_items/update/${selectedEditContext.item.id}`,
                payload,
            );

            const updatedItem = normalizeFridgeItem(
                response.data,
                selectedEditContext.item,
            );
            editResolverRef.current?.(updatedItem);
            editResolverRef.current = null;
            closeEditDialog();

            return;
        } catch (error) {
            const message = axios.isAxiosError(error)
                ? (error.response?.data?.detail ?? error.message)
                : "Une erreur est survenue pendant la mise à jour.";
            console.error("Failed to update fridge item", error);
            throw new Error(String(message));
        }
    };

    const onDeleteFridgeProduct = async (
        fridgeId: number,
        item: FridgeItemLite,
    ): Promise<boolean> => {
        return await new Promise<boolean>((resolve) => {
            deleteResolverRef.current = resolve;
            setSelectedDeleteContext({ fridgeId, item });
            openDialogAtTop(deleteDialogRef.current);
        });
    };

    const confirmDeleteFridgeProduct = async () => {
        if (!selectedDeleteContext) {
            deleteResolverRef.current?.(false);
            deleteResolverRef.current = null;
            closeDeleteDialog();
            return;
        }

        try {
            await apiClient.delete(`/fridge_items/${selectedDeleteContext.item.id}`);
            deleteResolverRef.current?.(true);
            deleteResolverRef.current = null;
            closeDeleteDialog();
        } catch (error) {
            const message = axios.isAxiosError(error)
                ? (error.response?.data?.detail ?? error.message)
                : "Une erreur est survenue pendant la suppression.";
            window.alert(String(message));
            console.error("Failed to delete fridge item", error);
            deleteResolverRef.current?.(false);
            deleteResolverRef.current = null;
        }
    };

    const handleGlobalAddArticle = () => {
        openDialogAtTop(addItemDialogRef.current);
    };

    const handleImportFromShoppingList = () => {
        setImportRefreshToken((current) => current + 1);
        openDialogAtTop(importDialogRef.current);
    };

    const handleGlobalEditFridge = () => {
        openDialogAtTop(manageFridgesDialogRef.current);
    };

    const fetchFridgeRecaps = useCallback(
        async ({ silent = false }: { silent?: boolean } = {}): Promise<FridgeRecap[]> => {
            if (!silent) {
                setFridgeRecapsStatus("loading");
            }

            try {
                const response = await apiClient.get<FridgeRecap[]>(
                    "/fridge_items_view/my_fridges_recap",
                );
                setFridgeRecaps(response.data);
                setFridgeRecapsStatus("loaded");
                return response.data;
            } catch (error) {
                console.error("Error fetching fridge recaps:", error);
                if (!silent) {
                    setFridgeRecapsStatus("error");
                }
                throw error;
            }
        },
        [],
    );

    useEffect(() => {
        void fetchFridgeRecaps();
    }, [fetchFridgeRecaps]);

    return (
        <div className="py-4 md:max-w-3/4 xxl:max-w-2/3 mx-auto space-y-6">
            <div className="card bg-base-300 shadow-xl mb-6">
                <div className="card-body gap-4 sm:gap-5">
                    <div className="flex items-center gap-2">
                        <span className="badge badge-outline badge-sm">Frigo</span>
                        <span className="text-xs opacity-70">Gestion du stock</span>
                    </div>

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-1">
                            <h1 className="card-title text-2xl sm:text-3xl">Frigo</h1>
                            <p className="text-sm opacity-80 sm:text-base">
                                Suivez vos produits, les quantités et les dates de
                                péremption simplement.
                            </p>
                        </div>

                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                            <button
                                type="button"
                                className="btn btn-primary btn-sm sm:btn-md"
                                onClick={handleGlobalAddArticle}
                            >
                                Ajouter un article
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary btn-sm sm:btn-md"
                                onClick={handleImportFromShoppingList}
                            >
                                Importer depuis la liste de courses
                            </button>
                        </div>
                    </div>

                    <div className="divider my-0" />

                    <div className="stats bg-base-100/60 border border-base-content/10">
                        <div className="stat py-3 px-4">
                            <div className="stat-title text-xs">Etat</div>
                            <div className="stat-value text-base sm:text-lg font-semibold">
                                {fridgeRecapsStatus === "loading"
                                    ? "Chargement"
                                    : fridgeRecapsStatus === "error"
                                      ? "Erreur"
                                      : "Prêt"}
                            </div>
                        </div>
                        <div className="stat py-3 px-4">
                            <div className="stat-title text-xs">Mes frigos</div>
                            <div className="stat-value text-base sm:text-lg font-semibold">
                                {fridgeRecaps.length}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card bg-base-300 shadow-xl">
                <div className="card-body gap-5">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <h2 className="card-title">Mes frigos</h2>
                            <span className="badge badge-ghost badge-sm">
                                {fridgeRecaps.length}
                            </span>
                        </div>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={handleGlobalEditFridge}
                        >
                            Modifier mes frigos
                        </button>
                    </div>

                    <div className="divider my-0" />

                    {fridgeRecapsStatus === "loading" ? (
                        <div className="flex items-center gap-2 rounded-2xl border border-base-content/10 bg-base-100 px-4 py-3 text-sm opacity-80">
                            <span className="loading loading-spinner loading-sm" />
                            Chargement des frigos...
                        </div>
                    ) : fridgeRecapsStatus === "error" ? (
                        <div className="alert alert-error alert-soft">
                            <span>Impossible de charger les frigos pour le moment.</span>
                        </div>
                    ) : fridgeRecaps.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-base-content/20 bg-base-100 px-4 py-4">
                            <p className="text-sm opacity-80">
                                Aucun frigo trouvé. Veuillez en créer un pour commencer a
                                ajouter des produits.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {fridgeRecaps.map((recap) => (
                                <FridgeRecapCard
                                    key={recap.fridge_id}
                                    fridgeRecap={recap}
                                    onLoadProducts={loadFridgeProducts}
                                    onEditProduct={onEditFridgeProduct}
                                    onDeleteProduct={onDeleteFridgeProduct}
                                    availableFridges={fridgeRecaps}
                                    onMoveProduct={handleMoveFridgeProduct}
                                    refreshToken={
                                        fridgeRefreshTokens[recap.fridge_id] ?? 0
                                    }
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <dialog ref={manageFridgesDialogRef} className="modal" tabIndex={-1}>
                <div className="modal-box w-11/12 max-w-none sm:max-w-5xl max-h-[92dvh] overflow-y-auto overscroll-contain border border-base-content/10 bg-base-200 px-3 sm:px-6 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pt-6 sm:pb-6 rounded-3xl">
                    <FormManageFridges
                        fridges={fridgeRecaps}
                        refreshFridgeRecaps={() =>
                            fetchFridgeRecaps({
                                silent: true,
                            })
                        }
                        onCloseRequested={() => {
                            manageFridgesDialogRef.current?.close();
                        }}
                    />
                </div>
            </dialog>

            <dialog ref={addItemDialogRef} className="modal" tabIndex={-1}>
                <div className="modal-box w-11/12 max-w-none sm:max-w-4xl max-h-[92dvh] overflow-y-auto overscroll-contain border border-base-content/10 bg-base-200 px-3 sm:px-6 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pt-6 sm:pb-6 rounded-3xl">
                    <FormAddFridgeItem
                        fridges={fridgeRecaps}
                        onCreated={async (fridgeId) => {
                            await fetchFridgeRecaps({ silent: true });
                            setFridgeRefreshTokens((current) => ({
                                ...current,
                                [fridgeId]: (current[fridgeId] ?? 0) + 1,
                            }));
                        }}
                        onCloseRequested={() => {
                            addItemDialogRef.current?.close();
                        }}
                    />
                </div>
            </dialog>

            <dialog ref={importDialogRef} className="modal" tabIndex={-1}>
                <div className="modal-box w-11/12 max-w-none sm:max-w-5xl max-h-[92dvh] overflow-y-auto overscroll-contain border border-base-content/10 bg-base-200 px-3 sm:px-6 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pt-6 sm:pb-6 rounded-3xl">
                    <FormImportFromShoppingList
                        fridges={fridgeRecaps}
                        refreshToken={importRefreshToken}
                        onImported={async (fridgeIds) => {
                            await fetchFridgeRecaps({ silent: true });
                            setFridgeRefreshTokens((current) => {
                                const next = { ...current };
                                fridgeIds.forEach((fridgeId) => {
                                    next[fridgeId] = (next[fridgeId] ?? 0) + 1;
                                });
                                return next;
                            });
                        }}
                        onCloseRequested={() => {
                            importDialogRef.current?.close();
                        }}
                    />
                </div>
            </dialog>

            <dialog
                ref={editDialogRef}
                className="modal"
                onClose={handleEditDialogClose}
                tabIndex={-1}
            >
                <div className="modal-box w-11/12 max-w-none sm:max-w-2xl max-h-[90dvh] sm:max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain border border-base-content/10 bg-base-200 px-3 sm:px-6 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pt-6 sm:pb-6 rounded-3xl">
                    <FormEditFridgeItem
                        item={selectedEditContext?.item ?? null}
                        onSubmit={handleEditSubmit}
                    />
                </div>
            </dialog>

            <dialog
                ref={deleteDialogRef}
                className="modal"
                onClose={handleDeleteDialogClose}
                tabIndex={-1}
            >
                <div className="modal-box w-11/12 max-w-md rounded-3xl border border-base-content/10 bg-base-200 p-6">
                    <h3 className="text-lg font-semibold">Supprimer l'article ?</h3>
                    <p className="mt-2 text-sm opacity-80">
                        Cette action est définitive.
                        {selectedDeleteContext ? (
                            <>
                                {" "}
                                L'article "{selectedDeleteContext.item.product_name}" sera
                                retiré du frigo.
                            </>
                        ) : null}
                    </p>

                    <div className="mt-5 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={closeDeleteDialog}
                        >
                            Annuler
                        </button>
                        <button
                            type="button"
                            className="btn btn-error"
                            onClick={() => {
                                void confirmDeleteFridgeProduct();
                            }}
                        >
                            Supprimer
                        </button>
                    </div>
                </div>
            </dialog>
        </div>
    );
}
