import type { ShoppingListItemDetailed } from "~/stores/shopping_list";
import type { User } from "~/types/domain";
import {
    capitalizeAllWords,
    capitalizeFirstLetter,
    formatCurrencyEUR,
} from "~/tools/formater";

const statusMeta = (status: ShoppingListItemDetailed["status"]) => {
    switch (status) {
        case "found":
            return {
                badgeLabel: "Caddie",
                badgeClass: "badge badge-success badge-outline",
                headerClass: "bg-success/10 text-base-content border-b border-success/20",
                cardAccentClass: "border border-success/30",
            };
        case "not_found":
            return {
                badgeLabel: "Non trouvé",
                badgeClass: "badge badge-warning badge-outline",
                headerClass: "bg-warning/10 text-base-content border-b border-warning/20",
                cardAccentClass: "border border-warning/30",
            };
        case "given_up":
            return {
                badgeLabel: "Abandonné",
                badgeClass: "badge badge-error badge-outline",
                headerClass: "bg-error/10 text-base-content border-b border-error/20",
                cardAccentClass: "border border-error/30",
            };
        case "pending":
        default:
            return {
                badgeLabel: "À trouver",
                badgeClass: "badge badge-neutral badge-outline",
                headerClass: "bg-base-200 text-base-content border-b border-base-300",
                cardAccentClass: "border border-base-300",
            };
    }
};

export default function ShoppingListInProgressItemCard({
    item,
    onEdit,
    onDelete,
    members,
    isBusy,
    onAssignUser,
    onSetStatus,
}: {
    item: ShoppingListItemDetailed;
    onEdit: (item: ShoppingListItemDetailed) => void;
    onDelete: (item: ShoppingListItemDetailed) => void;
    members: User[];
    isBusy?: boolean;
    onAssignUser: (item: ShoppingListItemDetailed, userId: number) => void;
    onSetStatus: (
        item: ShoppingListItemDetailed,
        status: ShoppingListItemDetailed["status"],
    ) => void;
}) {
    const name = capitalizeFirstLetter(item.product?.name?.trim() || "Article");
    const category = capitalizeFirstLetter(item.product?.category?.trim() || "—");
    const quantity = Number.isFinite(item.quantity) ? item.quantity : 0;
    const price = item.price;
    const comment = item.product?.comment?.trim() || "";
    const in_promotion = item.in_promotion;
    const need_coupons = item.need_coupons;
    const status = item.status ?? "pending";
    const affectedUserId = item.affected_user?.id;
    const meta = statusMeta(status);

    return (
        <div
            className={`card bg-base-100 shadow border border-base-300 overflow-hidden ${meta.cardAccentClass}`}
        >
            <div className={`px-5 py-4 sm:px-5 sm:py-3 ${meta.headerClass}`}>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="font-semibold leading-tight truncate text-lg sm:text-base md:text-lg">
                            {name}
                        </h3>
                        <p className="text-sm opacity-80 truncate">{category}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={meta.badgeClass}>{meta.badgeLabel}</span>
                    </div>
                </div>
                <div className="flex flex-row gap-2 mt-2">
                    {in_promotion && (
                        <span className="badge badge-sm badge-success badge-outline opacity-90 self-end md:self-auto">
                            En promotion
                        </span>
                    )}
                    {need_coupons && (
                        <span className="badge badge-sm badge-warning badge-outline opacity-90 self-end md:self-auto">
                            Besoin de coupons
                        </span>
                    )}
                </div>
            </div>

            <div className="card-body p-5 sm:p-5 gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="form-control w-full">
                        <div className="label py-0">
                            <span className="label-text text-xs opacity-70">
                                Assigné à
                            </span>
                        </div>
                        <select
                            className="select select-bordered w-full sm:select-sm"
                            value={affectedUserId ?? ""}
                            disabled={isBusy || members.length === 0}
                            onChange={(e) => {
                                const v = Number(e.target.value);
                                if (!Number.isFinite(v)) return;
                                onAssignUser(item, v);
                            }}
                        >
                            <option value="" disabled>
                                {members.length === 0 ? "Aucun membre" : "Sélectionner"}
                            </option>
                            {members.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {capitalizeAllWords(`${m.first_name} ${m.last_name}`)}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="form-control w-full">
                        <div className="label py-0">
                            <span className="label-text text-xs opacity-70">Statut</span>
                        </div>
                        <select
                            className="select select-bordered w-full sm:select-sm"
                            value={status}
                            disabled={isBusy}
                            onChange={(e) => {
                                const v = e.target
                                    .value as ShoppingListItemDetailed["status"];
                                if (
                                    v !== "pending" &&
                                    v !== "found" &&
                                    v !== "not_found" &&
                                    v !== "given_up"
                                )
                                    return;
                                onSetStatus(item, v);
                            }}
                        >
                            <option value="pending">À trouver</option>
                            <option value="found">Dans le caddie</option>
                            <option value="not_found">Non trouvé</option>
                            <option value="given_up">Abandonné</option>
                        </select>
                    </label>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <div className="flex items-center justify-start gap-3">
                        <span className="text-sm opacity-70">Quantité</span>
                        <span className="font-medium">{quantity}</span>
                    </div>
                    <div className="flex items-center justify-end md:justify-start gap-3">
                        <span className="text-sm opacity-70">Prix</span>
                        <span className="font-medium">
                            {typeof price === "number" && Number.isFinite(price)
                                ? formatCurrencyEUR(price)
                                : "—"}
                        </span>
                    </div>
                    <div className="flex items-center justify-start gap-3 col-span-2 lg:col-span-3">
                        <span className="text-sm opacity-70 self-start md:self-center">
                            Commentaire
                        </span>
                        <span className="font-medium whitespace-pre-line md:whitespace-normal">
                            {comment || "—"}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                        type="button"
                        className="btn btn-success w-full sm:btn-sm col-span-2 sm:col-span-1"
                        disabled={isBusy || status === "found"}
                        onClick={() => onSetStatus(item, "found")}
                    >
                        {status === "found" ? "Dans le caddie" : "Mettre dans le caddie"}
                    </button>

                    <button
                        type="button"
                        className="btn btn-outline w-full sm:btn-sm"
                        disabled={isBusy || status === "found"}
                        onClick={() => onEdit(item)}
                    >
                        Modifier
                    </button>

                    <button
                        type="button"
                        className="btn btn-error btn-outline w-full sm:btn-sm"
                        disabled={isBusy || status === "found"}
                        onClick={() => onDelete(item)}
                    >
                        Supprimer
                    </button>
                </div>
            </div>
        </div>
    );
}
