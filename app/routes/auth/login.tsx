import type { Route } from "./+types/login";
import { useForm } from "react-hook-form";
import clsx from "clsx";
import { Link, useLocation, useNavigate } from "react-router";
import { apiClient } from "../../api/apiClient";
import { useState } from "react";
import axios from "axios";
import { initializeSessionFromToken } from "../../stores/auth";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Intranet - Connexion" },
        { name: "description", content: "Page de connexion" },
    ];
}

type LoginFormValues = {
    email: string;
    password: string;
};

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const unauthorized = useState(false);
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormValues>({
        defaultValues: {
            email: "",
            password: "",
        },
        mode: "onBlur",
    });

    const onSubmit = async (data: LoginFormValues) => {
        console.log(data);
        const params = new URLSearchParams();
        // FastAPI OAuth2PasswordRequestForm attend le champ "username" (même si c'est un email)
        params.append("username", data.email);
        params.append("password", data.password);
        try {
            const response = await apiClient.post("/auth/token", params, {
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                skipAuth: true,
                skipAuthRefresh: true,
            });
            console.log("Login Response:", response.data);
            const accessToken: string = response.data.access_token;

            await initializeSessionFromToken(accessToken);

            const from = (location.state as { from?: string } | null)?.from;
            navigate(from || "/", { replace: true });

            unauthorized[1](false);
        } catch (error) {
            console.error("Login Error:", error);
            if (axios.isAxiosError(error) && error.response?.status === 401) {
                unauthorized[1](true);
            } else {
                alert("Une erreur est survenue. Veuillez réessayer.");
            }
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <header className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold">
                    Bon <span className="text-primary">retour</span>, parmis nous.
                </h1>
                <p className="text-sm opacity-70">
                    Merci de vous connecter pour accéder à l'intranet
                </p>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
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
                        autoComplete="current-password"
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

                <button
                    type="submit"
                    className="btn btn-primary w-full"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "Connexion…" : "Se connecter"}
                </button>
                {unauthorized[0] && (
                    <p className="text-sm text-error text-center">
                        Email ou mot de passe incorrect.
                    </p>
                )}
            </form>

            <div className="divider my-0" />

            <p className="text-sm text-center opacity-80">
                Pas encore de compte ?{" "}
                <Link to="/register" className="link link-primary">
                    Créer un compte
                </Link>
            </p>
        </div>
    );
}
