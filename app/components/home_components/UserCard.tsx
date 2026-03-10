import type { User } from "~/types/domain";
import { capitalizeFirstLetter, formatDate } from "~/tools/formater";

export default function UserCard({ user }: { user: User | null }) {
    if (!user) {
        return (
            <div className="card bg-base-200 shadow">
                <div className="card-body p-4">
                    <p className="opacity-70">Aucun utilisateur connecté</p>
                </div>
            </div>
        );
    }

    const firstName = capitalizeFirstLetter((user.first_name ?? "").trim());
    const lastName = capitalizeFirstLetter((user.last_name ?? "").trim());
    const fullName = `${firstName} ${lastName}`.trim() || "Utilisateur";
    const email = (user.email ?? "").trim();

    const privilegeLabel = user.privileges === "owner" ? "Propriétaire" : "Utilisateur";

    return (
        <div className="card bg-base-200 shadow">
            <div className="card-body p-4 gap-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <h3 className="font-semibold leading-tight truncate">
                                {fullName}
                            </h3>
                            <span className="badge badge-ghost badge-outline badge-sm opacity-70 shrink-0">
                                #{user.id}
                            </span>
                        </div>
                        <span className="italic mt-2 opacity-70">
                            {"Aucune description"}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex items-center justify-start gap-3">
                        <span className="text-sm opacity-70">Email</span>
                        <span className="font-medium truncate">{email || "—"}</span>
                    </div>
                    <div className="flex items-center justify-start gap-3">
                        <span className="text-sm opacity-70">Inscription</span>
                        <span className="font-medium">
                            {formatDate(user.inscription_date)}
                        </span>
                    </div>
                    <div className="flex items-center justify-start gap-3">
                        <span className="text-sm opacity-70">Rôle</span>
                        <span className="font-medium">{privilegeLabel}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
