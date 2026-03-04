import type { ShoppingListItemDetailed } from "~/stores/shopping_list";
import { capitalizeFirstLetter, formatCurrencyEUR } from "~/tools/formater";

export default function ShoppingListPreparationItemCard({
    item,
    onEdit,
    onDelete,
}: {
    item: ShoppingListItemDetailed;
    onEdit: (item: ShoppingListItemDetailed) => void;
    onDelete: (item: ShoppingListItemDetailed) => void;
}) {
    const name = capitalizeFirstLetter(item.product?.name?.trim() || "Article");
    const category = capitalizeFirstLetter(item.product?.category?.trim() || "—");
    const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
    const price = item.price;
    const comment = item.product?.comment?.trim() || "";
    const in_promotion = item.in_promotion;

    return (
        <div className={`card bg-base-100 shadow`}>
            <div className="card-body p-4 gap-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-1">
                            <h3 className="font-semibold leading-tight truncate">
                                {name}
                            </h3>
                            {in_promotion && (
                                <span className="hidden md:inline-block badge badge-sm badge-success badge-outline">
                                    En promotion
                                </span>
                            )}
                        </div>
                        <p className="text-sm opacity-70 truncate">{category}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => onEdit(item)}
                        >
                            Éditer
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-error btn-outline"
                            onClick={() => onDelete(item)}
                        >
                            Supprimer
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className="flex items-center justify-start gap-3">
                        <span className="text-sm opacity-70">Quantité</span>
                        <span className="font-medium">{quantity}</span>
                    </div>
                    <div className="flex items-center justify-start gap-3">
                        <span className="text-sm opacity-70">Prix</span>
                        <span className="font-medium">
                            {typeof price === "number" && Number.isFinite(price)
                                ? formatCurrencyEUR(price)
                                : "—"}
                        </span>
                    </div>
                    <div className="flex items-center justify-start gap-3 col-span-2 md:col-span-3">
                        <span className="text-sm opacity-70">Commentaire</span>
                        <span className="font-medium truncate">{comment || "—"}</span>
                    </div>
                    {in_promotion && (
                        <div className="md:hidden flex items-center justify-start gap-3 col-span-full">
                            <span className="badge badge-sm badge-success badge-outline">
                                Article en promotion !
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
