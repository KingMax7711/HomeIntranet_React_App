import type { FridgeItemLite } from "~/types/fridges";
import { capitalizeFirstLetter, formatDate } from "~/tools/formater";

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
        return { label: "Périmé", className: "badge-error" };
    }

    if (diffInDays <= 3) {
        return { label: "Bientôt périmé", className: "badge-warning" };
    }

    return null;
};

export default function FridgeProductCard({
    item,
    onEdit,
    onDelete,
    isBusy = false,
}: {
    item: FridgeItemLite;
    onEdit: (item: FridgeItemLite) => void;
    onDelete: (item: FridgeItemLite) => void;
    isBusy?: boolean;
}) {
    const productName = capitalizeFirstLetter(item.product_name?.trim() || "Produit");
    const expirationLabel = item.expiration_date
        ? formatDate(item.expiration_date)
        : "Non renseignee";
    const expirationBadge = getExpirationBadge(item.expiration_date);

    return (
        <div className="card bg-base-100 shadow">
            <div className="card-body p-4 md:gap-3">
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
                                Conservation OK
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div className="flex items-center justify-start gap-3 md:col-span-2">
                        <span className="text-sm opacity-70">Quantite</span>
                        <span className="font-medium">{item.quantity}</span>
                    </div>

                    <div className="flex items-center justify-start gap-3 md:col-span-2">
                        <span className="text-sm opacity-70">Expiration</span>
                        <span className="font-medium truncate">{expirationLabel}</span>
                    </div>

                    <div className="flex items-center justify-end gap-2 md:col-span-2">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => onEdit(item)}
                            disabled={isBusy}
                        >
                            Editer
                        </button>
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
            </div>
        </div>
    );
}
