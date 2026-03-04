import { apiClient } from "~/api/apiClient";
import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useShoppingListStore } from "~/stores/shopping_list";

type ProductLite = {
    id: number;
    name: string;
    default_price?: number | null;
    comment?: string | null;
    category?: string | null;
};

type CategoryLite = {
    id: number;
    name: string;
};

type FormValues = {
    productQuery: string;

    // Détails du produit (uniquement si création)
    categoryName: string;
    noCategory: boolean;
    defaultPrice?: number;
    comment: string;

    // Détails de l'ajout dans la liste
    quantity: number;
    price?: number;
    inPromotion: boolean;
};

const normalize = (s: string) => s.trim().toLowerCase();
const safeTrim = (s: unknown) => (typeof s === "string" ? s.trim() : "");

const endpointAllProducts = "/shopping_list_globals/all_products_lite";
const endpointRegisterArticle = "/shopping_list_globals/register_article";
const endpointSearchCategories = (name: string) =>
    `/categories/search/${encodeURIComponent(name)}`;

export default function FormAjoutArticle() {
    const shoppingListId = useShoppingListStore((s) => s.view?.id ?? null);
    const forceSync = useShoppingListStore((s) => s.forceSync);

    const [allProducts, setAllProducts] = useState<ProductLite[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<ProductLite | null>(null);
    const [productMenuOpen, setProductMenuOpen] = useState(false);

    const [categorySuggestions, setCategorySuggestions] = useState<CategoryLite[]>([]);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitOk, setSubmitOk] = useState<string | null>(null);

    const formRef = useRef<HTMLFormElement | null>(null);
    const categorySearchAbortRef = useRef<AbortController | null>(null);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        mode: "onBlur",
        defaultValues: {
            productQuery: "",
            categoryName: "",
            noCategory: false,
            defaultPrice: undefined,
            comment: "",
            quantity: 1,
            price: 0,
            inPromotion: false,
        },
    });

    const productQuery = watch("productQuery");
    const categoryName = watch("categoryName");
    const noCategory = watch("noCategory");
    const defaultPrice = watch("defaultPrice");

    const isCreatingProduct = !selectedProduct;

    useEffect(() => {
        const controller = new AbortController();
        (async () => {
            try {
                const r = await apiClient.get<ProductLite[]>(endpointAllProducts, {
                    signal: controller.signal,
                });
                setAllProducts(Array.isArray(r.data) ? r.data : []);
            } catch (e) {
                if (axios.isAxiosError(e) && e.code === "ERR_CANCELED") return;
                console.warn("Error fetching products:", e);
            }
        })();

        return () => controller.abort();
    }, []);

    const filteredProducts = useMemo(() => {
        const q = normalize(productQuery ?? "");
        if (!q) return [];

        const scored = allProducts
            .map((p) => {
                const name = normalize(p.name);
                const category = normalize(p.category ?? "");
                const inName = name.includes(q);
                const inCat = category.includes(q);
                if (!inName && !inCat) return null;
                const score = name.startsWith(q) ? 0 : inName ? 1 : 2;
                return { p, score };
            })
            .filter(Boolean) as Array<{ p: ProductLite; score: number }>;

        scored.sort((a, b) => a.score - b.score || a.p.name.localeCompare(b.p.name));
        return scored.slice(0, 8).map((x) => x.p);
    }, [allProducts, productQuery]);

    useEffect(() => {
        if (!selectedProduct) return;

        const q = normalize(productQuery ?? "");
        const n = normalize(selectedProduct.name);
        if (q !== n) {
            setSelectedProduct(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productQuery]);

    useEffect(() => {
        if (!noCategory) return;
        if (categoryName) setValue("categoryName", "");
    }, [noCategory, categoryName, setValue]);

    // Recherche de catégories (aide à sélectionner une catégorie existante)
    useEffect(() => {
        if (!isCreatingProduct) {
            setCategorySuggestions([]);
            return;
        }

        const q = normalize(categoryName ?? "");
        if (noCategory || !q) {
            setCategorySuggestions([]);
            return;
        }

        const timer = setTimeout(() => {
            categorySearchAbortRef.current?.abort();
            const controller = new AbortController();
            categorySearchAbortRef.current = controller;

            (async () => {
                try {
                    const r = await apiClient.get<CategoryLite[]>(
                        endpointSearchCategories(q),
                        {
                            signal: controller.signal,
                            validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
                        },
                    );
                    if (r.status === 404) {
                        setCategorySuggestions([]);
                        return;
                    }
                    setCategorySuggestions(Array.isArray(r.data) ? r.data : []);
                } catch (e) {
                    if (axios.isAxiosError(e) && e.code === "ERR_CANCELED") return;
                    setCategorySuggestions([]);
                }
            })();
        }, 250);

        return () => clearTimeout(timer);
    }, [categoryName, noCategory, isCreatingProduct]);

    const resolvedCategoryId = useMemo(() => {
        const q = normalize(categoryName ?? "");
        if (!q) return null;
        const exact = categorySuggestions.filter((c) => normalize(c.name) === q);
        return exact.length === 1 ? exact[0].id : null;
    }, [categoryName, categorySuggestions]);

    const productDefaultPrice = useMemo(() => {
        const p = selectedProduct?.default_price;
        if (typeof p === "number" && !Number.isNaN(p)) return p;
        const d = defaultPrice;
        if (typeof d === "number" && !Number.isNaN(d)) return d;
        return undefined;
    }, [selectedProduct, defaultPrice]);

    const closeDialog = () => {
        const dlg = formRef.current?.closest("dialog") as HTMLDialogElement | null;
        dlg?.close();
    };

    const onSubmit = handleSubmit(async (values) => {
        setSubmitError(null);
        setSubmitOk(null);

        if (!shoppingListId) {
            setSubmitError("Aucune liste de courses active.");
            return;
        }

        const name = safeTrim(values.productQuery);
        if (!name) {
            setSubmitError("Le produit est requis.");
            return;
        }

        const productIsExisting = !!selectedProduct;

        const categoryTrim = safeTrim(values.categoryName);
        const categoryPayload = values.noCategory
            ? null
            : resolvedCategoryId
              ? resolvedCategoryId
              : categoryTrim
                ? { name: categoryTrim }
                : null;

        const productPayload = productIsExisting
            ? selectedProduct!.id
            : {
                  name,
                  category_id: categoryPayload,
                  default_price:
                      typeof values.defaultPrice === "number" &&
                      !Number.isNaN(values.defaultPrice)
                          ? values.defaultPrice
                          : undefined,
                  comment: safeTrim(values.comment) || undefined,
              };

        let price = values.price;
        if (typeof price !== "number" || Number.isNaN(price)) {
            const fallback = productIsExisting
                ? selectedProduct?.default_price
                : values.defaultPrice;
            price =
                typeof fallback === "number" && !Number.isNaN(fallback) ? fallback : 0;
        }

        const payload = {
            shopping_list: shoppingListId,
            in_promotion: !!values.inPromotion,
            price,
            quantity: values.quantity,
            product: productPayload,
        };

        try {
            await apiClient.post(endpointRegisterArticle, payload);
            setSubmitOk("Article ajouté.");
            await forceSync().catch(() => {});

            reset({
                productQuery: "",
                categoryName: "",
                noCategory: false,
                defaultPrice: undefined,
                comment: "",
                quantity: 1,
                price: undefined,
                inPromotion: false,
            });
            setSelectedProduct(null);
            setCategorySuggestions([]);
            setProductMenuOpen(false);
            closeDialog();
        } catch (e) {
            const status = axios.isAxiosError(e) ? e.response?.status : undefined;
            const detail = axios.isAxiosError(e)
                ? (e.response?.data as any)?.detail
                : undefined;

            const msg =
                status === 404
                    ? "Liste/produit/catégorie introuvable (404)."
                    : status === 409
                      ? "Conflit (409) : doublon détecté côté serveur."
                      : "Échec de l’ajout de l’article.";

            setSubmitError(typeof detail === "string" && detail.trim() ? detail : msg);
        }
    });

    return (
        <form
            ref={formRef}
            className="flex flex-col gap-4"
            onSubmit={onSubmit}
            onKeyDown={(e) => {
                if (e.key === "Escape") setProductMenuOpen(false);
            }}
        >
            <div>
                <h2 className="font-bold text-lg text-center">Ajout d'un article</h2>
            </div>

            {!shoppingListId ? (
                <div className="alert alert-warning">
                    <span>Aucune liste de courses active.</span>
                </div>
            ) : null}

            <section className="bg-base-200 rounded-box p-4">
                <div className="flex items-center justify-between gap-3">
                    <h4 className="font-semibold">1) Sélection du produit</h4>
                    {selectedProduct ? (
                        <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => {
                                reset();
                            }}
                        >
                            Créer un nouveau produit
                        </button>
                    ) : null}
                </div>

                <div className="form-control mt-3">
                    <label className="label">
                        <span className="label-text">Produit</span>
                    </label>

                    <div className="relative">
                        <input
                            className="input input-bordered w-full"
                            placeholder="Tape un nom (ex: lait, tomates…)"
                            autoComplete="off"
                            {...register("productQuery", {
                                required: "Le produit est requis",
                                validate: (v) =>
                                    safeTrim(v).length > 0 || "Le produit est requis",
                            })}
                            onFocus={() => {
                                if (safeTrim(productQuery)) setProductMenuOpen(true);
                            }}
                            onChange={(e) => {
                                setSubmitError(null);
                                setSubmitOk(null);
                                setValue("productQuery", e.target.value, {
                                    shouldValidate: true,
                                });
                                setProductMenuOpen(true);
                            }}
                            onBlur={() => {
                                // Laisser le temps aux clics dans le menu.
                                setTimeout(() => setProductMenuOpen(false), 120);
                            }}
                        />

                        {productMenuOpen && safeTrim(productQuery) ? (
                            <div className="absolute z-10 mt-1 w-full">
                                <ul
                                    className="menu bg-base-100 rounded-box shadow p-2"
                                    onMouseDown={(e) => e.preventDefault()}
                                >
                                    {filteredProducts.length === 0 ? (
                                        <li>
                                            <span className="text-sm opacity-70">
                                                Aucun produit trouvé.
                                            </span>
                                        </li>
                                    ) : (
                                        filteredProducts.map((p) => (
                                            <li key={p.id}>
                                                <button
                                                    type="button"
                                                    className="justify-between"
                                                    onClick={() => {
                                                        setSelectedProduct(p);
                                                        setValue("productQuery", p.name, {
                                                            shouldValidate: true,
                                                        });
                                                        setProductMenuOpen(false);
                                                    }}
                                                >
                                                    <span className="font-medium">
                                                        {p.name}
                                                    </span>
                                                    <span className="text-xs opacity-70">
                                                        {safeTrim(p.category) ||
                                                            "Sans catégorie"}
                                                    </span>
                                                </button>
                                            </li>
                                        ))
                                    )}

                                    <li className="mt-1">
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm justify-start"
                                            onClick={() => setProductMenuOpen(false)}
                                        >
                                            Continuer avec “{safeTrim(productQuery)}”
                                            (création)
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        ) : null}
                    </div>

                    {errors.productQuery ? (
                        <p className="text-sm text-error mt-1">
                            {String(errors.productQuery.message)}
                        </p>
                    ) : null}

                    {selectedProduct ? (
                        <p className="text-xs opacity-70 mt-2">
                            Produit existant sélectionné (id {selectedProduct.id}) ·
                            Catégorie : {safeTrim(selectedProduct.category) || "—"}
                            {typeof selectedProduct.default_price === "number" ? (
                                <> · Prix par défaut : {selectedProduct.default_price}</>
                            ) : null}
                        </p>
                    ) : (
                        <p className="text-xs opacity-70 mt-2">
                            Aucun produit existant sélectionné : le produit sera créé avec
                            les détails ci-dessous.
                        </p>
                    )}
                </div>

                {isCreatingProduct ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Catégorie (optionnel)</span>
                            </label>
                            <input
                                className="input input-bordered"
                                placeholder="Ex: Épicerie"
                                list="form-ajout-article-categories"
                                disabled={noCategory}
                                {...register("categoryName")}
                            />
                            <datalist id="form-ajout-article-categories">
                                {categorySuggestions.map((c) => (
                                    <option key={c.id} value={c.name} />
                                ))}
                            </datalist>

                            {!noCategory && safeTrim(categoryName) ? (
                                <p className="text-xs opacity-70 mt-2">
                                    {resolvedCategoryId
                                        ? `Catégorie existante détectée (id ${resolvedCategoryId}).`
                                        : "Catégorie nouvelle (créée si besoin)."}
                                </p>
                            ) : null}
                        </div>

                        <div className="form-control">
                            <label className="label cursor-pointer justify-start gap-3">
                                <input
                                    type="checkbox"
                                    className="checkbox"
                                    {...register("noCategory")}
                                />
                                <span className="label-text">Pas de catégorie</span>
                            </label>
                            <p className="text-xs opacity-70">
                                Coche si tu veux explicitement aucune catégorie.
                            </p>
                        </div>

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Prix par défaut</span>
                                <span className="label-text-alt opacity-70">
                                    optionnel
                                </span>
                            </label>
                            <input
                                type="number"
                                className="input input-bordered"
                                min={0}
                                step="0.01"
                                placeholder="0"
                                {...register("defaultPrice", {
                                    valueAsNumber: true,
                                    min: { value: 0, message: "Doit être ≥ 0" },
                                })}
                            />
                            {errors.defaultPrice ? (
                                <p className="text-sm text-error mt-1">
                                    {String(errors.defaultPrice.message)}
                                </p>
                            ) : null}
                        </div>

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Commentaire</span>
                                <span className="label-text-alt opacity-70">
                                    optionnel
                                </span>
                            </label>
                            <input
                                className="input input-bordered"
                                placeholder="Ex: prendre la marque X si possible"
                                {...register("comment")}
                            />
                        </div>
                    </div>
                ) : null}
            </section>

            <div className="divider my-0" />

            <section className="bg-base-200 rounded-box p-4">
                <h4 className="font-semibold">2) Détails dans la liste</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Quantité</span>
                        </label>
                        <input
                            type="number"
                            className="input input-bordered"
                            min={1}
                            step={1}
                            {...register("quantity", {
                                valueAsNumber: true,
                                required: "La quantité est requise",
                                min: { value: 1, message: "La quantité doit être > 0" },
                            })}
                        />
                        {errors.quantity ? (
                            <p className="text-sm text-error mt-1">
                                {String(errors.quantity.message)}
                            </p>
                        ) : null}
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Prix</span>
                            <span className="label-text-alt opacity-70">
                                vide = prix par défaut produit (ou 0)
                            </span>
                        </label>
                        <input
                            type="number"
                            className="input input-bordered"
                            min={0}
                            step="0.01"
                            placeholder={
                                typeof productDefaultPrice === "number"
                                    ? String(productDefaultPrice)
                                    : "0"
                            }
                            {...register("price", {
                                valueAsNumber: true,
                                min: { value: 0, message: "Le prix doit être ≥ 0" },
                            })}
                        />
                        {errors.price ? (
                            <p className="text-sm text-error mt-1">
                                {String(errors.price.message)}
                            </p>
                        ) : null}
                    </div>
                </div>

                <div className="form-control mt-3">
                    <label className="label cursor-pointer justify-start gap-3">
                        <input
                            type="checkbox"
                            className="checkbox"
                            {...register("inPromotion")}
                        />
                        <span className="label-text">En promotion</span>
                    </label>
                </div>
            </section>

            {submitError ? (
                <div className="alert alert-error">
                    <span>{submitError}</span>
                </div>
            ) : null}
            {submitOk ? (
                <div className="alert alert-success">
                    <span>{submitOk}</span>
                </div>
            ) : null}

            <div className="flex items-center justify-end gap-3">
                {isSubmitting ? (
                    <span className="loading loading-spinner loading-sm" />
                ) : null}
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting || !shoppingListId}
                >
                    Ajouter
                </button>
            </div>
        </form>
    );
}
