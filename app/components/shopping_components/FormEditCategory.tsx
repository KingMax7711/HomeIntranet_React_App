import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { CategoryBase } from "~/types/category";
import { capitalizeAllWords, capitalizeFirstLetter } from "~/tools/formater";

type FormValues = {
    name: string;
};

const safeTrim = (s: unknown) => (typeof s === "string" ? s.trim() : "");

export default function FormEditCategory({
    category,
    onSubmit,
}: {
    category: CategoryBase | null;
    onSubmit: (categoryId: number, payload: { name: string }) => Promise<void>;
}) {
    const [submitError, setSubmitError] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement | null>(null);

    const defaultValues = useMemo<FormValues>(() => {
        return {
            name: category?.name ?? "",
        };
    }, [category]);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<FormValues>({
        mode: "onBlur",
        defaultValues,
    });

    useEffect(() => {
        reset(defaultValues);
        setSubmitError(null);
    }, [defaultValues, reset]);

    const closeDialog = () => {
        const dlg = formRef.current?.closest("dialog") as HTMLDialogElement | null;
        dlg?.close();
    };

    const submit = handleSubmit(async (values) => {
        setSubmitError(null);
        if (!category?.id) return;

        const name = safeTrim(values.name);
        if (!name) {
            setSubmitError("Le nom de la catégorie est requis.");
            return;
        }

        try {
            await onSubmit(category.id, { name });
            closeDialog();
        } catch (e: any) {
            const detail = e?.response?.data?.detail;
            setSubmitError(
                typeof detail === "string" && detail.trim()
                    ? detail
                    : "Impossible de mettre à jour la catégorie.",
            );
        }
    });

    if (!category) return null;

    return (
        <form ref={formRef} onSubmit={submit} className="flex flex-col gap-4 mt-3">
            <div className="bg-base-200 rounded-box p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-lg font-semibold truncate">
                            {capitalizeAllWords(
                                capitalizeFirstLetter(
                                    category.name?.trim() || "Catégorie",
                                ),
                            )}
                        </div>
                        <div className="text-sm opacity-70 truncate">
                            <span className="badge badge-ghost badge-outline badge-sm opacity-70">
                                #{category.id}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-base-200 rounded-box p-3 sm:p-4">
                <h4 className="font-semibold">Modification</h4>

                <div className="grid grid-cols-1 gap-1 mt-3">
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
