import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { apiClient } from "~/api/apiClient";
import type { ProductCatalogItem } from "~/components/shopping_components/ProductCard";
import { capitalizeAllWords, capitalizeFirstLetter } from "~/tools/formater";

type Props = {
    product: ProductCatalogItem | null;
    categories: CategoryLite[];
    onDone?: () => void | Promise<void>;
};

type CategoryLite = {
    id: number;
    name: string;
};

type FormValues = {
    name: string;
    categoryName: string;
    defaultPrice?: number;
    comment: string;
};

const normalize = (s: string) =>
    s
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
const safeTrim = (s: unknown) => (typeof s === "string" ? s.trim() : "");

const endpointUpdateProduct = "/shopping_list_globals/update_product_custom";

const categoryLabelFromProduct = (p: ProductCatalogItem | null): string => {
    if (!p) return "";
    if (typeof p.category === "string" && p.category.trim()) return p.category.trim();
    const anyP = p as any;
    const c = anyP?.category_id;
    if (c && typeof c === "object") {
        const n = (c as any)?.name;
        if (typeof n === "string" && n.trim()) return n.trim();
    }
    return "";
};

export default function FormEditProduit({ product, categories, onDone }: Props) {
    const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const formRef = useRef<HTMLFormElement | null>(null);

    const defaultValues = useMemo<FormValues>(() => {
        return {
            name: product?.name ?? "",
            categoryName: categoryLabelFromProduct(product),
            defaultPrice:
                typeof (product as any)?.default_price === "number" &&
                Number.isFinite((product as any)?.default_price)
                    ? ((product as any).default_price as number)
                    : undefined,
            comment: (product?.comment ?? "") as string,
        };
    }, [product]);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<FormValues>({
        mode: "onBlur",
        defaultValues,
    });

    useEffect(() => {
        reset(defaultValues);
        setSubmitError(null);
        setCategoryMenuOpen(false);
    }, [defaultValues, reset]);

    const closeDialog = () => {
        const dlg = formRef.current?.closest("dialog") as HTMLDialogElement | null;
        dlg?.close();
    };

    const categoryName = watch("categoryName");
    const filteredCategories = useMemo(() => {
        const q = normalize(categoryName ?? "");
        if (!q) return [];
        const list = categories.filter((c) => normalize(c.name).includes(q));
        list.sort((a, b) => a.name.localeCompare(b.name));
        return list.slice(0, 8);
    }, [categories, categoryName]);

    const onSubmit = handleSubmit(async (values) => {
        setSubmitError(null);
        if (!product?.id) return;

        const name = safeTrim(values.name);
        if (!name) {
            setSubmitError("Le nom du produit est requis.");
            return;
        }

        const categoryTrim = safeTrim(values.categoryName);
        const resolvedCategory = categoryTrim
            ? categories.find((c) => normalize(c.name) === normalize(categoryTrim))
            : null;
        const categoryPayload = categoryTrim
            ? resolvedCategory
                ? resolvedCategory.id
                : { name: categoryTrim }
            : null;

        const payload: Record<string, unknown> = {
            id: product.id,
            name,
            category_id: categoryPayload,
            comment: safeTrim(values.comment),
        };
        if (
            typeof values.defaultPrice === "number" &&
            !Number.isNaN(values.defaultPrice)
        ) {
            payload.default_price = values.defaultPrice;
        } else {
            payload.default_price = null;
        }

        try {
            await apiClient.post(endpointUpdateProduct, payload);
            await onDone?.();
            closeDialog();
        } catch (e) {
            const detail = axios.isAxiosError(e)
                ? (e.response?.data as any)?.detail
                : undefined;
            setSubmitError(
                typeof detail === "string" && detail.trim()
                    ? detail
                    : "Impossible de mettre à jour le produit.",
            );
        }
    });

    if (!product) return null;

    return (
        <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4 mt-3">
            <div className="bg-base-200 rounded-box p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-lg font-semibold truncate">
                            {capitalizeFirstLetter(product.name ?? "Produit")}
                        </div>
                        <div className="text-sm opacity-70 truncate">
                            <span className="badge badge-ghost badge-outline badge-sm opacity-70">
                                #{product.id}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-base-200 rounded-box p-3 sm:p-4">
                <h4 className="font-semibold">Modification</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Nom</span>
                        </label>
                        <input
                            type="text"
                            className={`input input-bordered ${errors.name ? "input-error" : ""}`}
                            {...register("name", {
                                required: "Le nom est requis",
                                setValueAs: (v) => safeTrim(v),
                                minLength: {
                                    value: 2,
                                    message: "Le nom doit faire au moins 2 caractères",
                                },
                            })}
                        />
                        {errors.name ? (
                            <p className="text-sm text-error mt-1">
                                {String(errors.name.message)}
                            </p>
                        ) : null}
                    </div>

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Catégorie</span>
                        </label>
                        <input
                            type="text"
                            className="input input-bordered"
                            autoComplete="off"
                            {...register("categoryName")}
                            onFocus={() => setCategoryMenuOpen(true)}
                            onBlur={() => {
                                setTimeout(() => setCategoryMenuOpen(false), 120);
                            }}
                        />

                        {categoryMenuOpen && filteredCategories.length > 0 ? (
                            <div className="menu bg-base-100 rounded-box shadow mt-2 p-2 absolute z-20 w-2/5">
                                {filteredCategories.map((c) => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        className="btn btn-ghost btn-sm justify-start"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            setValue(
                                                "categoryName",
                                                capitalizeAllWords(c.name),
                                                { shouldDirty: true },
                                            );
                                            setCategoryMenuOpen(false);
                                        }}
                                    >
                                        {capitalizeFirstLetter(c.name)}
                                    </button>
                                ))}
                            </div>
                        ) : null}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Prix par défaut</span>
                        </label>
                        <input
                            type="number"
                            min={0}
                            step="0.01"
                            className={`input input-bordered ${errors.defaultPrice ? "input-error" : ""}`}
                            placeholder="Optionnel"
                            {...register("defaultPrice", {
                                valueAsNumber: true,
                                min: {
                                    value: 0,
                                    message: "Le prix doit être ≥ 0",
                                },
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
                        </label>
                        <textarea
                            className="textarea textarea-bordered min-h-24"
                            placeholder="Optionnel"
                            {...register("comment")}
                        />
                    </div>
                </div>
            </div>

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
                    disabled={isSubmitting || !isDirty}
                >
                    Enregistrer
                </button>
            </div>
        </form>
    );
}
