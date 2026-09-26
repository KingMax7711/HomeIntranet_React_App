import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { apiClient } from "~/api/apiClient";
import { smartNameSearch } from "~/tools/catalogSearch";
import { capitalizeAllWords, capitalizeFirstLetter } from "~/tools/formater";
import type { FridgeRecap } from "~/types/fridges";

type ProductLite = {
    id: number;
    name: string;
    default_price?: number | null;
    comment?: string | null;
    category?: string | null;
};

type FormValues = {
    productQuery: string;
    fridgeId: number;
    quantity: number;
    expirationDate: string;
    comment: string;
};

type Props = {
    fridges: FridgeRecap[];
    onCreated?: (fridgeId: number) => void | Promise<void>;
    onCloseRequested?: () => void;
};

const safeTrim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const endpointAllProducts = "/shopping_list_globals/all_products_lite";
const endpointCreateFridgeItem = "/fridge_items/create";

const getDefaultFridgeId = (fridges: FridgeRecap[]) => {
    const mainFridge = fridges.find((fridge) => fridge.fridge_main);
    if (mainFridge) return mainFridge.fridge_id;
    return fridges[0]?.fridge_id ?? 0;
};

export default function FormAddFridgeItem({
    fridges,
    onCreated,
    onCloseRequested,
}: Props) {
    const [products, setProducts] = useState<ProductLite[]>([]);
    const [productMenuOpen, setProductMenuOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<ProductLite | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement | null>(null);

    const defaultValues = useMemo<FormValues>(() => {
        return {
            productQuery: "",
            fridgeId: getDefaultFridgeId(fridges),
            quantity: 1,
            expirationDate: "",
            comment: "",
        };
    }, [fridges]);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        getValues,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        mode: "onBlur",
        shouldUnregister: true,
        defaultValues,
    });

    useEffect(() => {
        reset(defaultValues);
        setSelectedProduct(null);
        setProductMenuOpen(false);
        setSubmitError(null);
    }, [defaultValues, reset]);

    useEffect(() => {
        const controller = new AbortController();

        (async () => {
            try {
                const response = await apiClient.get<ProductLite[]>(endpointAllProducts, {
                    signal: controller.signal,
                });

                setProducts(Array.isArray(response.data) ? response.data : []);
            } catch (error) {
                if (axios.isAxiosError(error) && error.code === "ERR_CANCELED") return;
                console.error("Failed to fetch fridge product catalog", error);
            }
        })();

        return () => controller.abort();
    }, []);

    const closeDialog = () => {
        if (onCloseRequested) {
            onCloseRequested();
            return;
        }

        const dialog = formRef.current?.closest("dialog") as HTMLDialogElement | null;
        dialog?.close();
    };

    const resetAndClose = () => {
        reset(defaultValues);
        setSelectedProduct(null);
        setProductMenuOpen(false);
        setSubmitError(null);
        closeDialog();
    };

    const productQuery = watch("productQuery");

    const filteredProducts = useMemo(() => {
        return smartNameSearch(products, productQuery ?? "", {
            limit: 10,
            minScore: 0.32,
        });
    }, [products, productQuery]);

    const bumpQuantity = (delta: number) => {
        const current = getValues("quantity");
        const safeCurrent =
            typeof current === "number" && !Number.isNaN(current) ? current : 1;
        const next = Math.max(1, Math.trunc(safeCurrent + delta));
        setValue("quantity", next, { shouldDirty: true, shouldValidate: true });
    };

    const onSubmit = handleSubmit(async (values) => {
        setSubmitError(null);

        if (fridges.length === 0) {
            setSubmitError("Aucun frigo disponible. Crée d'abord un frigo.");
            return;
        }

        const productName = safeTrim(values.productQuery);
        if (!productName) {
            setSubmitError("Choisis ou saisis un produit.");
            return;
        }

        const fridgeId = Number(values.fridgeId);
        if (!Number.isFinite(fridgeId) || fridgeId <= 0) {
            setSubmitError("Veuillez sélectionner un frigo valide.");
            return;
        }

        const expirationTrim = safeTrim(values.expirationDate);
        if (expirationTrim && !/^\d{4}-\d{2}-\d{2}$/.test(expirationTrim)) {
            setSubmitError("La date de péremption doit être au format AAAA-MM-JJ.");
            return;
        }

        const productPayload = selectedProduct
            ? selectedProduct.id
            : {
                  name: productName,
                  fridge_product: true,
              };

        const payload: Record<string, unknown> = {
            product: productPayload,
            fridge_id: fridgeId,
            quantity: values.quantity,
            source: "manual",
            comment: safeTrim(values.comment) || null,
        };

        if (expirationTrim) {
            payload.expiration_date = expirationTrim;
        }

        try {
            await apiClient.post(endpointCreateFridgeItem, payload);
            await onCreated?.(fridgeId);
            reset(defaultValues);
            setSelectedProduct(null);
            setProductMenuOpen(false);
            closeDialog();
        } catch (error) {
            const detail = axios.isAxiosError(error)
                ? (error.response?.data as any)?.detail
                : undefined;
            setSubmitError(
                typeof detail === "string" && detail.trim()
                    ? detail
                    : "Impossible d'ajouter l'article au frigo.",
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
                Ajout d'un article au frigo
            </h2>

            <form
                ref={formRef}
                onSubmit={onSubmit}
                className="flex flex-col gap-4"
                onKeyDown={(event) => {
                    if (event.key === "Escape") {
                        setProductMenuOpen(false);
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
                                placeholder="Ex: Lait demi-écrémé"
                                autoComplete="off"
                                {...register("productQuery", {
                                    required: "Le produit est requis",
                                    validate: (value) =>
                                        safeTrim(value).length > 0 ||
                                        "Le produit est requis",
                                })}
                                onFocus={() => {
                                    if (safeTrim(productQuery)) setProductMenuOpen(true);
                                }}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    setValue("productQuery", value, {
                                        shouldValidate: true,
                                    });
                                    setProductMenuOpen(true);

                                    if (
                                        selectedProduct &&
                                        safeTrim(value).toLowerCase() !==
                                            safeTrim(selectedProduct.name).toLowerCase()
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
                                        onMouseDown={(event) => event.preventDefault()}
                                    >
                                        {filteredProducts.length === 0 ? (
                                            <li>
                                                <span className="text-sm opacity-70">
                                                    Aucun résultat proche
                                                </span>
                                            </li>
                                        ) : (
                                            filteredProducts.map((product) => (
                                                <li key={product.id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedProduct(product);
                                                            setValue(
                                                                "productQuery",
                                                                product.name,
                                                                {
                                                                    shouldValidate: true,
                                                                },
                                                            );
                                                            setProductMenuOpen(false);
                                                        }}
                                                    >
                                                        <span className="font-medium">
                                                            {product.name}
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

                        {selectedProduct ? (
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className="text-xs opacity-60">Catégorie</div>
                                    <div className="font-medium">
                                        {capitalizeFirstLetter(
                                            safeTrim(selectedProduct.category),
                                        ) || "-"}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs opacity-60">Commentaire</div>
                                    <div className="font-medium opacity-80">
                                        {safeTrim(selectedProduct.comment) || "-"}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="mt-3 text-sm opacity-80">
                                Le produit sera créé automatiquement dans le catalogue et
                                ajouté au frigo.
                            </p>
                        )}
                    </div>
                </section>

                <section className="bg-base-200 rounded-box p-3 sm:p-4">
                    <h4 className="font-semibold">Détails de l'article</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <div className="form-control md:col-span-2">
                            <label className="label">
                                <span className="label-text">Frigo cible</span>
                            </label>
                            <select
                                className={`select select-bordered w-full ${errors.fridgeId ? "select-error" : ""}`}
                                {...register("fridgeId", {
                                    valueAsNumber: true,
                                    required: "Le frigo est requis",
                                    min: {
                                        value: 1,
                                        message: "Sélectionne un frigo valide",
                                    },
                                })}
                            >
                                {fridges.map((fridge) => (
                                    <option
                                        key={fridge.fridge_id}
                                        value={fridge.fridge_id}
                                    >
                                        {fridge.fridge_name}
                                        {fridge.fridge_main ? " (principal)" : ""}
                                    </option>
                                ))}
                            </select>
                            {errors.fridgeId ? (
                                <p className="text-sm text-error mt-1">
                                    {String(errors.fridgeId.message)}
                                </p>
                            ) : null}
                        </div>

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
                                <div className="join">
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
                                <span className="label-text">Date de péremption</span>
                            </label>
                            <input
                                type="date"
                                className={`input input-bordered ${errors.expirationDate ? "input-error" : ""}`}
                                {...register("expirationDate", {
                                    validate: (value) => {
                                        if (!value) return true;
                                        return /^\d{4}-\d{2}-\d{2}$/.test(value)
                                            ? true
                                            : "Format attendu : AAAA-MM-JJ";
                                    },
                                })}
                            />
                            {errors.expirationDate ? (
                                <p className="text-sm text-error mt-1">
                                    {String(errors.expirationDate.message)}
                                </p>
                            ) : null}
                        </div>

                        <div className="form-control md:col-span-2">
                            <label className="label">
                                <span className="label-text">Commentaire</span>
                            </label>
                            <textarea
                                className="textarea textarea-bordered min-h-24"
                                placeholder="Ajouter un commentaire..."
                                {...register("comment")}
                            />
                            <p className="text-xs opacity-70 mt-1">
                                Source enregistrée automatiquement: manual.
                            </p>
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
                    <button type="button" className="btn w-1/2" onClick={resetAndClose}>
                        Fermer
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary w-1/2"
                        disabled={isSubmitting || fridges.length === 0}
                    >
                        Ajouter
                    </button>
                </div>
            </form>
        </div>
    );
}
