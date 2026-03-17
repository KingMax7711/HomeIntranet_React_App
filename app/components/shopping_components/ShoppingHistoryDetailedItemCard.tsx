import type { ShoppingListItemDetailed } from "~/types/shoppingHistory";
import {
    capitalizeAllWords,
    capitalizeFirstLetter,
    formatCurrencyEUR,
} from "~/tools/formater";

export type AddToListState = "idle" | "adding" | "added";

const statusLabel = (status: ShoppingListItemDetailed["status"]) => {
    switch (status) {
        case "pending":
            return "En attente";
        case "found":
            return "Trouvé";
        case "not_found":
            return "Introuvable";
        case "given_up":
            return "Abandonné";
        default:
            return status;
    }
};

const statusBadgeClass = (status: ShoppingListItemDetailed["status"]) => {
    switch (status) {
        case "pending":
            return "badge badge-ghost badge-outline";
        case "found":
            return "badge badge-success badge-outline";
        case "not_found":
            return "badge badge-warning badge-outline";
        case "given_up":
            return "badge badge-error badge-outline";
        default:
            return "badge badge-ghost badge-outline";
    }
};

export default function ShoppingHistoryDetailedItemCard({
    item,
    onAddToList,
    addToListState = "idle",
    addToListDisabled = false,
}: {
    item: ShoppingListItemDetailed;
    onAddToList: (item: ShoppingListItemDetailed) => void;
    addToListState?: AddToListState;
    addToListDisabled?: boolean;
}) {
    const productName = item.product?.name?.trim()
        ? capitalizeAllWords(capitalizeFirstLetter(item.product.name.trim()))
        : "Article inconnu";
    const category = item.product?.category?.trim()
        ? capitalizeAllWords(capitalizeFirstLetter(item.product.category.trim()))
        : "—";
    const comment = item.product?.comment?.trim() || "—";
    const affectedUser = item.affected_user
        ? `${capitalizeFirstLetter(item.affected_user.first_name)} ${capitalizeFirstLetter(item.affected_user.last_name)}`
        : "—";
    const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
    const isAdding = addToListState === "adding";
    const isAdded = addToListState === "added";
    const disableAddButton = addToListDisabled || isAdding || isAdded;

    return (
        <div className="card bg-base-100 shadow">
            <div className="card-body p-4 gap-2 md:gap-2">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <h3 className="font-semibold leading-tight truncate">
                                {productName}
                            </h3>
                            <span className="badge badge-ghost badge-outline badge-sm opacity-70 shrink-0">
                                #{item.id}
                            </span>
                        </div>
                        <p className="text-sm opacity-70 truncate">{category}</p>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-2 shrink-0">
                        <span className={statusBadgeClass(item.status)}>
                            {statusLabel(item.status)}
                        </span>
                        <div className="flex flex-col md:flex-row items-end gap-2">
                            {item.in_promotion ? (
                                <span className="badge badge-sm badge-success badge-outline">
                                    En promotion
                                </span>
                            ) : null}
                            {item.need_coupons ? (
                                <span className="badge badge-sm badge-warning badge-outline">
                                    Coupons
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-8 gap-2 text-sm">
                    <div className="flex items-center justify-start gap-2 md:col-span-1">
                        <span className="opacity-70">Qté</span>
                        <p className="font-medium">{quantity}</p>
                    </div>
                    <div className="flex items-center justify-end md:justify-start gap-2 md:col-span-2">
                        <span className="opacity-70">Prix</span>
                        <p className="font-medium">
                            {item.price === null ? "—" : formatCurrencyEUR(item.price)}
                        </p>
                    </div>
                    <div className="flex items-center justify-start gap-2 col-span-2 md:col-span-2">
                        <span className="opacity-70">Affecté à</span>
                        <p className="font-medium truncate">{affectedUser}</p>
                    </div>
                    <div className="flex items-center justify-start gap-2 col-span-2 md:col-span-3">
                        <span className="opacity-70">Commentaire</span>
                        <p className="font-medium truncate">{comment}</p>
                    </div>
                    <div className="col-span-2 md:col-span-8 flex justify-end">
                        <button
                            type="button"
                            className={`btn btn-sm w-full md:w-auto ${isAdded ? "btn-success" : "btn-info"}`}
                            onClick={() => onAddToList(item)}
                            disabled={disableAddButton}
                        >
                            {isAdding ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="loading loading-spinner loading-xs" />
                                    Ajout…
                                </span>
                            ) : isAdded ? (
                                "Article ajouté"
                            ) : (
                                "Ajouter à la liste"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
