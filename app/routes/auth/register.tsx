import type { Route } from "./+types/register";
import { useForm } from "react-hook-form";
import clsx from "clsx";
import { Link, useNavigate } from "react-router";
import { useState } from "react";
import axios from "axios";
import { apiClient } from "../../api/apiClient";
import { Eye, EyeOff } from "lucide-react";

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
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

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
        try {
            const response = await apiClient.post("/auth/register", data, {
                skipAuth: true,
                skipAuthRefresh: true,
            });
            console.log("Register Response:", response);
            if (response.status === 200 || response.status === 201) {
                setErrorMessage(null);
                // Rediriger vers la page de connexion ou une autre page appropriée
                navigate("/login");
            } else {
                const error_api_message =
                    response.data?.detail ||
                    "Une erreur est survenue lors de l'inscription.";
                setErrorMessage(error_api_message);
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const data = error.response?.data as any;

                const detail = data?.detail;
                if (typeof detail === "string" && detail.trim().length > 0) {
                    setErrorMessage(detail);
                    return;
                }

                // FastAPI 422 typique: detail: [{ loc: [...], msg: "...", type: "..." }, ...]
                if (Array.isArray(detail)) {
                    const msg = detail
                        .map((d) => (typeof d?.msg === "string" ? d.msg : null))
                        .filter(Boolean)
                        .join(" ");
                    if (msg) {
                        setErrorMessage(msg);
                        return;
                    }
                }

                setErrorMessage(
                    status
                        ? `Requête refusée (HTTP ${status}).`
                        : "Erreur réseau ou serveur.",
                );
                return;
            }

            setErrorMessage("Erreur réseau ou serveur.");
        }
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
                    <div className="relative">
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            className={clsx(
                                "input input-bordered w-full pr-12",
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

                        <button
                            type="button"
                            className="btn btn-ghost btn-square btn-sm absolute right-2 top-1/2 -translate-y-1/2"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={
                                showPassword
                                    ? "Masquer le mot de passe"
                                    : "Afficher le mot de passe"
                            }
                        >
                            {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                            ) : (
                                <Eye className="h-5 w-5" />
                            )}
                        </button>
                    </div>
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
                                        "Bah alors ? Faut accepter les CGU et la politique de confidentialité !"
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
                        <span
                            id="accept-all-error"
                            className="label-text-alt text-error text-sm italic"
                        >
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
                {errorMessage && (
                    <p className="text-sm text-error text-center">{errorMessage}</p>
                )}
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
