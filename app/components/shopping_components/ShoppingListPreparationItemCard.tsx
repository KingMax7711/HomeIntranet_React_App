import type { ShoppingListItemDetailed } from "~/stores/shopping_list";
import { Refrigerator } from "lucide-react";
import {
    capitalizeAllWords,
    capitalizeFirstLetter,
    formatCurrencyEUR,
} from "~/tools/formater";

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
    const fridge = item.product?.fridge_product ? (
        <Refrigerator className="inline-block w-4 h-4 text-blue-500 mr-1" />
    ) : null;
    const customSortIndex =
        item.custom_sort_index !== null ? `${item.custom_sort_index + 1}` : "Non trié";
    const category = capitalizeFirstLetter(item.product?.category?.trim() || "—");
    const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
    const price = item.price;
    const comment = item.product?.comment?.trim() || "";
    const in_promotion = item.in_promotion;
    const need_coupons = item.need_coupons;
    const added_by_user = capitalizeAllWords(
        item.added_by_user
            ? `${item.added_by_user.first_name} ${item.added_by_user.last_name.slice(0, 1)}.`
            : "—",
    );

    return (
        <div className={`card bg-base-100 shadow`}>
            <div className="card-body p-4 md:gap-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-1">
                            <h3 className="font-semibold leading-tight truncate">
                                {fridge}
                                {name}
                                <span className="text-xs text-base-content/60">
                                    {" • "}
                                    {customSortIndex}
                                </span>
                            </h3>
                            {in_promotion && (
                                <span className="hidden md:inline-block badge badge-sm badge-success badge-outline ml-3">
                                    En promotion
                                </span>
                            )}
                            {need_coupons && (
                                <span className="hidden md:inline-block badge badge-sm badge-warning badge-outline ml-3">
                                    Nécessite un coupon
                                </span>
                            )}
                        </div>
                        <p className="text-sm opacity-70 truncate">{category}</p>
                        <p className="text-xs opacity-50">Ajouté par : {added_by_user}</p>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2 shrink-0">
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
                        <span className="text-sm opacity-70 self-start md:self-center">
                            Commentaire
                        </span>
                        <span className="font-medium whitespace-pre-line md:whitespace-normal">
                            {comment || "—"}
                        </span>
                    </div>
                    {in_promotion && (
                        <div className="md:hidden flex items-center justify-start gap-3 col-span-full">
                            <span className="badge badge-sm badge-success badge-outline">
                                Article en promotion !
                            </span>
                        </div>
                    )}
                    {need_coupons && (
                        <div className="md:hidden flex items-center justify-start gap-3 col-span-full">
                            <span className="badge badge-sm badge-warning badge-outline">
                                Nécessite un coupon !
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
