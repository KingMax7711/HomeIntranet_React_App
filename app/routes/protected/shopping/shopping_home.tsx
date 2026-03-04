import type { Route } from "./+types/shopping_home";
import { useShoppingListStore } from "../../../stores/shopping_list";
import ShoppingListInfo from "~/components/shopping_components/ShoppingListInfo";
import ShoppingListPreparationItemCard from "~/components/shopping_components/ShoppingListPreparationItemCard";
import LastShoppingListInfoCard from "~/components/shopping_components/LastShoppingListInfoCard";
import type { ShoppingListItemDetailed } from "~/stores/shopping_list";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { apiClient } from "~/api/apiClient";
import type { ShoppingListView } from "~/stores/shopping_list";
import FormAjoutArticle from "~/components/shopping_components/FormAjoutArticle";
import FormEditArticle from "~/components/shopping_components/FormEditArticle";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "HomeFlow - Shopping" },
        { name: "description", content: "Page de shopping" },
    ];
}

export default function ShoppingHome() {
    const shoppingList = useShoppingListStore((state) => state.view);
    const shoppingListRefresh = useShoppingListStore((state) => state.forceSync);

    const [lastList, setLastList] = useState<ShoppingListView | null>(null);
    const [lastListStatus, setLastListStatus] = useState<
        "idle" | "loading" | "loaded" | "none" | "error"
    >("idle");

    const addDialogRef = useRef<HTMLDialogElement | null>(null);
    const editDialogRef = useRef<HTMLDialogElement | null>(null);
    const [selectedItem, setSelectedItem] = useState<ShoppingListItemDetailed | null>(
        null,
    );

    const items = useMemo(() => {
        const list = shoppingList?.items;
        return Array.isArray(list) ? list : [];
    }, [shoppingList]);

    const openDialogAtTop = (
        dlg: HTMLDialogElement | null,
        options?: { focusSelector?: string },
    ) => {
        if (!dlg) return;
        dlg.showModal();

        const focusSelector = options?.focusSelector;
        const run = () => {
            const box = dlg.querySelector<HTMLElement>(".modal-box");
            box?.scrollTo({ top: 0 });
            try {
                dlg.focus();
            } catch {
                // ignore
            }
            if (focusSelector) {
                const el = dlg.querySelector<HTMLElement>(focusSelector);
                try {
                    (el as any)?.focus?.({ preventScroll: true });
                } catch {
                    el?.focus();
                }
            }
            box?.scrollTo({ top: 0 });
        };

        requestAnimationFrame(() => {
            run();
            // iOS/Chrome: relayout après showModal + focus
            setTimeout(run, 50);
        });
    };

    const handleOpenAdd = () => {
        openDialogAtTop(addDialogRef.current, {
            focusSelector: "",
        });
    };

    const handleOpenEdit = (item: ShoppingListItemDetailed) => {
        setSelectedItem(item);
        openDialogAtTop(editDialogRef.current);
    };

    const handleDelete = (item: ShoppingListItemDetailed) => {
        const idToDelete = item.id;
        if (idToDelete === undefined) return;
        (async () => {
            try {
                await apiClient.delete(`/shopping_list_items/delete/${idToDelete}`);
                shoppingListRefresh();
            } catch (e) {
                console.error("Failed to delete item", e);
                alert("Une erreur est survenue lors de la suppression de l'article.");
            }
        })();
    };

    useEffect(() => {
        const controller = new AbortController();
        setLastListStatus("loading");

        (async () => {
            try {
                const r = await apiClient.get<ShoppingListView>(
                    "/shopping_list_view/shopping_list/last",
                    { signal: controller.signal },
                );
                setLastList(r.data);
                setLastListStatus("loaded");
            } catch (e) {
                if (axios.isAxiosError(e) && e.code === "ERR_CANCELED") return;

                const status = axios.isAxiosError(e) ? e.response?.status : undefined;
                if (status === 404) {
                    setLastList(null);
                    setLastListStatus("none");
                    return;
                }

                setLastList(null);
                setLastListStatus("error");
            }
        })();

        return () => controller.abort();
    }, []);

    const lastListCard =
        lastListStatus === "loading" ? (
            <div className="card w-full h-full bg-base-300 shadow-xl">
                <div className="card-body">
                    <h2 className="card-title">Dernière liste</h2>
                    <p className="text-sm opacity-70 flex items-center gap-2">
                        <span className="loading loading-spinner loading-xs" />
                        Chargement…
                    </p>
                </div>
            </div>
        ) : lastListStatus === "error" ? (
            <div className="card w-full h-full bg-base-300 shadow-xl">
                <div className="card-body">
                    <h2 className="card-title">Dernière liste</h2>
                    <p className="text-sm text-error">Indisponible</p>
                </div>
            </div>
        ) : (
            <LastShoppingListInfoCard
                view={lastListStatus === "none" ? null : lastList}
            />
        );

    return (
        <div className="p-4 md:max-w-3/4 xxl:max-w-2/3 mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-6 md:col-span-1">
                    <ShoppingListInfo view={shoppingList} />
                    <div className="hidden md:block">{lastListCard}</div>
                </div>

                <div className="card bg-base-300 shadow-xl md:col-span-2">
                    <div className="card-body gap-4">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="card-title">Articles</h2>
                            <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={handleOpenAdd}
                            >
                                Ajouter un article
                            </button>
                        </div>

                        <div className="divider my-0" />

                        {items.length === 0 ? (
                            <p className="text-sm opacity-70">
                                Aucun article pour le moment.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {items.map((item) => (
                                    <ShoppingListPreparationItemCard
                                        key={item.id}
                                        item={item}
                                        onEdit={handleOpenEdit}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="md:hidden">{lastListCard}</div>
            </div>

            <dialog ref={addDialogRef} className="modal" tabIndex={-1}>
                <div className="modal-box w-11/12 max-w-none sm:max-w-2xl max-h-[90dvh] sm:max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain px-3 sm:px-6 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pt-6 sm:pb-6 rounded-3xl">
                    <FormAjoutArticle />
                </div>
            </dialog>

            <dialog
                ref={editDialogRef}
                className="modal"
                onClose={() => setSelectedItem(null)}
                tabIndex={-1}
            >
                <div className="modal-box w-11/12 max-w-none sm:max-w-2xl max-h-[90dvh] sm:max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain px-3 sm:px-6 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pt-6 sm:pb-6">
                    <FormEditArticle item={selectedItem} />
                </div>
            </dialog>
        </div>
    );
}
