import type { Route } from "./+types/settings";
import { useEffect, useState } from "react";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";
import { apiClient } from "~/api/apiClient";
import { useAuthStore } from "../../stores/auth";
import { capitalizeFirstLetter, formatDate } from "~/tools/formater";

export function meta({}: Route.MetaArgs) {
    return [{ title: "NestBoard - Paramètres" }];
}

export default function Settings() {
    const user = useAuthStore((s) => s.user);
    const ensureSession = useAuthStore((s) => s.ensureSession);
    const endSession = useAuthStore((s) => s.endSession);

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [profileMessage, setProfileMessage] = useState<string | null>(null);
    const [profileError, setProfileError] = useState<string | null>(null);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    const [sessionMessage, setSessionMessage] = useState<string | null>(null);
    const [sessionError, setSessionError] = useState<string | null>(null);
    const [isEndingSessions, setIsEndingSessions] = useState(false);

    useEffect(() => {
        setFirstName(user?.first_name ?? "");
        setLastName(user?.last_name ?? "");
    }, [user?.id, user?.first_name, user?.last_name]);

    const currentFirstName = (user?.first_name ?? "").trim();
    const currentLastName = (user?.last_name ?? "").trim();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    const hasProfileChanges =
        !!user &&
        (trimmedFirstName !== currentFirstName || trimmedLastName !== currentLastName);

    const isProfileButtonDisabled =
        isUpdatingProfile ||
        !user ||
        !hasProfileChanges ||
        (!trimmedFirstName && !trimmedLastName);

    const isPasswordButtonDisabled =
        isUpdatingPassword ||
        !currentPassword ||
        !newPassword ||
        !confirmPassword ||
        newPassword !== confirmPassword;

    const handleUpdateProfile = async () => {
        if (isProfileButtonDisabled) return;

        setProfileError(null);
        setProfileMessage(null);
        setIsUpdatingProfile(true);

        try {
            const payload: { first_name?: string; last_name?: string } = {};
            if (trimmedFirstName !== currentFirstName) {
                payload.first_name = trimmedFirstName;
            }
            if (trimmedLastName !== currentLastName) {
                payload.last_name = trimmedLastName;
            }

            await apiClient.post("/users/update", payload);
            await ensureSession();
            setProfileMessage("Profil mis à jour avec succès.");
        } catch (e) {
            if (axios.isAxiosError(e)) {
                const detail = e.response?.data;
                setProfileError(
                    `Impossible de mettre à jour le profil: ${String(detail ?? e.message)}`,
                );
            } else {
                setProfileError(`Erreur inattendue: ${String(e)}`);
            }
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (isPasswordButtonDisabled) return;

        setPasswordError(null);
        setPasswordMessage(null);
        setIsUpdatingPassword(true);

        try {
            await apiClient.post("/users/update_password", {
                current_password: currentPassword,
                new_password: newPassword,
            });

            setPasswordMessage("Mot de passe mis à jour avec succès.");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (e) {
            if (axios.isAxiosError(e)) {
                if (e.response?.status === 400) {
                    setPasswordError(
                        "Le mot de passe actuel est incorrect. Veuillez réessayer.",
                    );
                } else {
                    const detail = e.response?.data;
                    setPasswordError(
                        `Impossible de mettre à jour le mot de passe: ${String(detail ?? e.message)}`,
                    );
                }
            } else {
                setPasswordError(`Erreur inattendue: ${String(e)}`);
            }
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    const handleEndAllSessions = async () => {
        if (isEndingSessions || !user) return;

        setSessionError(null);
        setSessionMessage(null);

        const confirmed = window.confirm(
            "Cette action va terminer toutes vos sessions actives. Continuer ?",
        );
        if (!confirmed) return;

        setIsEndingSessions(true);
        try {
            await apiClient.post("/users/end_all_sessions");
            setSessionMessage(
                "Toutes les sessions ont été terminées. Vous allez être redirigé vers la connexion.",
            );
            await endSession("LOGOUT");
        } catch (e) {
            if (axios.isAxiosError(e)) {
                const detail = e.response?.data;
                setSessionError(
                    `Impossible de terminer toutes les sessions: ${String(detail ?? e.message)}`,
                );
            } else {
                setSessionError(`Erreur inattendue: ${String(e)}`);
            }
        } finally {
            setIsEndingSessions(false);
        }
    };

    const fullName = user
        ? `${capitalizeFirstLetter((user.first_name ?? "").trim())} ${capitalizeFirstLetter((user.last_name ?? "").trim())}`.trim()
        : "Utilisateur";
    const roleLabel = user?.privileges === "owner" ? "Propriétaire" : "Utilisateur";

    return (
        <div className="mx-auto w-full max-w-6xl px-4 md:px-6">
            <div className="grid md:grid-cols-3 gap-5">
                <div className="md:col-span-1 flex flex-col gap-5">
                    <div className="card bg-base-200 shadow">
                        <div className="card-body p-4 gap-3">
                            <h2 className="card-title text-lg">Mon compte</h2>
                            {user ? (
                                <>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <p className="font-semibold truncate">
                                            {fullName}
                                        </p>
                                        <span className="badge badge-ghost badge-outline badge-sm opacity-70">
                                            #{user.id}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-sm opacity-70">
                                                Email
                                            </span>
                                            <span className="font-medium truncate text-right">
                                                {user.email}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-sm opacity-70">
                                                Inscription
                                            </span>
                                            <span className="font-medium">
                                                {formatDate(user.inscription_date ?? "")}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-sm opacity-70">
                                                Rôle
                                            </span>
                                            <span className="font-medium">
                                                {roleLabel}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p className="opacity-70">Aucun utilisateur connecté</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2 flex flex-col gap-5">
                    <div className="card bg-base-200 shadow">
                        <div className="card-body p-4 gap-4">
                            <h2 className="card-title text-lg">Modifier le profil</h2>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Prénom</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        placeholder="Votre prénom"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">Nom</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        placeholder="Votre nom"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="card-actions justify-end">
                                <button
                                    className="btn btn-primary"
                                    onClick={handleUpdateProfile}
                                    disabled={isProfileButtonDisabled}
                                >
                                    {isUpdatingProfile && (
                                        <span className="loading loading-spinner loading-xs" />
                                    )}
                                    Enregistrer le profil
                                </button>
                            </div>
                            {profileMessage && (
                                <p className="text-success text-sm">{profileMessage}</p>
                            )}
                            {profileError && (
                                <p className="text-error text-sm">{profileError}</p>
                            )}
                        </div>
                    </div>

                    <div className="card bg-base-200 shadow">
                        <div className="card-body p-4 gap-4">
                            <h2 className="card-title text-lg">
                                Changer le mot de passe
                            </h2>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">
                                            Mot de passe actuel
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={
                                                showCurrentPassword ? "text" : "password"
                                            }
                                            className="input input-bordered w-full pr-12"
                                            placeholder="Mot de passe actuel"
                                            value={currentPassword}
                                            onChange={(e) =>
                                                setCurrentPassword(e.target.value)
                                            }
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-xs absolute right-2 top-1/2 -translate-y-1/2"
                                            onClick={() =>
                                                setShowCurrentPassword((prev) => !prev)
                                            }
                                            aria-label={
                                                showCurrentPassword
                                                    ? "Masquer le mot de passe actuel"
                                                    : "Afficher le mot de passe actuel"
                                            }
                                        >
                                            {showCurrentPassword ? (
                                                <EyeOff size={16} />
                                            ) : (
                                                <Eye size={16} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">
                                            Nouveau mot de passe
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? "text" : "password"}
                                            className="input input-bordered w-full pr-12"
                                            placeholder="Nouveau mot de passe"
                                            value={newPassword}
                                            onChange={(e) =>
                                                setNewPassword(e.target.value)
                                            }
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-xs absolute right-2 top-1/2 -translate-y-1/2"
                                            onClick={() =>
                                                setShowNewPassword((prev) => !prev)
                                            }
                                            aria-label={
                                                showNewPassword
                                                    ? "Masquer le nouveau mot de passe"
                                                    : "Afficher le nouveau mot de passe"
                                            }
                                        >
                                            {showNewPassword ? (
                                                <EyeOff size={16} />
                                            ) : (
                                                <Eye size={16} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">
                                            Confirmer le mot de passe
                                        </span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={
                                                showConfirmPassword ? "text" : "password"
                                            }
                                            className="input input-bordered w-full pr-12"
                                            placeholder="Confirmer"
                                            value={confirmPassword}
                                            onChange={(e) =>
                                                setConfirmPassword(e.target.value)
                                            }
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-xs absolute right-2 top-1/2 -translate-y-1/2"
                                            onClick={() =>
                                                setShowConfirmPassword((prev) => !prev)
                                            }
                                            aria-label={
                                                showConfirmPassword
                                                    ? "Masquer la confirmation du mot de passe"
                                                    : "Afficher la confirmation du mot de passe"
                                            }
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff size={16} />
                                            ) : (
                                                <Eye size={16} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="card-actions justify-end">
                                <button
                                    className="btn btn-secondary"
                                    onClick={handleUpdatePassword}
                                    disabled={isPasswordButtonDisabled}
                                >
                                    {isUpdatingPassword && (
                                        <span className="loading loading-spinner loading-xs" />
                                    )}
                                    Mettre à jour le mot de passe
                                </button>
                            </div>
                            {passwordMessage && (
                                <p className="text-success text-sm">{passwordMessage}</p>
                            )}
                            {passwordError && (
                                <p className="text-error text-sm">{passwordError}</p>
                            )}
                        </div>
                    </div>

                    <div className="card bg-base-200 shadow">
                        <div className="card-body p-4 gap-4">
                            <h2 className="card-title text-lg">
                                Autre actions de sécurité
                            </h2>
                            <div className="card-actions justify-between">
                                <button
                                    className="btn btn-error btn-outline"
                                    onClick={handleEndAllSessions}
                                    disabled={isEndingSessions || !user}
                                >
                                    {isEndingSessions && (
                                        <span className="loading loading-spinner loading-xs" />
                                    )}
                                    Se déconnecter de tous les appareils
                                </button>
                            </div>
                            {sessionMessage && (
                                <p className="text-success text-sm">{sessionMessage}</p>
                            )}
                            {sessionError && (
                                <p className="text-error text-sm">{sessionError}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
