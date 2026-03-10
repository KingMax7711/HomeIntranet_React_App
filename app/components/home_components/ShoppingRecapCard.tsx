import type { shoppingRecap } from "~/types/shoppingRecap";
import { capitalizeAllWords, formatCurrencyEUR, formatDateTime } from "~/tools/formater";

function getStatusLabel(status: shoppingRecap["status"]) {
    switch (status) {
        case "preparation":
            return "En préparation";
        case "in_progress":
            return "En cours";
        case "completed":
            return "Terminée";
        default:
            return "—";
    }
}

function getStatusBadgeClass(status: shoppingRecap["status"]) {
    switch (status) {
        case "preparation":
            return "badge badge-warning badge-sm";
        case "in_progress":
            return "badge badge-info badge-sm";
        case "completed":
            return "badge badge-success badge-sm";
        default:
            return "badge badge-ghost badge-outline badge-sm";
    }
}

export default function ShoppingRecapCard({
    shoppingRecap,
}: {
    shoppingRecap: shoppingRecap | null;
}) {
    if (!shoppingRecap) {
        return (
            <div className="card bg-base-200 shadow">
                <div className="card-body p-5 md:p-6">
                    <p className="opacity-70 text-center">
                        Aucun récapitulatif de liste de courses disponible.
                    </p>
                </div>
            </div>
        );
    }

    const houseName = capitalizeAllWords((shoppingRecap.house_name ?? "").trim());
    const mallName = capitalizeAllWords((shoppingRecap.mall_name ?? "").trim());
    const mallLocation = (shoppingRecap.mall_location ?? "").trim();
    const statusLabel = getStatusLabel(shoppingRecap.status);
    const statusBadgeClass = getStatusBadgeClass(shoppingRecap.status);

    return (
        <div className="card bg-base-200 shadow">
            <div className="card-body p-5 md:p-6 gap-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <h3 className="font-semibold leading-tight truncate">
                                Récapitulatif courses
                            </h3>
                            <span className="badge badge-ghost badge-outline badge-sm opacity-70 shrink-0">
                                #{shoppingRecap.id}
                            </span>
                        </div>
                        <span className="opacity-70 italic">{houseName || "Maison"}</span>
                    </div>
                    <span className={statusBadgeClass}>{statusLabel}</span>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="bg-base-100 rounded-3xl p-4 md:p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-50 mb-4">
                            Informations
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                            <div className="space-y-1 min-w-0">
                                <span className="text-sm opacity-60">Maison</span>
                                <p className="font-medium truncate">{houseName || "—"}</p>
                            </div>
                            <div className="space-y-1 min-w-0">
                                <span className="text-sm opacity-60">Magasin</span>
                                <p className="font-medium truncate">{mallName || "—"}</p>
                            </div>
                            <div className="space-y-1 min-w-0">
                                <span className="text-sm opacity-60">Lieu</span>
                                <p className="font-medium truncate">
                                    {mallLocation || "—"}
                                </p>
                            </div>
                            <div className="space-y-1 min-w-0">
                                <span className="text-sm opacity-60">Statut</span>
                                <p className="font-medium">{statusLabel}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-base-100 rounded-3xl p-4 md:p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-50 mb-4">
                            Résumé
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="rounded-2xl bg-base-200/70 px-4 py-3">
                                <p className="text-sm opacity-60 mb-1">Articles</p>
                                <p className="text-base font-semibold">
                                    {shoppingRecap.number_of_items}
                                </p>
                            </div>
                            <div className="rounded-2xl bg-base-200/70 px-4 py-3">
                                <p className="text-sm opacity-60 mb-1">Total</p>
                                <p className="text-base font-semibold">
                                    {formatCurrencyEUR(shoppingRecap.total)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-base-100 rounded-3xl p-4 md:p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-50 mb-4">
                            Dates
                        </p>
                        <div className="space-y-1">
                            <span className="text-sm opacity-60">Créée</span>
                            <p className="font-medium leading-relaxed">
                                {formatDateTime(shoppingRecap.created_at)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
