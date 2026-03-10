import { apiClient } from "~/api/apiClient";
import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useShoppingListStore } from "~/stores/shopping_list";
import {
    capitalizeFirstLetter,
    capitalizeAllWords,
    formatCurrencyEUR,
} from "~/tools/formater";

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
    categoryName: string;
    defaultPrice?: number;
    comment: string;
    quantity: number;
    price?: number;
    inPromotion: boolean;
    needCoupons: boolean;
};

const normalize = (s: string) => s.trim().toLowerCase();
const safeTrim = (s: unknown) => (typeof s === "string" ? s.trim() : "");

const endpointAllProducts = "/shopping_list_globals/all_products_lite";
const endpointAllCategories = "/shopping_list_globals/all_categories";
const endpointRegisterArticle = "/shopping_list_globals/register_article";

export default function FormAjoutArticle() {
    const shoppingList = useShoppingListStore((state) => state.view);

    const [products, setProducts] = useState<ProductLite[]>([]);
    const [categories, setCategories] = useState<CategoryLite[]>([]);
    const [refetchData, setRefetchData] = useState(0);

    const [selectedProduct, setSelectedProduct] = useState<ProductLite | null>(null);
    const [productMenuOpen, setProductMenuOpen] = useState(false);
    const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const formRef = useRef<HTMLFormElement | null>(null);

    const defaultFormValues: FormValues = {
        productQuery: "",
        categoryName: "",
        defaultPrice: undefined,
        comment: "",
        quantity: 1,
        price: undefined,
        inPromotion: false,
        needCoupons: false,
    };

    useEffect(() => {
        const controller = new AbortController();

        (async () => {
            try {
                const [productsRes, categoriesRes] = await Promise.all([
                    apiClient.get<ProductLite[]>(endpointAllProducts, {
                        signal: controller.signal,
                    }),
                    apiClient.get<CategoryLite[]>(endpointAllCategories, {
                        signal: controller.signal,
                    }),
                ]);

                setProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
                setCategories(
                    Array.isArray(categoriesRes.data) ? categoriesRes.data : [],
                );
            } catch (e) {
                if (axios.isAxiosError(e) && e.code === "ERR_CANCELED") return;
                console.error("Error fetching products/categories", e);
            }
        })();

        return () => controller.abort();
    }, [refetchData]);

    const {
        register,
        handleSubmit,
        reset,
        resetField,
        setValue,
        getValues,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        mode: "onBlur",
        shouldUnregister: true,
        defaultValues: {
            ...defaultFormValues,
        },
    });

    useEffect(() => {
        const dlg = formRef.current?.closest("dialog") as HTMLDialogElement | null;
        if (!dlg) return;

        const onClose = () => {
            reset(defaultFormValues);
            setSelectedProduct(null);
            setProductMenuOpen(false);
            setCategoryMenuOpen(false);
            setSubmitError(null);
        };

        dlg.addEventListener("close", onClose);
        return () => dlg.removeEventListener("close", onClose);
    }, [reset]);

    const productQuery = watch("productQuery");
    const categoryName = watch("categoryName");
    const defaultPrice = watch("defaultPrice");

    const bumpQuantity = (delta: number) => {
        const current = getValues("quantity");
        const safeCurrent =
            typeof current === "number" && !Number.isNaN(current) ? current : 1;
        const next = Math.max(1, Math.trunc(safeCurrent + delta));
        setValue("quantity", next, { shouldDirty: true, shouldValidate: true });
    };

    const bumpDefaultPrice = (delta: number) => {
        const current = getValues("defaultPrice");
        const safeCurrent =
            typeof current === "number" && !Number.isNaN(current) ? current : 0;
        const nextRaw = safeCurrent + delta;
        const nextRounded = Math.round(nextRaw * 100) / 100;
        const next = Math.max(0, nextRounded);
        setValue("defaultPrice", next, { shouldDirty: true, shouldValidate: true });
    };

    const bumpPrice = (delta: number) => {
        const current = getValues("price");
        const safeCurrent =
            typeof current === "number" && !Number.isNaN(current)
                ? current
                : typeof productDefaultPrice === "number" &&
                    !Number.isNaN(productDefaultPrice)
                  ? productDefaultPrice
                  : 0;
        const nextRaw = safeCurrent + delta;
        const nextRounded = Math.round(nextRaw * 100) / 100;
        const next = Math.max(0, nextRounded);
        setValue("price", next, { shouldDirty: true, shouldValidate: true });
    };

    const filteredProducts = useMemo(() => {
        const q = normalize(productQuery ?? "");
        if (!q) return [];
        const list = products.filter((p) => normalize(p.name).includes(q));
        list.sort((a, b) => a.name.localeCompare(b.name));
        return list.slice(0, 8);
    }, [products, productQuery]);

    const filteredCategories = useMemo(() => {
        const q = normalize(categoryName ?? "");
        if (!q) return [];
        const list = categories.filter((c) => normalize(c.name).includes(q));
        list.sort((a, b) => a.name.localeCompare(b.name));
        return list.slice(0, 8);
    }, [categories, categoryName]);

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

        const listId = shoppingList?.id;
        if (!listId) {
            setSubmitError("Aucune liste de courses active.");
            return;
        }

        const name = safeTrim(values.productQuery);
        if (!name) {
            setSubmitError("Choisis ou saisis un produit.");
            return;
        }

        const categoryTrim = safeTrim(values.categoryName);
        const resolvedCategory = categoryTrim
            ? categories.find((c) => normalize(c.name) === normalize(categoryTrim))
            : undefined;
        const categoryPayload = categoryTrim
            ? resolvedCategory
                ? resolvedCategory.id
                : { name: categoryTrim }
            : null;

        const productPayload = selectedProduct
            ? selectedProduct.id
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
            const fallback = selectedProduct?.default_price ?? values.defaultPrice;
            price =
                typeof fallback === "number" && !Number.isNaN(fallback) ? fallback : 0;
        }

        const payload = {
            shopping_list: listId,
            in_promotion: !!values.inPromotion,
            need_coupons: !!values.needCoupons, // !!! API currently expects "need_coupons" but we use "needCoupon" in the form for consistency
            price,
            quantity: values.quantity,
            product: productPayload,
        };

        try {
            await apiClient.post(endpointRegisterArticle, payload);
            setRefetchData((v) => v + 1);
            reset(defaultFormValues);
            setSelectedProduct(null);
            setProductMenuOpen(false);
            setCategoryMenuOpen(false);
            closeDialog();
        } catch (e) {
            const detail = axios.isAxiosError(e)
                ? (e.response?.data as any)?.detail
                : undefined;
            setSubmitError(
                typeof detail === "string" && detail.trim()
                    ? detail
                    : "Impossible d’ajouter l’article.",
            );
        }
    });

    const productBadgeLabel = selectedProduct ? "Existant" : "Nouveau";
    const productBadgeClass = selectedProduct
        ? "badge badge-primary badge-outline"
        : "badge badge-accent badge-outline";

    return (
        <div className="px-2">
            <h2 className="text-xl font-bold text-center pb-3 sm:pb-4">
                Ajout d'un article
            </h2>

            <form
                ref={formRef}
                onSubmit={onSubmit}
                className="flex flex-col gap-4"
                onKeyDown={(e) => {
                    if (e.key === "Escape") {
                        setProductMenuOpen(false);
                        setCategoryMenuOpen(false);
                    }
                }}
            >
                <section className="bg-base-200 rounded-box p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                        <h4 className="font-semibold">Sélection du produit</h4>
                        {selectedProduct ? (
                            <button
                                type="button"
                                className="btn btn-neutral btn-xs italic"
                                onClick={() => {
                                    setSelectedProduct(null);
                                    setValue("productQuery", "", {
                                        shouldValidate: true,
                                    });
                                    resetField("categoryName");
                                    resetField("defaultPrice");
                                    resetField("comment");
                                    setCategoryMenuOpen(false);
                                }}
                            >
                                Nouveau produit
                            </button>
                        ) : null}
                    </div>

                    <div className="form-control mt-3">
                        <label className="label">
                            <span className="label-text">Nom</span>
                        </label>
                        <div className="relative">
                            <input
                                className={`input input-bordered w-full ${errors.productQuery ? "input-error" : ""}`}
                                placeholder="Ex: Lait"
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
                                    const v = e.target.value;
                                    setValue("productQuery", v, { shouldValidate: true });
                                    setProductMenuOpen(true);
                                    if (
                                        selectedProduct &&
                                        normalize(v) !== normalize(selectedProduct.name)
                                    ) {
                                        setSelectedProduct(null);
                                    }
                                }}
                                onBlur={() => {
                                    setTimeout(() => setProductMenuOpen(false), 120);
                                }}
                            />

                            {productMenuOpen && safeTrim(productQuery) ? (
                                <div className="absolute z-30 mt-2 w-full">
                                    <ul
                                        className="menu bg-base-100 rounded-box shadow-xl border border-base-300 p-2"
                                        onMouseDown={(e) => e.preventDefault()}
                                    >
                                        {filteredProducts.length === 0 ? (
                                            <li>
                                                <span className="text-sm opacity-70">
                                                    Aucun résultat
                                                </span>
                                            </li>
                                        ) : (
                                            filteredProducts.map((p) => (
                                                <li key={p.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedProduct(p);
                                                            setValue(
                                                                "productQuery",
                                                                p.name,
                                                                {
                                                                    shouldValidate: true,
                                                                },
                                                            );
                                                            setProductMenuOpen(false);
                                                        }}
                                                    >
                                                        <span className="font-medium">
                                                            {p.name}
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
                                                Créer “{safeTrim(productQuery)}”
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            ) : null}
                        </div>
                        {errors.productQuery ? (
                            <span className="text-error text-sm mt-1">
                                {String(errors.productQuery.message)}
                            </span>
                        ) : null}
                    </div>

                    <div className="mt-4 bg-base-100 rounded-box p-3 sm:p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-lg font-semibold truncate">
                                    {selectedProduct
                                        ? capitalizeAllWords(selectedProduct.name)
                                        : safeTrim(productQuery) || "Nouveau produit"}
                                </div>
                            </div>
                            <span className={productBadgeClass}>{productBadgeLabel}</span>
                        </div>

                        <div className="divider my-3" />

                        {selectedProduct ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className="text-xs opacity-60">Catégorie</div>
                                    <div className="font-medium">
                                        {capitalizeFirstLetter(
                                            safeTrim(selectedProduct.category),
                                        ) || "—"}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs opacity-60">Prix</div>
                                    <div className="font-medium">
                                        {typeof selectedProduct.default_price === "number"
                                            ? formatCurrencyEUR(
                                                  selectedProduct.default_price,
                                              )
                                            : "—"}
                                    </div>
                                </div>
                                {safeTrim(selectedProduct.comment) ? (
                                    <div className="md:col-span-2">
                                        <div className="text-xs opacity-60">
                                            Commentaire
                                        </div>
                                        <div className="opacity-80 whitespace-pre-wrap italic">
                                            {selectedProduct.comment}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Catégorie</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            className="input input-bordered w-full"
                                            placeholder=""
                                            autoComplete="off"
                                            {...register("categoryName")}
                                            onFocus={() => {
                                                if (safeTrim(categoryName)) {
                                                    setCategoryMenuOpen(true);
                                                }
                                            }}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setValue("categoryName", v, {
                                                    shouldValidate: true,
                                                });
                                                setCategoryMenuOpen(true);
                                            }}
                                            onBlur={() => {
                                                setTimeout(
                                                    () => setCategoryMenuOpen(false),
                                                    120,
                                                );
                                            }}
                                        />

                                        {categoryMenuOpen && safeTrim(categoryName) ? (
                                            <div className="absolute z-30 mt-2 w-full">
                                                <ul
                                                    className="menu bg-base-100 rounded-box shadow-xl border border-base-300 p-2"
                                                    onMouseDown={(e) =>
                                                        e.preventDefault()
                                                    }
                                                >
                                                    {filteredCategories.length === 0 ? (
                                                        <li>
                                                            <span className="text-sm opacity-70">
                                                                Aucun résultat
                                                            </span>
                                                        </li>
                                                    ) : (
                                                        filteredCategories.map((c) => (
                                                            <li key={c.id}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setValue(
                                                                            "categoryName",
                                                                            c.name,
                                                                            {
                                                                                shouldValidate: true,
                                                                            },
                                                                        );
                                                                        setCategoryMenuOpen(
                                                                            false,
                                                                        );
                                                                    }}
                                                                >
                                                                    <span className="font-medium">
                                                                        {c.name}
                                                                    </span>
                                                                </button>
                                                            </li>
                                                        ))
                                                    )}
                                                    <li className="mt-1">
                                                        <button
                                                            type="button"
                                                            className="btn btn-ghost btn-sm justify-start"
                                                            onClick={() =>
                                                                setCategoryMenuOpen(false)
                                                            }
                                                        >
                                                            Créer “
                                                            {safeTrim(categoryName)}”
                                                        </button>
                                                    </li>
                                                </ul>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Prix</span>
                                    </label>
                                    <div className="flex items-stretch gap-2">
                                        <input
                                            type="number"
                                            inputMode="decimal"
                                            className={`input input-bordered flex-1 ${errors.defaultPrice ? "input-error" : ""}`}
                                            min={0}
                                            step={0.01}
                                            placeholder=""
                                            {...register("defaultPrice", {
                                                valueAsNumber: true,
                                                min: {
                                                    value: 0,
                                                    message: "Doit être ≥ 0",
                                                },
                                            })}
                                        />
                                    </div>
                                    {errors.defaultPrice ? (
                                        <p className="text-sm text-error mt-1">
                                            {String(errors.defaultPrice.message)}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="form-control md:col-span-2">
                                    <label className="label">
                                        <span className="label-text">Commentaire</span>
                                    </label>
                                    <textarea
                                        className="textarea textarea-bordered min-h-18 md:w-full"
                                        placeholder=""
                                        {...register("comment")}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <section className="bg-base-200 rounded-box p-3 sm:p-4">
                    <h4 className="font-semibold">Ajout dans la liste</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Quantité</span>
                            </label>
                            <div className="flex items-stretch gap-2">
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    className={`input input-bordered flex-1 ${errors.quantity ? "input-error" : ""}`}
                                    min={1}
                                    step={1}
                                    {...register("quantity", {
                                        valueAsNumber: true,
                                        required: "La quantité est requise",
                                        min: {
                                            value: 1,
                                            message: "La quantité doit être > 0",
                                        },
                                    })}
                                />
                                <div className="join md:hidden">
                                    <button
                                        type="button"
                                        className="btn join-item"
                                        onClick={() => bumpQuantity(-1)}
                                        aria-label="Diminuer la quantité"
                                    >
                                        -
                                    </button>
                                    <button
                                        type="button"
                                        className="btn join-item"
                                        onClick={() => bumpQuantity(1)}
                                        aria-label="Augmenter la quantité"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                            {errors.quantity ? (
                                <p className="text-sm text-error mt-1">
                                    {String(errors.quantity.message)}
                                </p>
                            ) : null}
                        </div>

                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Prix</span>
                            </label>
                            <div className="flex items-stretch gap-2">
                                <input
                                    type="number"
                                    className={`input input-bordered flex-1 ${errors.price ? "input-error" : ""}`}
                                    min={0}
                                    step={0.01}
                                    placeholder={
                                        typeof productDefaultPrice === "number"
                                            ? String(productDefaultPrice)
                                            : ""
                                    }
                                    {...register("price", {
                                        valueAsNumber: true,
                                        min: {
                                            value: 0,
                                            message: "Le prix doit être ≥ 0",
                                        },
                                    })}
                                />
                                <div className="join md:hidden">
                                    <button
                                        type="button"
                                        className="btn join-item"
                                        onClick={() => bumpPrice(-0.1)}
                                        aria-label="Diminuer le prix"
                                    >
                                        -
                                    </button>
                                    <button
                                        type="button"
                                        className="btn join-item"
                                        onClick={() => bumpPrice(0.1)}
                                        aria-label="Augmenter le prix"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                            {errors.price ? (
                                <p className="text-sm text-error mt-1">
                                    {String(errors.price.message)}
                                </p>
                            ) : null}
                        </div>
                        <div className="form-control mt-3">
                            <label className="label cursor-pointer justify-start gap-3">
                                <input
                                    type="checkbox"
                                    className="checkbox"
                                    {...register("inPromotion")}
                                />
                                <span className="label-text">Article en promotion ?</span>
                            </label>
                        </div>
                        <div className="form-control mt-3">
                            <label className="label cursor-pointer justify-start gap-3">
                                <input
                                    type="checkbox"
                                    className="checkbox"
                                    {...register("needCoupons")}
                                />
                                <span className="label-text">
                                    Article nécessite un coupon ?
                                </span>
                            </label>
                        </div>
                    </div>
                </section>

                {submitError ? (
                    <div className="alert alert-error">
                        <span>{submitError}</span>
                    </div>
                ) : null}

                <div className="flex items-center justify-end gap-3">
                    {isSubmitting ? (
                        <span className="loading loading-spinner loading-sm" />
                    ) : null}
                    <button type="button" className="btn w-1/2" onClick={closeDialog}>
                        Fermer
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary w-1/2"
                        disabled={isSubmitting || !shoppingList?.id}
                    >
                        Ajouter
                    </button>
                </div>
            </form>
        </div>
    );
}
