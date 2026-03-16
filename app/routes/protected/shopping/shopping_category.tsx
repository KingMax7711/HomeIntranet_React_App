import type { Route } from "./+types/shopping_category";
import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "~/api/apiClient";
import CategoryCard from "~/components/shopping_components/CategoryCard";
import FormAjoutCategory from "~/components/shopping_components/FormAjoutCategory";
import FormEditCategory from "~/components/shopping_components/FormEditCategory";
import type { CategoryBase, CategoryCreate } from "~/types/category";
import { capitalizeFirstLetter } from "~/tools/formater";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "NestBoard - Catégories" },
        { name: "description", content: "Gestion des catégories" },
    ];
}

export default function ShoppingCategory() {
    const [categories, setCategories] = useState<CategoryBase[]>([]);
    const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");

    const [searchQuery, setSearchQuery] = useState("");
    const [refreshIndex, setRefreshIndex] = useState(0);

    const addDialogRef = useRef<HTMLDialogElement | null>(null);
    const editDialogRef = useRef<HTMLDialogElement | null>(null);
    const deleteDialogRef = useRef<HTMLDialogElement | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<CategoryBase | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<CategoryBase | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

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

    const handleOpenAdd = () => openDialogAtTop(addDialogRef.current);
    const handleOpenEdit = (category: CategoryBase) => {
        setSelectedCategory(category);
        openDialogAtTop(editDialogRef.current);
    };
    const handleOpenDeleteConfirm = (category: CategoryBase) => {
        setCategoryToDelete(category);
        openDialogAtTop(deleteDialogRef.current);
    };

    const handleCreate = async (payload: CategoryCreate) => {
        await apiClient.post("/categories/create", payload);
        setRefreshIndex((v) => v + 1);
    };

    const handleUpdate = async (categoryId: number, payload: CategoryCreate) => {
        await apiClient.put(`/categories/update/${categoryId}`, payload);
        setRefreshIndex((v) => v + 1);
    };

    const closeDeleteDialog = () => {
        if (isDeleting) return;
        deleteDialogRef.current?.close();
        setCategoryToDelete(null);
    };

    const handleDelete = async () => {
        const id = categoryToDelete?.id;
        if (!id) return;

        setIsDeleting(true);
        try {
            const r = await apiClient.delete(`/categories/delete/${id}`);
            closeDeleteDialog();
            setRefreshIndex((v) => v + 1);
        } catch (e) {
            const detail = axios.isAxiosError(e)
                ? (e.response?.data as any)?.detail
                : undefined;
            alert(
                typeof detail === "string" && detail.trim()
                    ? detail
                    : "Une erreur est survenue lors de la suppression de la catégorie.",
            );
        } finally {
            setIsDeleting(false);
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        setStatus("loading");

        (async () => {
            try {
                const r = await apiClient.get<CategoryBase[]>("/categories/all", {
                    signal: controller.signal,
                });
                setCategories(Array.isArray(r.data) ? r.data : []);
                setStatus("loaded");
            } catch (e) {
                if (axios.isAxiosError(e) && e.code === "ERR_CANCELED") return;
                console.error("Failed to fetch categories", e);
                setCategories([]);
                setStatus("error");
            }
        })();

        return () => controller.abort();
    }, [refreshIndex]);

    const sortedCategories = useMemo(() => {
        const list = Array.isArray(categories) ? [...categories] : [];
        list.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
        return list;
    }, [categories]);

    const filteredCategories = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return sortedCategories;
        return sortedCategories.filter((category) =>
            (category.name ?? "").toLowerCase().includes(q),
        );
    }, [sortedCategories, searchQuery]);

    return (
        <div className="pt-4 md:px-4 md:max-w-3/4 xxl:max-w-2/3 mx-auto">
            <div className="card bg-base-300 shadow-xl">
                <div className="card-body gap-4">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="card-title">Liste des catégories</h2>

                        <input
                            type="search"
                            className="hidden md:block input input-bordered w-1/4"
                            placeholder="Rechercher une catégorie…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />

                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={handleOpenAdd}
                        >
                            Ajouter une catégorie
                        </button>
                    </div>

                    <div className="w-full md:hidden">
                        <div className="form-control flex-1">
                            <input
                                type="search"
                                className="input input-bordered input-sm w-full"
                                placeholder="Rechercher une catégorie…"
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
                    ) : filteredCategories.length === 0 ? (
                        <p className="text-sm opacity-70 text-center">
                            {searchQuery.trim()
                                ? "Aucune catégorie ne correspond à la recherche."
                                : "Aucune catégorie enregistrée pour le moment."}
                        </p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {filteredCategories.map((category) => (
                                <CategoryCard
                                    key={category.id}
                                    category={category}
                                    onEdit={handleOpenEdit}
                                    onDelete={handleOpenDeleteConfirm}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <dialog ref={addDialogRef} className="modal" tabIndex={-1}>
                <div className="modal-box w-11/12 max-w-none sm:max-w-2xl max-h-[90dvh] sm:max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain px-3 sm:px-6 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pt-6 sm:pb-6 rounded-3xl">
                    <FormAjoutCategory onSubmit={handleCreate} />
                </div>
            </dialog>

            <dialog
                ref={editDialogRef}
                className="modal"
                onClose={() => setSelectedCategory(null)}
                tabIndex={-1}
            >
                <div className="modal-box w-11/12 max-w-none sm:max-w-2xl max-h-[90dvh] sm:max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain px-3 sm:px-6 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pt-6 sm:pb-6">
                    <h2 className="text-xl font-bold text-center pb-3 sm:pb-4">
                        Édition de la catégorie
                    </h2>
                    <FormEditCategory
                        category={selectedCategory}
                        onSubmit={handleUpdate}
                    />
                </div>
            </dialog>

            <dialog
                ref={deleteDialogRef}
                className="modal"
                onClose={() => {
                    if (!isDeleting) setCategoryToDelete(null);
                }}
                tabIndex={-1}
            >
                <div className="modal-box w-11/12 max-w-md">
                    <h3 className="font-bold text-lg">Confirmer la suppression</h3>
                    <p className="py-3 text-sm opacity-80">
                        Supprimer la catégorie
                        <span className="font-semibold">
                            {` ${capitalizeFirstLetter(categoryToDelete?.name ?? "")}`}
                        </span>
                        ?
                    </p>

                    <div className="modal-action mt-2">
                        <button
                            type="button"
                            className="btn"
                            onClick={closeDeleteDialog}
                            disabled={isDeleting}
                        >
                            Annuler
                        </button>
                        <button
                            type="button"
                            className="btn btn-error"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <span className="flex items-center gap-2">
                                    <span className="loading loading-spinner loading-xs" />
                                    Suppression…
                                </span>
                            ) : (
                                "Supprimer"
                            )}
                        </button>
                    </div>
                </div>
            </dialog>
        </div>
    );
}
