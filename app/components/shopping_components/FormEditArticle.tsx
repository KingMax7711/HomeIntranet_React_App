import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { apiClient } from "~/api/apiClient";
import type { ShoppingListItemDetailed } from "~/stores/shopping_list";
import { useShoppingListStore } from "~/stores/shopping_list";
import { capitalizeAllWords, capitalizeFirstLetter } from "~/tools/formater";

type Props = {
    item: ShoppingListItemDetailed | null;
};

type FormValues = {
    quantity: number;
    price: number;
    inPromotion: boolean;
};

const endpointCustomUpdate = (id: number) => `/shopping_list_items/custom_update/${id}`;

export default function FormEditArticle({ item }: Props) {
    const forceSync = useShoppingListStore((s) => s.forceSync);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const formRef = useRef<HTMLFormElement | null>(null);

    const defaultValues = useMemo<FormValues>(() => {
        return {
            quantity: item?.quantity ?? 1,
            price:
                typeof item?.price === "number" && !Number.isNaN(item.price)
                    ? item.price
                    : 0,
            inPromotion: !!item?.in_promotion,
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

    const bumpQuantity = (delta: number) => {
        const current = getValues("quantity");
        const safeCurrent =
            typeof current === "number" && !Number.isNaN(current) ? current : 1;
        const next = Math.max(1, Math.trunc(safeCurrent + delta));
        setValue("quantity", next, { shouldDirty: true, shouldValidate: true });
    };

    const bumpPrice = (delta: number) => {
        const current = getValues("price");
        const safeCurrent =
            typeof current === "number" && !Number.isNaN(current) ? current : 0;
        const nextRaw = safeCurrent + delta;
        const nextRounded = Math.round(nextRaw * 10) / 10;
        const next = Math.max(0, nextRounded);
        setValue("price", next, { shouldDirty: true, shouldValidate: true });
    };

    useEffect(() => {
        reset(defaultValues);
        setSubmitError(null);
    }, [defaultValues, reset]);

    const closeDialog = () => {
        const dlg = formRef.current?.closest("dialog") as HTMLDialogElement | null;
        dlg?.close();
    };

    const onSubmit = handleSubmit(async (values) => {
        setSubmitError(null);
        if (!item?.id) return;

        const payload = {
            quantity: values.quantity,
            price: values.price,
            in_promotion: !!values.inPromotion,
        };

        try {
            await apiClient.post(endpointCustomUpdate(item.id), payload);
            await forceSync();
            closeDialog();
        } catch (e) {
            const detail = axios.isAxiosError(e)
                ? (e.response?.data as any)?.detail
                : undefined;
            setSubmitError(
                typeof detail === "string" && detail.trim()
                    ? detail
                    : "Impossible de mettre à jour l’article.",
            );
        }
    });

    if (!item) return null;

    const productName = capitalizeAllWords(item.product?.name ?? "Produit");
    const category = capitalizeFirstLetter(item.product?.category ?? "") || "—";
    const comment = (item.product?.comment ?? "").trim();

    return (
        <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4 mt-3">
            <div className="bg-base-200 rounded-box p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-lg font-semibold truncate">
                            {productName}
                        </div>
                        <div className="text-sm opacity-70 truncate">{category}</div>
                    </div>
                </div>
                {comment ? (
                    <div className="mt-3 text-sm opacity-80 whitespace-pre-wrap italic">
                        {comment}
                    </div>
                ) : null}
            </div>

            <div className="bg-base-200 rounded-box p-3 sm:p-4">
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
                                inputMode="decimal"
                                className={`input input-bordered flex-1 ${errors.price ? "input-error" : ""}`}
                                min={0}
                                step={0.1}
                                {...register("price", {
                                    valueAsNumber: true,
                                    required: "Le prix est requis",
                                    min: { value: 0, message: "Le prix doit être ≥ 0" },
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
