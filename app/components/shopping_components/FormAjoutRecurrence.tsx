import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { capitalizeAllWords, capitalizeFirstLetter } from "~/tools/formater";

export type RecurrenceProductOption = {
    id: number;
    name: string;
    category?: string | null;
    comment?: string | null;
    default_price?: number | null;
};

type FormValues = {
    productQuery: string;
};

const normalize = (s: string) => s.trim().toLowerCase();
const safeTrim = (s: unknown) => (typeof s === "string" ? s.trim() : "");

export default function FormAjoutRecurrence({
    products,
    existingProductIds,
    onSubmit,
}: {
    products: RecurrenceProductOption[];
    existingProductIds: number[];
    onSubmit: (payload: { product_id: number }) => Promise<void>;
}) {
    const [selectedProduct, setSelectedProduct] =
        useState<RecurrenceProductOption | null>(null);
    const [productMenuOpen, setProductMenuOpen] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const formRef = useRef<HTMLFormElement | null>(null);

    const defaultValues: FormValues = {
        productQuery: "",
    };

    const availableProducts = useMemo(() => {
        const blockedIds = new Set(existingProductIds);
        return products.filter((product) => !blockedIds.has(product.id));
    }, [existingProductIds, products]);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        mode: "onBlur",
        shouldUnregister: true,
        defaultValues,
    });

    useEffect(() => {
        const dlg = formRef.current?.closest("dialog") as HTMLDialogElement | null;
        if (!dlg) return;

        const onClose = () => {
            reset(defaultValues);
            setSelectedProduct(null);
            setProductMenuOpen(false);
            setSubmitError(null);
        };

        dlg.addEventListener("close", onClose);
        return () => dlg.removeEventListener("close", onClose);
    }, [reset]);

    const closeDialog = () => {
        const dlg = formRef.current?.closest("dialog") as HTMLDialogElement | null;
        dlg?.close();
    };

    const productQuery = watch("productQuery");

    const filteredProducts = useMemo(() => {
        const q = normalize(productQuery ?? "");
        if (!q) return availableProducts.slice(0, 3);

        const list = availableProducts.filter((product) =>
            normalize(product.name).includes(q),
        );
        list.sort((a, b) => a.name.localeCompare(b.name));
        return list.slice(0, 3);
    }, [availableProducts, productQuery]);

    const submit = handleSubmit(async () => {
        setSubmitError(null);

        if (!selectedProduct) {
            setSubmitError("Sélectionne un produit existant.");
            return;
        }

        try {
            await onSubmit({ product_id: selectedProduct.id });
            reset(defaultValues);
            setSelectedProduct(null);
            setProductMenuOpen(false);
            closeDialog();
        } catch (e: any) {
            const detail = e?.response?.data?.detail;
            setSubmitError(
                typeof detail === "string" && detail.trim()
                    ? detail
                    : "Impossible d’ajouter la récurrence.",
            );
        }
    });

    return (
        <div className="px-2">
            <h2 className="text-xl font-bold text-center pb-3 sm:pb-4">
                Ajouter une récurrence
            </h2>

            <form
                ref={formRef}
                onSubmit={submit}
                className="flex flex-col gap-4"
                onKeyDown={(e) => {
                    if (e.key === "Escape") {
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
                                    setProductMenuOpen(false);
                                }}
                            >
                                Changer
                            </button>
                        ) : null}
                    </div>

                    <div className="form-control mt-3">
                        <label className="label">
                            <span className="label-text">Produit</span>
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
                                onFocus={() => setProductMenuOpen(true)}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setValue("productQuery", value, {
                                        shouldValidate: true,
                                    });
                                    setProductMenuOpen(true);
                                    if (
                                        selectedProduct &&
                                        normalize(value) !==
                                            normalize(selectedProduct.name)
                                    ) {
                                        setSelectedProduct(null);
                                    }
                                }}
                                onBlur={() => {
                                    setTimeout(() => setProductMenuOpen(false), 120);
                                }}
                            />

                            {productMenuOpen ? (
                                <div className="absolute z-30 mt-2 w-full">
                                    <ul
                                        className="menu bg-base-100 rounded-box shadow-xl border border-base-300 p-2"
                                        onMouseDown={(e) => e.preventDefault()}
                                    >
                                        {filteredProducts.length === 0 ? (
                                            <li>
                                                <div className="text-sm opacity-70 cursor-default">
                                                    Aucun produit disponible.
                                                </div>
                                            </li>
                                        ) : (
                                            filteredProducts.map((product) => (
                                                <li key={product.id}>
                                                    <button
                                                        type="button"
                                                        className="justify-start"
                                                        onClick={() => {
                                                            setSelectedProduct(product);
                                                            setValue(
                                                                "productQuery",
                                                                capitalizeAllWords(
                                                                    product.name,
                                                                ),
                                                                {
                                                                    shouldDirty: true,
                                                                    shouldValidate: true,
                                                                },
                                                            );
                                                            setProductMenuOpen(false);
                                                        }}
                                                    >
                                                        <div className="flex flex-col items-start">
                                                            <span className="font-medium">
                                                                {capitalizeFirstLetter(
                                                                    product.name,
                                                                )}
                                                            </span>
                                                            <span className="text-xs opacity-70">
                                                                {capitalizeFirstLetter(
                                                                    product.category?.trim() ||
                                                                        "Sans catégorie",
                                                                )}
                                                            </span>
                                                        </div>
                                                    </button>
                                                </li>
                                            ))
                                        )}
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
                                        : "Aucun produit sélectionné"}
                                </div>
                                <div className="text-sm opacity-70 truncate mt-1">
                                    {selectedProduct
                                        ? capitalizeFirstLetter(
                                              selectedProduct.category?.trim() ||
                                                  "Sans catégorie",
                                          )
                                        : "Choisis un produit existant dans le catalogue."}
                                </div>
                            </div>
                            <span
                                className={`badge badge-outline ${selectedProduct ? "badge-primary" : "badge-ghost opacity-70"}`}
                            >
                                {selectedProduct ? "Sélectionné" : "En attente"}
                            </span>
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
                        disabled={isSubmitting || !selectedProduct}
                    >
                        Ajouter
                    </button>
                </div>
            </form>
        </div>
    );
}
