import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

type FormValues = {
    name: string;
};

const safeTrim = (s: unknown) => (typeof s === "string" ? s.trim() : "");

export default function FormAjoutCategory({
    onSubmit,
}: {
    onSubmit: (payload: { name: string }) => Promise<void>;
}) {
    const [submitError, setSubmitError] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement | null>(null);

    const defaultValues: FormValues = {
        name: "",
    };

    const {
        register,
        handleSubmit,
        reset,
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
            setSubmitError(null);
        };

        dlg.addEventListener("close", onClose);
        return () => dlg.removeEventListener("close", onClose);
    }, [reset]);

    const closeDialog = () => {
        const dlg = formRef.current?.closest("dialog") as HTMLDialogElement | null;
        dlg?.close();
    };

    const submit = handleSubmit(async (values) => {
        setSubmitError(null);
        const name = safeTrim(values.name);

        if (!name) {
            setSubmitError("Le nom de la catégorie est requis.");
            return;
        }

        try {
            await onSubmit({ name });
            reset(defaultValues);
            closeDialog();
        } catch (e: any) {
            const detail = e?.response?.data?.detail;
            setSubmitError(
                typeof detail === "string" && detail.trim()
                    ? detail
                    : "Impossible d’ajouter la catégorie.",
            );
        }
    });

    return (
        <div className="px-2">
            <h2 className="text-xl font-bold text-center pb-3 sm:pb-4">
                Ajout d’une catégorie
            </h2>

            <form ref={formRef} onSubmit={submit} className="flex flex-col gap-4">
                <section className="bg-base-200 rounded-box p-3 sm:p-4">
                    <h4 className="font-semibold">Informations</h4>

                    <div className="grid grid-cols-1 gap-1 mt-3">
                        <label className="label">
                            <span className="label-text">Nom</span>
                        </label>
                        <input
                            type="text"
                            autoComplete="off"
                            className={`input input-bordered ${errors.name ? "input-error" : ""}`}
                            placeholder="Ex: Épicerie"
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
                        Enregistrer
                    </button>
                </div>
            </form>
        </div>
    );
}
