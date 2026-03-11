import type { Route } from "./+types/shopping_products";
import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "~/api/apiClient";
import ProductCard, {
    type ProductCatalogItem,
    type Category,
    type AddToListState,
} from "~/components/shopping_components/ProductCard";
import FormAjoutProduit from "~/components/shopping_components/FormAjoutProduit";
import FormEditProduit from "~/components/shopping_components/FormEditProduit";
import { useShoppingListStore } from "~/stores/shopping_list";
import { capitalizeFirstLetter } from "~/tools/formater";

const endpointRegisterArticle = "/shopping_list_globals/register_article";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "NestBoard - Produits" },
        { name: "description", content: "Page de produits" },
    ];
}

export default function ShoppingProducts() {
    const shoppingList = useShoppingListStore((s) => s.view);

    const [products, setProducts] = useState<ProductCatalogItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
    const [lastCategory, setLastCategory] = useState<string>("");

    const [searchQuery, setSearchQuery] = useState("");

    const [refreshIndex, setRefreshIndex] = useState(0);

    const addDialogRef = useRef<HTMLDialogElement | null>(null);
    const editDialogRef = useRef<HTMLDialogElement | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<ProductCatalogItem | null>(
        null,
    );

    const [addToListById, setAddToListById] = useState<Record<number, AddToListState>>(
        {},
    );

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
    const handleOpenEdit = (product: ProductCatalogItem) => {
        setSelectedProduct(product);
        openDialogAtTop(editDialogRef.current);
    };

    const handleAddToList = (product: ProductCatalogItem) => {
        const listId = shoppingList?.id;
        if (!listId) {
            alert("Aucune liste de courses active.");
            return;
        }

        const currentState = addToListById[product.id] ?? "idle";
        if (currentState !== "idle") return;

        (async () => {
            setAddToListById((prev) => ({ ...prev, [product.id]: "adding" }));
            try {
                const price =
                    typeof product.default_price === "number" &&
                    Number.isFinite(product.default_price)
                        ? product.default_price
                        : 0;

                const payload = {
                    shopping_list: listId,
                    in_promotion: false,
                    need_coupons: false,
                    price,
                    quantity: 1,
                    product: product.id,
                };

                await apiClient.post(endpointRegisterArticle, payload);
                setAddToListById((prev) => ({ ...prev, [product.id]: "added" }));
            } catch (e) {
                const detail = axios.isAxiosError(e)
                    ? (e.response?.data as any)?.detail
                    : undefined;
                alert(
                    typeof detail === "string" && detail.trim()
                        ? detail
                        : "Impossible d’ajouter l’article à la liste.",
                );
                setAddToListById((prev) => ({ ...prev, [product.id]: "idle" }));
            }
        })();
    };

    const handleDelete = (product: ProductCatalogItem) => {
        const id = product.id;
        if (!id) return;

        (async () => {
            try {
                await apiClient.delete(`/products/delete/${id}`);
                setRefreshIndex((v) => v + 1);
            } catch (e) {
                const detail = axios.isAxiosError(e)
                    ? (e.response?.data as any)?.detail
                    : undefined;
                alert(
                    typeof detail === "string" && detail.trim()
                        ? detail
                        : "Une erreur est survenue lors de la suppression du produit.",
                );
            }
        })();
    };

    useEffect(() => {
        const controller = new AbortController();
        setStatus("loading");

        (async () => {
            try {
                const [r, c] = await Promise.all([
                    apiClient.get("/products/all", { signal: controller.signal }),
                    apiClient.get("/categories/all", { signal: controller.signal }),
                ]);
                setCategories(Array.isArray(c.data) ? c.data : []);
                setProducts(Array.isArray(r.data) ? r.data : []);
                setStatus("loaded");
            } catch (e) {
                if (axios.isAxiosError(e) && e.code === "ERR_CANCELED") return;
                console.error("Failed to fetch products", e);
                setProducts([]);
                setCategories([]);
                setStatus("error");
            }
        })();

        return () => controller.abort();
    }, [refreshIndex]);

    const sortedProducts = useMemo(() => {
        const list = Array.isArray(products) ? [...products] : [];
        list.forEach((p) => {
            if (p.category_id === undefined) return;
            const cat = categories.find((c) => c.id === p.category_id);
            if (cat) p.category = cat.name;
        });
        list.sort((a, b) => (a.category ?? "").localeCompare(b.category ?? ""));
        return list;
    }, [products, categories]);

    const filteredProducts = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return sortedProducts;
        return sortedProducts.filter((p) => (p.name ?? "").toLowerCase().includes(q));
    }, [sortedProducts, searchQuery]);

    return (
        <div className="pt-4 md:px-4 md:max-w-3/4 xxl:max-w-2/3 mx-auto">
            <div className="card bg-base-300 shadow-xl">
                <div className="card-body gap-1">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="card-title">Catalogue de produits</h2>

                        <input
                            type="search"
                            className="hidden md:block input input-bordered w-1/4"
                            placeholder="Rechercher un produit par nom…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />

                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={handleOpenAdd}
                        >
                            Ajouter un produit
                        </button>
                    </div>

                    <div className="w-full md:hidden">
                        <div className="form-control flex-1">
                            <input
                                type="search"
                                className="input input-bordered input-sm w-full"
                                placeholder="Rechercher un produit par nom…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="divider">
                        {capitalizeFirstLetter(
                            filteredProducts[0]?.category || "Sans catégorie",
                        )}
                    </div>

                    {status === "loading" ? (
                        <p className="text-sm opacity-70 flex items-center gap-2">
                            <span className="loading loading-spinner loading-xs" />
                            Chargement…
                        </p>
                    ) : status === "error" ? (
                        <p className="text-sm text-error">Indisponible</p>
                    ) : filteredProducts.length === 0 ? (
                        <p className="text-sm opacity-70 text-center">
                            {searchQuery.trim()
                                ? "Aucun produit ne correspond à la recherche."
                                : "Aucun produit enregistré pour le moment."}
                        </p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {filteredProducts.map((p) => (
                                <>
                                    <ProductCard
                                        key={p.id}
                                        product={p}
                                        onEdit={handleOpenEdit}
                                        onDelete={handleDelete}
                                        onAddToList={handleAddToList}
                                        addToListState={addToListById[p.id] ?? "idle"}
                                        addToListDisabled={!shoppingList?.id}
                                    />
                                    {p.category !==
                                        filteredProducts[filteredProducts.indexOf(p) + 1]
                                            ?.category && (
                                        <div className="divider my-0">
                                            {" "}
                                            {capitalizeFirstLetter(
                                                filteredProducts[
                                                    filteredProducts.indexOf(p) + 1
                                                ]?.category || "Sans catégorie",
                                            )}{" "}
                                        </div>
                                    )}
                                </>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <dialog ref={addDialogRef} className="modal" tabIndex={-1}>
                <div className="modal-box w-11/12 max-w-none sm:max-w-2xl max-h-[90dvh] sm:max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain px-3 sm:px-6 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pt-6 sm:pb-6 rounded-3xl">
                    <FormAjoutProduit onDone={() => setRefreshIndex((v) => v + 1)} />
                </div>
            </dialog>

            <dialog
                ref={editDialogRef}
                className="modal"
                onClose={() => setSelectedProduct(null)}
                tabIndex={-1}
            >
                <div className="modal-box w-11/12 max-w-none sm:max-w-2xl max-h-[90dvh] sm:max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain px-3 sm:px-6 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pt-6 sm:pb-6">
                    <h2 className="text-xl font-bold text-center pb-3 sm:pb-4">
                        Édition du produit
                    </h2>
                    <FormEditProduit
                        product={selectedProduct}
                        onDone={() => setRefreshIndex((v) => v + 1)}
                    />
                </div>
            </dialog>
        </div>
    );
}
