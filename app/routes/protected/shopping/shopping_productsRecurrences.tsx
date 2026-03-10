import type { Route } from "./+types/shopping_productsRecurrences";
import type {
    ShoppingRecurrenceDetailled,
    ShoppingRecurrenceCreate,
} from "~/types/shoppingRecurences";
import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "~/api/apiClient";
import FormAjoutRecurrence, {
    type RecurrenceProductOption,
} from "~/components/shopping_components/FormAjoutRecurrence";
import ShoppingRecurrenceCard from "~/components/shopping_components/ShoppingRecurrenceCard";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "NestBoard - Récurrences" },
        { name: "description", content: "Page des récurrences produits" },
    ];
}

export default function ShoppingProductsRecurrences() {
    const [recurrences, setRecurrences] = useState<ShoppingRecurrenceDetailled[]>([]);
    const [products, setProducts] = useState<RecurrenceProductOption[]>([]);
    const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
    const [searchQuery, setSearchQuery] = useState("");
    const [refreshIndex, setRefreshIndex] = useState(0);
    const [deletingById, setDeletingById] = useState<Record<number, boolean>>({});

    const addDialogRef = useRef<HTMLDialogElement | null>(null);

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

    useEffect(() => {
        const controller = new AbortController();
        setStatus("loading");

        (async () => {
            try {
                const [recurrencesResponse, productsResponse] = await Promise.all([
                    apiClient.get<ShoppingRecurrenceDetailled[]>(
                        "/product_recurrences/all_detailled",
                        { signal: controller.signal },
                    ),
                    apiClient.get<RecurrenceProductOption[]>(
                        "/shopping_list_globals/all_products_lite",
                        { signal: controller.signal },
                    ),
                ]);

                setRecurrences(
                    Array.isArray(recurrencesResponse.data)
                        ? recurrencesResponse.data
                        : [],
                );
                setProducts(
                    Array.isArray(productsResponse.data) ? productsResponse.data : [],
                );
                setStatus("loaded");
            } catch (e) {
                if (axios.isAxiosError(e) && e.code === "ERR_CANCELED") return;
                console.error("Failed to fetch shopping recurrences:", e);
                setRecurrences([]);
                setProducts([]);
                setStatus("error");
            }
        })();

        return () => controller.abort();
    }, [refreshIndex]);

    const existingProductIds = useMemo(
        () => recurrences.map((recurrence) => recurrence.product_id),
        [recurrences],
    );

    const filteredRecurrences = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const list = Array.isArray(recurrences) ? [...recurrences] : [];
        list.sort((a, b) => a.product_name.localeCompare(b.product_name));

        if (!q) return list;

        return list.filter((recurrence) => {
            const productName = recurrence.product_name?.toLowerCase() ?? "";
            const houseName = recurrence.house_name?.toLowerCase() ?? "";
            return productName.includes(q) || houseName.includes(q);
        });
    }, [recurrences, searchQuery]);

    const handleOpenAdd = () => openDialogAtTop(addDialogRef.current);

    const handleCreate = async (payload: ShoppingRecurrenceCreate) => {
        await apiClient.post("/product_recurrences/create", payload);
        setRefreshIndex((value) => value + 1);
    };

    const handleDelete = (recurrence: ShoppingRecurrenceDetailled) => {
        const id = recurrence.id;
        if (!id || deletingById[id]) return;

        (async () => {
            setDeletingById((prev) => ({ ...prev, [id]: true }));
            try {
                await apiClient.delete(`/product_recurrences/delete/${id}`);
                setRefreshIndex((value) => value + 1);
            } catch (e) {
                const detail = axios.isAxiosError(e)
                    ? (e.response?.data as any)?.detail
                    : undefined;
                alert(
                    typeof detail === "string" && detail.trim()
                        ? detail
                        : "Une erreur est survenue lors de la suppression de la récurrence.",
                );
            } finally {
                setDeletingById((prev) => ({ ...prev, [id]: false }));
            }
        })();
    };

    return (
        <div className="pt-4 md:px-4 md:max-w-3/4 xxl:max-w-2/3 mx-auto">
            <div className="card bg-base-300 shadow-xl">
                <div className="card-body gap-4">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="card-title">Produits récurrents</h2>

                        <input
                            type="search"
                            className="hidden md:block input input-bordered w-1/4"
                            placeholder="Rechercher une récurrence…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />

                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={handleOpenAdd}
                        >
                            Ajouter une récurrence
                        </button>
                    </div>

                    <div className="w-full md:hidden">
                        <div className="form-control flex-1">
                            <input
                                type="search"
                                className="input input-bordered input-sm w-full"
                                placeholder="Rechercher une récurrence…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="divider my-0" />

                    {status === "loading" ? (
                        <p className="text-sm opacity-70 flex items-center gap-2">
                            <span className="loading loading-spinner loading-xs" />
                            Chargement…
                        </p>
                    ) : status === "error" ? (
                        <p className="text-sm text-error">Indisponible</p>
                    ) : filteredRecurrences.length === 0 ? (
                        <p className="text-sm opacity-70 text-center">
                            {searchQuery.trim()
                                ? "Aucune récurrence ne correspond à la recherche."
                                : "Aucune récurrence enregistrée pour le moment."}
                        </p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {filteredRecurrences.map((recurrence) => (
                                <ShoppingRecurrenceCard
                                    key={recurrence.id}
                                    recurrence={recurrence}
                                    onDelete={handleDelete}
                                    isDeleting={!!deletingById[recurrence.id]}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <dialog ref={addDialogRef} className="modal" tabIndex={-1}>
                <div className="modal-box w-11/12 max-w-none sm:max-w-2xl max-h-[90dvh] sm:max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain px-3 sm:px-6 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pt-6 sm:pb-6 rounded-3xl">
                    <FormAjoutRecurrence
                        products={products}
                        existingProductIds={existingProductIds}
                        onSubmit={handleCreate}
                    />
                </div>
            </dialog>
        </div>
    );
}
