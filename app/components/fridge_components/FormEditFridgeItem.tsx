import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { FridgeItemLite } from "~/types/fridges";
import { formatDate, capitalizeAllWords } from "~/tools/formater";

type FormValues = {
    quantity: number;
    expirationDate: string;
    comment: string;
};

type Props = {
    item: FridgeItemLite | null;
    onSubmit: (values: FormValues) => Promise<void>;
};

const toDateInputValue = (value: string | null) => {
    if (!value) return "";
    const trimmed = value.trim();
    if (!trimmed) return "";
    return trimmed.slice(0, 10);
};

export default function FormEditFridgeItem({ item, onSubmit }: Props) {
    const [submitError, setSubmitError] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement | null>(null);

    const defaultValues = useMemo<FormValues>(() => {
        return {
            quantity: item?.quantity ?? 1,
            expirationDate: toDateInputValue(item?.expiration_date ?? null),
            comment: item?.comment ?? "",
        };
    }, [item]);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        getValues,
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

    const bumpQuantity = (delta: number) => {
        const current = getValues("quantity");
        const safeCurrent =
            typeof current === "number" && !Number.isNaN(current) ? current : 1;
        const next = Math.max(0, Math.trunc(safeCurrent + delta));
        setValue("quantity", next, { shouldDirty: true, shouldValidate: true });
    };

    const onFormSubmit = handleSubmit(async (values) => {
        setSubmitError(null);

        try {
            await onSubmit({
                quantity: values.quantity,
                expirationDate: values.expirationDate,
                comment: values.comment,
            });
            closeDialog();
        } catch (error) {
            const message =
                error instanceof Error && error.message.trim()
                    ? error.message
                    : "Impossible de modifier l'article du frigo.";
            setSubmitError(message);
        }
    });

    if (!item) return null;

    const productName = capitalizeAllWords(item.product_name?.trim() || "Produit");
    const addedDateLabel = item.added_at ? formatDate(item.added_at) : "Date inconnue";
    const expirationLabel = item.expiration_date
        ? formatDate(item.expiration_date)
        : "Aucune date de péremption";

    return (
        <form ref={formRef} onSubmit={onFormSubmit} className="flex flex-col gap-4 mt-1">
            <div className="bg-base-200 border border-base-300 rounded-box p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-lg font-semibold truncate">
                            {productName}
                        </div>
                        <div className="text-sm opacity-70 truncate">
                            Ajouté le {addedDateLabel}
                        </div>
                    </div>
                </div>
                <div className="mt-3 text-sm opacity-80">
                    Péremption actuelle : {expirationLabel}
                </div>
            </div>

            <div className="bg-base-200 border border-base-300 rounded-box p-3 sm:p-4">
                <h4 className="font-semibold">Modification</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Quantité</span>
                        </label>
                        <div className="flex items-stretch gap-2">
                            <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                step={1}
                                className={`input input-bordered flex-1 ${errors.quantity ? "input-error" : ""}`}
                                {...register("quantity", {
                                    valueAsNumber: true,
                                    required: "La quantité est requise",
                                    min: {
                                        value: 0,
                                        message: "La quantité doit être ≥ 0",
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

                    <div className="form-control">
                        <label className="label">
                            <span className="label-text">Commentaire</span>
                        </label>
                        <textarea
                            className={`textarea textarea-bordered min-h-28 ${errors.comment ? "textarea-error" : ""}`}
                            placeholder="Ajouter un commentaire..."
                            {...register("comment", {
                                setValueAs: (value) =>
                                    typeof value === "string" && value.trim().length > 0
                                        ? value.trim()
                                        : "",
                            })}
                        />
                        {errors.comment ? (
                            <p className="text-sm text-error mt-1">
                                {String(errors.comment.message)}
                            </p>
                        ) : null}
                    </div>
                </div>
            </div>

            {submitError ? (
                <div className="alert alert-error alert-soft">
                    <span>{submitError}</span>
                </div>
            ) : null}

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
                {isSubmitting ? (
                    <span className="loading loading-spinner loading-sm" />
                ) : null}
                <button
                    type="button"
                    className="btn btn-ghost w-full sm:w-auto"
                    onClick={closeDialog}
                >
                    Annuler
                </button>
                <button
                    type="submit"
                    className="btn btn-primary w-full sm:w-auto"
                    disabled={isSubmitting || !isDirty}
                >
                    Enregistrer
                </button>
            </div>
        </form>
    );
}
