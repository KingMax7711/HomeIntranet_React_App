import type { Route } from "./+types/shopping_in_progress";
import { useShoppingListStore } from "../../../stores/shopping_list";
import ShoppingListInProgressInfo from "~/components/shopping_components/shopping_inProgress_Components/ShoppingListInProgressInfo";
import ShoppingListInProgressItemCard from "~/components/shopping_components/shopping_inProgress_Components/ShoppingListInProgressItemCard";
import type { ShoppingListItemDetailed } from "~/stores/shopping_list";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { apiClient } from "~/api/apiClient";
import type { ShoppingListView } from "~/stores/shopping_list";
import FormAjoutArticle from "~/components/shopping_components/FormAjoutArticle";
import FormEditArticle from "~/components/shopping_components/FormEditArticle";
import { useNavigate } from "react-router";
import type { User } from "~/types/domain";
import { useAuthStore } from "~/stores/auth";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "HomeFlow - Courses en cours" },
        { name: "description", content: "Page des courses en cours" },
    ];
}

export default function ShoppingInProgress() {
    const shoppingList = useShoppingListStore((state) => state.view);
    const shoppingListRefresh = useShoppingListStore((state) => state.forceSync);
    const userId = useAuthStore((state) => state.user?.id);
    const navigate = useNavigate();

    type HouseDetailed = {
        id: number;
        name: string;
        members: User[];
    };

    const [house, setHouse] = useState<HouseDetailed | null>(null);
    const [houseStatus, setHouseStatus] = useState<
        "idle" | "loading" | "loaded" | "none" | "error"
    >("idle");

    const [busyItemIds, setBusyItemIds] = useState<Record<number, boolean>>({});

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

    const categorizedItems = useMemo(() => {
        const myId = userId;

        const assignedToMePending = items.filter(
            (item) =>
                item.status === "pending" &&
                myId !== undefined &&
                item.affected_user?.id === myId,
        );

        const otherPending = items.filter((item) => {
            if (item.status !== "pending") return false;
            if (myId === undefined) return true;
            return item.affected_user?.id !== myId;
        });

        const inCart = items.filter((item) => item.status === "found");

        const notFoundOrGivenUp = items.filter(
            (item) => item.status === "not_found" || item.status === "given_up",
        );

        return {
            assignedToMePending,
            otherPending,
            inCart,
            notFoundOrGivenUp,
        };
    }, [items, userId]);

    const houseMembers = useMemo(() => {
        const members = house?.members;
        return Array.isArray(members) ? members : [];
    }, [house]);

    const checkShoppingListStatus = useEffect(() => {
        if (!shoppingList) {
            navigate("/shopping_home");
            return;
        }
        if (shoppingList?.status === "completed") {
            navigate("/shopping_home");
        }
    }, [shoppingList, navigate]);

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

    const markBusy = (id: number, value: boolean) => {
        setBusyItemIds((prev) => {
            if (value) return { ...prev, [id]: true };
            if (!prev[id]) return prev;
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    const handleAssignUser = (item: ShoppingListItemDetailed, userId: number) => {
        const itemId = item.id;
        if (itemId === undefined) return;
        if (busyItemIds[itemId]) return;

        (async () => {
            markBusy(itemId, true);
            try {
                await apiClient.post(
                    `/shopping_list_items/affect_to_user/${itemId}/${userId}`,
                );
                shoppingListRefresh();
            } catch (e) {
                console.error("Failed to assign item", e);
                alert("Une erreur est survenue lors de l'affectation de l'article.");
            } finally {
                markBusy(itemId, false);
            }
        })();
    };

    const handleSetStatus = (
        item: ShoppingListItemDetailed,
        status: ShoppingListItemDetailed["status"],
    ) => {
        const itemId = item.id;
        if (itemId === undefined) return;
        if (busyItemIds[itemId]) return;

        (async () => {
            markBusy(itemId, true);
            try {
                await apiClient.post(
                    `/shopping_list_items/update_status/${itemId}`,
                    null,
                    {
                        params: { new_status: status },
                    },
                );
                shoppingListRefresh();
            } catch (e) {
                console.error("Failed to update item status", e);
                alert("Une erreur est survenue lors de la mise à jour du statut.");
            } finally {
                markBusy(itemId, false);
            }
        })();
    };

    const handleEndShopping = () => {
        if (!shoppingList) return;
        console.log("Fin du shopping");
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

    useEffect(() => {
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
    }, []);

    return (
        <div className="p-4 md:max-w-3/4 xxl:max-w-2/3 mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col gap-6 md:col-span-1">
                    <ShoppingListInProgressInfo
                        view={shoppingList}
                        onEndShopping={handleEndShopping}
                    />
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
                            <p className="text-sm opacity-70 text-center">
                                Aucun article pour le moment.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {categorizedItems.assignedToMePending.length > 0 && (
                                    <>
                                        <div className="divider text-sm font-semibold opacity-80">
                                            Articles qui me sont assignés (
                                            {categorizedItems.assignedToMePending.length})
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            {categorizedItems.assignedToMePending.map(
                                                (item) => (
                                                    <ShoppingListInProgressItemCard
                                                        key={item.id}
                                                        item={item}
                                                        members={houseMembers}
                                                        isBusy={
                                                            !!busyItemIds[item.id ?? -1]
                                                        }
                                                        onAssignUser={handleAssignUser}
                                                        onSetStatus={handleSetStatus}
                                                        onEdit={handleOpenEdit}
                                                        onDelete={handleDelete}
                                                    />
                                                ),
                                            )}
                                        </div>
                                    </>
                                )}

                                {categorizedItems.otherPending.length > 0 && (
                                    <>
                                        <div className="divider text-sm font-semibold opacity-80">
                                            Autres articles en attente (
                                            {categorizedItems.otherPending.length})
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            {categorizedItems.otherPending.map((item) => (
                                                <ShoppingListInProgressItemCard
                                                    key={item.id}
                                                    item={item}
                                                    members={houseMembers}
                                                    isBusy={!!busyItemIds[item.id ?? -1]}
                                                    onAssignUser={handleAssignUser}
                                                    onSetStatus={handleSetStatus}
                                                    onEdit={handleOpenEdit}
                                                    onDelete={handleDelete}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}

                                {categorizedItems.inCart.length > 0 && (
                                    <>
                                        <div className="divider text-sm font-semibold opacity-80">
                                            Articles dans le caddie (
                                            {categorizedItems.inCart.length})
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            {categorizedItems.inCart.map((item) => (
                                                <ShoppingListInProgressItemCard
                                                    key={item.id}
                                                    item={item}
                                                    members={houseMembers}
                                                    isBusy={!!busyItemIds[item.id ?? -1]}
                                                    onAssignUser={handleAssignUser}
                                                    onSetStatus={handleSetStatus}
                                                    onEdit={handleOpenEdit}
                                                    onDelete={handleDelete}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}

                                {categorizedItems.notFoundOrGivenUp.length > 0 && (
                                    <>
                                        <div className="divider text-sm font-semibold opacity-80">
                                            Non trouvé / Abandonné (
                                            {categorizedItems.notFoundOrGivenUp.length})
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            {categorizedItems.notFoundOrGivenUp.map(
                                                (item) => (
                                                    <ShoppingListInProgressItemCard
                                                        key={item.id}
                                                        item={item}
                                                        members={houseMembers}
                                                        isBusy={
                                                            !!busyItemIds[item.id ?? -1]
                                                        }
                                                        onAssignUser={handleAssignUser}
                                                        onSetStatus={handleSetStatus}
                                                        onEdit={handleOpenEdit}
                                                        onDelete={handleDelete}
                                                    />
                                                ),
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
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
