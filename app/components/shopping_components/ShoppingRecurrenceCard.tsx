import { capitalizeFirstLetter } from "~/tools/formater";
import type { ShoppingRecurrenceDetailled } from "~/types/shoppingRecurences";

export default function ShoppingRecurrenceCard({
    recurrence,
    onDelete,
    isDeleting = false,
}: {
    recurrence: ShoppingRecurrenceDetailled;
    onDelete: (recurrence: ShoppingRecurrenceDetailled) => void;
    isDeleting?: boolean;
}) {
    const productName = capitalizeFirstLetter(
        recurrence.product_name?.trim() || "Produit inconnu",
    );
    const houseName = capitalizeFirstLetter(
        recurrence.house_name?.trim() || "Maison inconnue",
    );

    return (
        <div className="card bg-base-100 shadow">
            <div className="card-body p-4 gap-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <h3 className="font-semibold leading-tight truncate">
                                {productName}
                            </h3>
                            <span className="badge badge-ghost badge-outline badge-sm opacity-70 shrink-0">
                                #{recurrence.id}
                            </span>
                        </div>
                        <p className="text-sm opacity-70 truncate">{houseName}</p>
                    </div>

                    <button
                        type="button"
                        className="btn btn-sm btn-error btn-outline"
                        onClick={() => onDelete(recurrence)}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <span className="flex items-center gap-2">
                                <span className="loading loading-spinner loading-xs" />
                                Suppression…
                            </span>
                        ) : (
                            "Supprimer"
                        )}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center justify-start gap-3">
                        <span className="opacity-70">Produit</span>
                        <span className="font-medium truncate">{productName}</span>
                    </div>
                    <div className="flex items-center justify-start gap-3">
                        <span className="opacity-70">Maison</span>
                        <span className="font-medium truncate">{houseName}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
