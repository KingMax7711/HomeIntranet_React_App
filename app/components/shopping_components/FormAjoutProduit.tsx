import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { apiClient } from "~/api/apiClient";
import { capitalizeAllWords, capitalizeFirstLetter } from "~/tools/formater";

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

const normalize = (s: string) => s.trim().toLowerCase();
const safeTrim = (s: unknown) => (typeof s === "string" ? s.trim() : "");

const endpointAllCategories = "/shopping_list_globals/all_categories";
const endpointCreateProduct = "/shopping_list_globals/create_product_custom";

export default function FormAjoutProduit({
    onDone,
}: {
    onDone?: () => void | Promise<void>;
}) {
    const [categories, setCategories] = useState<CategoryLite[]>([]);
    const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const formRef = useRef<HTMLFormElement | null>(null);

    const defaultValues: FormValues = {
        name: "",
        categoryName: "",
        defaultPrice: undefined,
        comment: "",
    };

    useEffect(() => {
        const controller = new AbortController();

        (async () => {
            try {
                const r = await apiClient.get<CategoryLite[]>(endpointAllCategories, {
                    signal: controller.signal,
                });
                setCategories(Array.isArray(r.data) ? r.data : []);
            } catch (e) {
                if (axios.isAxiosError(e) && e.code === "ERR_CANCELED") return;
                console.error("Error fetching categories", e);
            }
        })();

        return () => controller.abort();
    }, []);

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
            setCategoryMenuOpen(false);
            setSubmitError(null);
        };

        dlg.addEventListener("close", onClose);
        return () => dlg.removeEventListener("close", onClose);
    }, [reset]);

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

        const name = safeTrim(values.name);
        if (!name) {
            setSubmitError("Le nom du produit est requis.");
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

        const payload: Record<string, unknown> = {
            name,
            category_id: categoryPayload,
            comment: safeTrim(values.comment),
        };
        if (
            typeof values.defaultPrice === "number" &&
            !Number.isNaN(values.defaultPrice)
        ) {
            payload.default_price = values.defaultPrice;
        }

        try {
            await apiClient.post(endpointCreateProduct, payload);
            await onDone?.();
            reset(defaultValues);
            setCategoryMenuOpen(false);
            closeDialog();
        } catch (e) {
            const detail = axios.isAxiosError(e)
                ? (e.response?.data as any)?.detail
                : undefined;
            setSubmitError(
                typeof detail === "string" && detail.trim()
                    ? detail
                    : "Impossible d’ajouter le produit.",
            );
        }
    });

    return (
        <div className="px-2">
            <h2 className="text-xl font-bold text-center pb-3 sm:pb-4">
                Ajout d’un produit
            </h2>

            <form
                ref={formRef}
                onSubmit={onSubmit}
                className="flex flex-col gap-4"
                onKeyDown={(e) => {
                    if (e.key === "Escape") {
                        setCategoryMenuOpen(false);
                    }
                }}
            >
                <section className="bg-base-200 rounded-box p-3 sm:p-4">
                    <h4 className="font-semibold">Informations</h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text">Nom</span>
                            </label>
                            <input
                                type="text"
                                autoComplete="off"
                                className={`input input-bordered ${errors.name ? "input-error" : ""}`}
                                placeholder="Ex: pâtes"
                                {...register("name", {
                                    required: "Le nom est requis",
                                    setValueAs: (v) => safeTrim(v),
                                    minLength: {
                                        value: 2,
                                        message:
                                            "Le nom doit faire au moins 2 caractères",
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
                                placeholder="Ex: épicerie"
                                autoComplete="off"
                                {...register("categoryName")}
                                onFocus={() => setCategoryMenuOpen(true)}
                                onBlur={() => {
                                    // Laisser le click sur les suggestions
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
                                className="textarea textarea-bordered min-h-24 "
                                placeholder="Optionnel"
                                {...register("comment")}
                            />
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
                        disabled={isSubmitting}
                    >
                        Ajouter
                    </button>
                </div>
            </form>
        </div>
    );
}
