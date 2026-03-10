import type { Route } from "./+types/shopping_sort";
import { useMemo, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useNavigate } from "react-router";
import { capitalizeFirstLetter } from "~/tools/formater";
import axios from "axios";
import {
    DndContext,
    type DragEndEvent,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    closestCenter,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { useShoppingListStore } from "~/stores/shopping_list";
import type { ShoppingListItemDetailed } from "~/stores/shopping_list";
import { sortByCustomSortIndex } from "~/tools/formater";
import { apiClient } from "~/api/apiClient";

export function meta() {
    return [
        { title: "NestBoard - Trier la liste" },
        { name: "description", content: "Tri de la liste de courses" },
    ];
}

type SortableItemProps = {
    id: number;
    item: ShoppingListItemDetailed;
    grabWholeCard?: boolean;
};

function SortableItemRow({ id, item, grabWholeCard }: SortableItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id });

    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        touchAction: grabWholeCard ? "none" : "auto",
        WebkitTouchCallout: "none",
    };

    const name = item.product?.name ?? "Article";
    const qty = item.quantity;
    const statusLabel =
        item.status === "pending"
            ? "À prendre"
            : item.status === "found"
              ? "Dans le caddie"
              : item.status === "not_found"
                ? "Non trouvé"
                : "Abandonné";

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={
                "card bg-base-300 shadow-xl select-none " +
                (grabWholeCard ? "cursor-grab active:cursor-grabbing " : "") +
                (isDragging ? "opacity-80" : "")
            }
            {...(grabWholeCard ? { ...attributes, ...listeners } : {})}
        >
            <div className="card-body py-4 px-4">
                <div className="flex items-center gap-3">
                    {grabWholeCard ? (
                        <div
                            className="btn btn-ghost md:btn-sm pointer-events-none"
                            aria-hidden
                        >
                            ≡
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="btn btn-ghost md:btn-sm cursor-grab active:cursor-grabbing"
                            aria-label="Déplacer"
                            style={{ touchAction: "none", WebkitTouchCallout: "none" }}
                            {...attributes}
                            {...listeners}
                        >
                            ≡
                        </button>
                    )}

                    <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">
                            {capitalizeFirstLetter(name)}
                        </div>
                        <div className="text-xs opacity-70 flex gap-2">
                            <span>Qté: {qty}</span>
                            <span>•</span>
                            <span>{statusLabel}</span>
                            {item.custom_sort_index === null ? (
                                <>
                                    <span>•</span>
                                    <span>Non trié</span>
                                </>
                            ) : (
                                <>
                                    <span>•</span>
                                    <span>#{item.custom_sort_index + 1}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function ShoppingSort() {
    const shoppingList = useShoppingListStore((state) => state.view);
    const shoppingListRefresh = useShoppingListStore((state) => state.forceSync);
    const navigate = useNavigate();

    const items = useMemo(() => {
        const list = shoppingList?.items;
        return Array.isArray(list) ? list : [];
    }, [shoppingList]);

    const initialSortedItems = useMemo(() => sortByCustomSortIndex(items), [items]);

    const [orderedIds, setOrderedIds] = useState<number[]>([]);
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">(
        "idle",
    );

    const [isDragging, setIsDragging] = useState(false);

    const [isCoarsePointer, setIsCoarsePointer] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function")
            return;

        const mq = window.matchMedia("(pointer: coarse)");
        const update = () => setIsCoarsePointer(!!mq.matches);
        update();

        try {
            mq.addEventListener("change", update);
            return () => mq.removeEventListener("change", update);
        } catch {
            // Safari < 14
            mq.addListener(update);
            return () => mq.removeListener(update);
        }
    }, []);

    useEffect(() => {
        if (!isCoarsePointer) return;
        if (typeof document === "undefined") return;

        if (!isDragging) return;

        const html = document.documentElement;
        const body = document.body;

        const prevHtmlOverscroll = html.style.overscrollBehavior;
        const prevBodyOverscroll = body.style.overscrollBehavior;
        const prevBodyTouchAction = body.style.touchAction;
        const prevBodyOverflow = body.style.overflow;

        html.style.overscrollBehavior = "none";
        body.style.overscrollBehavior = "none";
        body.style.touchAction = "none";
        body.style.overflow = "hidden";

        const preventTouchMove = (e: TouchEvent) => {
            e.preventDefault();
        };

        // Empêche le scroll pendant le drag (important sur iOS)
        document.addEventListener("touchmove", preventTouchMove, { passive: false });

        return () => {
            document.removeEventListener("touchmove", preventTouchMove);
            html.style.overscrollBehavior = prevHtmlOverscroll;
            body.style.overscrollBehavior = prevBodyOverscroll;
            body.style.touchAction = prevBodyTouchAction;
            body.style.overflow = prevBodyOverflow;
        };
    }, [isDragging, isCoarsePointer]);

    useEffect(() => {
        if (!shoppingList) return;
        // Initialisation seulement si on n'a pas encore d'ordre local
        setOrderedIds((prev) =>
            prev.length > 0 ? prev : initialSortedItems.map((it) => it.id),
        );
        setSaveStatus("idle");
    }, [shoppingList?.id, initialSortedItems, shoppingList]);

    useEffect(() => {
        if (!shoppingList) return;
        // Si la liste se resynchronise, on conserve l'ordre local et on:
        // - supprime les ids qui n'existent plus
        // - ajoute en bas les nouveaux ids
        setOrderedIds((prev) => {
            const presentIds = items.map((it) => it.id);
            const present = new Set(presentIds);
            const cleaned = prev.filter((id) => present.has(id));
            const missing = presentIds.filter((id) => !cleaned.includes(id));
            return [...cleaned, ...missing];
        });
    }, [items, shoppingList]);

    useEffect(() => {
        if (!shoppingList) {
            navigate("/shopping_home");
        }
    }, [shoppingList, navigate]);

    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: { distance: 6 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: isCoarsePointer
                ? { delay: 220, tolerance: 8 }
                : { delay: 120, tolerance: 6 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const itemById = useMemo(() => {
        const map = new Map<number, ShoppingListItemDetailed>();
        for (const it of items) map.set(it.id, it);
        return map;
    }, [items]);

    const orderedItems = useMemo(() => {
        const list: ShoppingListItemDetailed[] = [];
        for (const id of orderedIds) {
            const it = itemById.get(id);
            if (it) list.push(it);
        }
        return list;
    }, [orderedIds, itemById]);

    const onDragEnd = (event: DragEndEvent) => {
        setIsDragging(false);
        const { active, over } = event;
        if (!over) return;
        if (active.id === over.id) return;

        if (typeof active.id !== "number" || typeof over.id !== "number") return;
        const activeId = active.id;
        const overId = over.id;

        setOrderedIds((prev) => {
            const oldIndex = prev.indexOf(activeId);
            const newIndex = prev.indexOf(overId);
            if (oldIndex === -1 || newIndex === -1) return prev;
            return arrayMove(prev, oldIndex, newIndex);
        });
    };

    const handleSave = async () => {
        if (!shoppingList) return;
        if (saveStatus === "saving") return;

        setSaveStatus("saving");
        try {
            await apiClient.post(
                `/shopping_lists/sort_items/${shoppingList.id}`,
                orderedItems.map((it) => it.id),
            );
            await shoppingListRefresh();
            setSaveStatus("saved");
            navigate("/shopping_home");
        } catch (e) {
            if (axios.isAxiosError(e) && e.code === "ERR_CANCELED") {
                setSaveStatus("idle");
                return;
            }
            console.error("Failed to sort items", e);
            setSaveStatus("error");
            alert("Une erreur est survenue lors de l'enregistrement du tri.");
        }
    };

    if (!shoppingList) return null;

    return (
        <div className="p-4 md:max-w-3/4 xxl:max-w-2/3 mx-auto">
            <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex flex-col">
                    <h1 className="text-xl font-bold">Trier la liste</h1>
                    <p className="text-sm opacity-70">
                        {isCoarsePointer
                            ? "Appui long puis glisser pour déplacer les articles."
                            : "Glisse-dépose les articles pour définir l'ordre d'affichage."}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => navigate("/shopping_home")}
                        disabled={saveStatus === "saving"}
                    >
                        Retour
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={saveStatus === "saving" || orderedItems.length === 0}
                    >
                        {saveStatus === "saving" ? (
                            <span className="flex items-center gap-2">
                                <span className="loading loading-spinner loading-sm" />
                                Enregistrement…
                            </span>
                        ) : (
                            "Enregistrer"
                        )}
                    </button>
                </div>
            </div>

            {orderedItems.length === 0 ? (
                <div className="card bg-base-300 shadow-xl">
                    <div className="card-body">
                        <p className="text-sm opacity-70 text-center">
                            Aucun article à trier.
                        </p>
                    </div>
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={() => setIsDragging(true)}
                    onDragCancel={() => setIsDragging(false)}
                    onDragEnd={onDragEnd}
                >
                    <SortableContext
                        items={orderedIds}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="flex flex-col gap-3">
                            {orderedItems.map((item) => (
                                <SortableItemRow
                                    key={item.id}
                                    id={item.id}
                                    item={item}
                                    grabWholeCard={isCoarsePointer}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
}
