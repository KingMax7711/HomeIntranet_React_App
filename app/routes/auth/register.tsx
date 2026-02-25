import type { Route } from "./+types/register";
import { useForm } from "react-hook-form";
import clsx from "clsx";
import { Link } from "react-router";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Intranet - Inscription" },
        { name: "description", content: "Page d'inscription" },
    ];
}

type RegisterFormValues = {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    accepted_cgu: boolean;
    accepted_privacy: boolean;
};

export default function Register() {
    const {
        register,
        handleSubmit,
        setValue,
        getValues,
        formState: { errors, isSubmitting },
    } = useForm<RegisterFormValues>({
        defaultValues: {
            first_name: "",
            last_name: "",
            email: "",
            password: "",
            accepted_cgu: false,
            accepted_privacy: false,
        },
        mode: "onBlur",
    });

    const onSubmit = async (data: RegisterFormValues) => {
        console.log(data);
    };

    return (
        <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold">
                    Créer <span className="text-primary">votre compte</span>
                </h1>
                <p className="text-sm opacity-70">
                    Quelques informations, et c’est parti.
                </p>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="form-control w-full">
                        <label className="label" htmlFor="first_name">
                            <span className="label-text">Prénom</span>
                        </label>
                        <input
                            id="first_name"
                            type="text"
                            autoComplete="given-name"
                            className={clsx(
                                "input input-bordered w-full",
                                errors.first_name && "input-error",
                            )}
                            aria-invalid={errors.first_name ? "true" : "false"}
                            aria-describedby="first-name-error"
                            {...register("first_name", {
                                required: "Le prénom est requis.",
                                minLength: {
                                    value: 2,
                                    message:
                                        "Le prénom doit contenir au moins 2 caractères.",
                                },
                            })}
                        />
                        <label className="label">
                            <span
                                id="first-name-error"
                                className="label-text-alt text-error"
                            >
                                {errors.first_name?.message ?? "\u00A0"}
                            </span>
                        </label>
                    </div>

                    <div className="form-control w-full">
                        <label className="label" htmlFor="last_name">
                            <span className="label-text">Nom</span>
                        </label>
                        <input
                            id="last_name"
                            type="text"
                            autoComplete="family-name"
                            className={clsx(
                                "input input-bordered w-full",
                                errors.last_name && "input-error",
                            )}
                            aria-invalid={errors.last_name ? "true" : "false"}
                            aria-describedby="last-name-error"
                            {...register("last_name", {
                                required: "Le nom est requis.",
                                minLength: {
                                    value: 2,
                                    message:
                                        "Le nom doit contenir au moins 2 caractères.",
                                },
                            })}
                        />
                        <label className="label">
                            <span
                                id="last-name-error"
                                className="label-text-alt text-error"
                            >
                                {errors.last_name?.message ?? "\u00A0"}
                            </span>
                        </label>
                    </div>
                </div>

                <div className="form-control w-full">
                    <label className="label" htmlFor="email">
                        <span className="label-text">Email</span>
                    </label>
                    <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        inputMode="email"
                        className={clsx(
                            "input input-bordered w-full",
                            errors.email && "input-error",
                        )}
                        aria-invalid={errors.email ? "true" : "false"}
                        aria-describedby="email-error"
                        {...register("email", {
                            required: "L’email est requis.",
                            pattern: {
                                value: /^\S+@\S+\.\S+$/,
                                message: "Merci d’entrer un email valide.",
                            },
                        })}
                    />
                    <label className="label">
                        <span id="email-error" className="label-text-alt text-error">
                            {errors.email?.message ?? "\u00A0"}
                        </span>
                    </label>
                </div>

                <div className="form-control w-full">
                    <label className="label" htmlFor="password">
                        <span className="label-text">Mot de passe</span>
                    </label>
                    <input
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        className={clsx(
                            "input input-bordered w-full",
                            errors.password && "input-error",
                        )}
                        aria-invalid={errors.password ? "true" : "false"}
                        aria-describedby="password-error"
                        {...register("password", {
                            required: "Le mot de passe est requis.",
                            minLength: {
                                value: 6,
                                message:
                                    "Le mot de passe doit contenir au moins 6 caractères.",
                            },
                        })}
                    />
                    <label className="label">
                        <span id="password-error" className="label-text-alt text-error">
                            {errors.password?.message ?? "\u00A0"}
                        </span>
                    </label>
                </div>

                {/* Champs cachés pour que les deux variables existent dans le form */}
                <input type="hidden" {...register("accepted_privacy")} />

                <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-3">
                        <input
                            type="checkbox"
                            className={clsx(
                                "checkbox",
                                errors.accepted_cgu && "checkbox-error",
                            )}
                            aria-invalid={errors.accepted_cgu ? "true" : "false"}
                            aria-describedby="accept-all-error"
                            {...register("accepted_cgu", {
                                validate: () => {
                                    const acceptedCgu = getValues("accepted_cgu");
                                    const acceptedPrivacy = getValues("accepted_privacy");
                                    return (
                                        (acceptedCgu && acceptedPrivacy) ||
                                        "Vous devez accepter les CGU et la politique de confidentialité."
                                    );
                                },
                                onChange: (e) => {
                                    setValue("accepted_privacy", e.target.checked, {
                                        shouldValidate: true,
                                    });
                                },
                            })}
                        />
                        <span className="label-text">
                            J’accepte les CGU et la politique de confidentialité
                        </span>
                    </label>
                    <label className="label">
                        <span id="accept-all-error" className="label-text-alt text-error">
                            {errors.accepted_cgu?.message ?? "\u00A0"}
                        </span>
                    </label>
                </div>

                <button
                    type="submit"
                    className="btn btn-primary w-full"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Création…" : "Créer mon compte"}
                </button>
            </form>

            <div className="divider my-0" />

            <p className="text-sm text-center opacity-80">
                Déjà un compte ?{" "}
                <Link to="/login" className="link link-primary">
                    Se connecter
                </Link>
            </p>
        </div>
    );
}
