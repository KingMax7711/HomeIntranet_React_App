import type { FridgeItemLite, FridgeRecap } from "~/types/fridges";
import { capitalizeFirstLetter, formatDate } from "~/tools/formater";
import { ChevronDown } from "lucide-react";

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getExpirationBadge = (expirationDate: string | null) => {
    if (!expirationDate) return null;

    const parsedDate = new Date(expirationDate);
    if (Number.isNaN(parsedDate.getTime())) return null;

    const today = startOfDay(new Date());
    const expirationDay = startOfDay(parsedDate);
    const diffInDays = Math.floor((expirationDay.getTime() - today.getTime()) / DAY_MS);

    if (diffInDays < 0) {
        return {
            label: "Périmé",
            className: "badge-error badge-soft badge-outline rounded-full",
        };
    }

    if (diffInDays <= 3) {
        return {
            label: "Bientôt périmé",
            className: "badge-warning badge-soft badge-outline rounded-full",
        };
    }

    return null;
};

const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

const getShelfLifeProgress = (addedAt: string | null, expirationDate: string | null) => {
    if (!addedAt || !expirationDate) return null;

    const addedDate = new Date(addedAt);
    const expiredDate = new Date(expirationDate);

    if (Number.isNaN(addedDate.getTime()) || Number.isNaN(expiredDate.getTime())) {
        return null;
    }

    const totalDuration = expiredDate.getTime() - addedDate.getTime();
    if (totalDuration <= 0) return null;

    const now = Date.now();
    const progress = clamp(((now - addedDate.getTime()) / totalDuration) * 100, 0, 100);

    const remainingMs = expiredDate.getTime() - now;
    const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));

    return {
        value: progress,
        remainingDays,
    };
};

export default function FridgeProductCard({
    item,
    onEdit,
    onDelete,
    onMove,
    availableFridges,
    isBusy = false,
}: {
    item: FridgeItemLite;
    onEdit: (item: FridgeItemLite) => void;
    onDelete: (item: FridgeItemLite) => void;
    onMove: (item: FridgeItemLite, newFridgeId: number) => Promise<void>;
    availableFridges: FridgeRecap[];
    isBusy?: boolean;
}) {
    const productName = capitalizeFirstLetter(item.product_name?.trim() || "Produit");
    const comment = (item.comment ?? "").trim();
    const addedAtLabel = item.added_at ? formatDate(item.added_at) : "Date inconnue";
    const expirationLabel = item.expiration_date
        ? formatDate(item.expiration_date)
        : "Non renseignée";
    const expirationBadge = getExpirationBadge(item.expiration_date);
    const movableFridges = availableFridges.filter(
        (fridge) => fridge.fridge_id !== item.fridge_id,
    );
    const shelfLifeProgress = getShelfLifeProgress(item.added_at, item.expiration_date);
    const hasUsableShelfLifeBar = Boolean(
        item.added_at && item.expiration_date && shelfLifeProgress,
    );

    return (
        <div className="card bg-base-100 border border-base-300 shadow-sm">
            <div className="card-body p-4 gap-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <h3 className="font-semibold leading-tight truncate">
                                {productName}
                            </h3>
                            <span className="hidden md:block badge badge-ghost badge-outline badge-sm opacity-70 shrink-0">
                                #{item.id}
                            </span>
                        </div>
                        <p className="text-sm opacity-70 truncate">Produit frigo</p>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center gap-2 shrink-0">
                        {expirationBadge ? (
                            <span
                                className={`badge badge-sm ${expirationBadge.className}`}
                            >
                                {expirationBadge.label}
                            </span>
                        ) : (
                            <span className="badge badge-ghost badge-outline badge-sm opacity-70">
                                Consommable
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div className="flex items-center justify-start gap-3 md:col-span-2 rounded-xl border border-base-200 bg-base-200/50 px-3 py-2">
                        <span className="text-sm opacity-70">Quantité</span>
                        <span className="font-medium">{item.quantity}</span>
                    </div>

                    <div className="flex items-center justify-start gap-3 md:col-span-2 rounded-xl border border-base-200 bg-base-200/50 px-3 py-2">
                        <span className="text-sm opacity-70">Ajouté</span>
                        <span className="font-medium truncate">{addedAtLabel}</span>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-2 md:col-span-2">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => onEdit(item)}
                            disabled={isBusy}
                        >
                            Éditer
                        </button>
                        <details className="dropdown">
                            <summary
                                className="btn btn-sm btn-outline"
                                aria-label="Déplacer l'article"
                            >
                                Déplacer
                                <ChevronDown className="w-4 h-4 m-0 p-0" />
                            </summary>
                            <ul className="menu dropdown-content z-1 mt-2 w-56 rounded-box bg-base-100 border border-base-300 p-2 shadow">
                                {movableFridges.length > 0 ? (
                                    movableFridges.map((fridge) => (
                                        <li key={fridge.fridge_id}>
                                            <button
                                                type="button"
                                                disabled={isBusy}
                                                onClick={async (event) => {
                                                    const details =
                                                        event.currentTarget.closest(
                                                            "details",
                                                        ) as HTMLDetailsElement | null;
                                                    details?.removeAttribute("open");
                                                    await onMove(item, fridge.fridge_id);
                                                }}
                                            >
                                                {fridge.fridge_name}
                                            </button>
                                        </li>
                                    ))
                                ) : (
                                    <li>
                                        <span className="opacity-60">
                                            Aucun autre frigo disponible
                                        </span>
                                    </li>
                                )}
                            </ul>
                        </details>
                        <button
                            type="button"
                            className="btn btn-sm btn-error btn-outline"
                            onClick={() => onDelete(item)}
                            disabled={isBusy}
                        >
                            Supprimer
                        </button>
                    </div>
                </div>

                <div className="mt-2 rounded-2xl border border-base-200 bg-base-200/70 p-3 md:p-4 relative overflow-hidden">
                    <div className={hasUsableShelfLifeBar ? "" : "blur-sm opacity-35"}>
                        <div className="flex items-center justify-between gap-3 text-xs md:text-sm opacity-80 mb-2">
                            <span>Achat</span>
                            <span>Péremption</span>
                        </div>

                        <progress
                            className={`progress w-full ${expirationBadge?.className?.includes("warning") ? "progress-warning" : expirationBadge?.className?.includes("error") ? "progress-error" : "progress-success"}`}
                            value={shelfLifeProgress?.value ?? 0}
                            max="100"
                        />

                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs md:text-sm opacity-80">
                            <span>Ajouté le {addedAtLabel}</span>
                            <span className="italic">
                                {shelfLifeProgress
                                    ? `${shelfLifeProgress.remainingDays} j restants`
                                    : item.expiration_date
                                      ? ""
                                      : "pas de date de péremption"}
                            </span>
                            <span>Périme le {expirationLabel}</span>
                        </div>
                    </div>

                    {hasUsableShelfLifeBar ? null : (
                        <div className="absolute inset-0 flex items-center justify-center bg-base-200/35 backdrop-blur-[1px] px-4 text-center">
                            <div className="rounded-full px-4 py-2 text-sm font-medium">
                                Aucune date de péremption
                            </div>
                        </div>
                    )}
                </div>

                {comment ? (
                    <div className="rounded-2xl border border-base-200 bg-base-200/40 p-3">
                        <p className="text-xs uppercase tracking-wide opacity-60 mb-1">
                            Commentaire
                        </p>
                        <p className="text-sm leading-relaxed">{comment}</p>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-base-content/20 bg-base-200/35 p-3 text-center backdrop-blur-[1px]">
                        <div className="rounded-full px-4 py-2 text-sm font-medium">
                            Aucun commentaire
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
