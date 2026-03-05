import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { apiClient } from "~/api/apiClient";
import type { MallBase } from "~/types/mall";
import { capitalizeAllWords, capitalizeFirstLetter } from "~/tools/formater";

type Props = {
    mall: MallBase | null;
    onDone?: () => void | Promise<void>;
};

type FormValues = {
    name: string;
    location: string;
};

const safeTrim = (s: unknown) => (typeof s === "string" ? s.trim() : "");

export default function FormEditMall({ mall, onDone }: Props) {
    const [submitError, setSubmitError] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement | null>(null);

    const defaultValues = useMemo<FormValues>(() => {
        return {
            name: mall?.name ?? "",
            location: (mall?.location ?? "") as string,
        };
    }, [mall]);

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

    const onSubmit = handleSubmit(async (values) => {
        setSubmitError(null);
        if (!mall?.id) return;

        const name = safeTrim(values.name);
        if (!name) {
            setSubmitError("Le nom du magasin est requis.");
            return;
        }

        const location = safeTrim(values.location);

        const payload: Record<string, unknown> = {
            name,
            location: location ? location : null,
        };

        try {
            await apiClient.put(`/malls/update/${mall.id}`, payload);
            await onDone?.();
            closeDialog();
        } catch (e) {
            const detail = axios.isAxiosError(e)
                ? (e.response?.data as any)?.detail
                : undefined;
            setSubmitError(
                typeof detail === "string" && detail.trim()
                    ? detail
                    : "Impossible de mettre à jour le magasin.",
            );
        }
    });

    if (!mall) return null;

    return (
        <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4 mt-3">
            <div className="bg-base-200 rounded-box p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="text-lg font-semibold truncate">
                            {capitalizeAllWords(
                                capitalizeFirstLetter(mall.name ?? "Magasin"),
                            )}
                        </div>
                        <div className="text-sm opacity-70 truncate">
                            <span className="badge badge-ghost badge-outline badge-sm opacity-70">
                                #{mall.id}
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
                            <span className="label-text">Localisation</span>
                        </label>
                        <input
                            type="text"
                            className="input input-bordered"
                            placeholder="Optionnel"
                            {...register("location", {
                                setValueAs: (v) => safeTrim(v),
                            })}
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
