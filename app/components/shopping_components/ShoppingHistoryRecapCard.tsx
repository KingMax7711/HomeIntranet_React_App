import { Link } from "react-router";
import type { ShoppingListRecap } from "~/types/shoppingHistory";
import {
    capitalizeAllWords,
    capitalizeFirstLetter,
    formatCurrencyEUR,
    formatDateTime,
} from "~/tools/formater";

export default function ShoppingHistoryRecapCard({
    recap,
}: {
    recap: ShoppingListRecap;
}) {
    const houseName = capitalizeAllWords(
        capitalizeFirstLetter(recap.house_name?.trim() || "Maison inconnue"),
    );
    const mallName = recap.mall_name?.trim()
        ? capitalizeAllWords(capitalizeFirstLetter(recap.mall_name.trim()))
        : "—";
    const mallLocation = recap.mall_location?.trim()
        ? capitalizeAllWords(capitalizeFirstLetter(recap.mall_location.trim()))
        : "—";

    return (
        <div className="card bg-base-100 shadow">
            <div className="card-body p-4 gap-2 md:gap-2">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <h3 className="font-semibold leading-tight truncate">
                                {houseName}
                            </h3>
                            <span className="badge badge-ghost badge-outline badge-sm opacity-70 shrink-0">
                                #{recap.id}
                            </span>
                        </div>
                        <p className="text-sm opacity-70 truncate">
                            {mallName} - {mallLocation}
                        </p>
                    </div>
                    <span className="badge badge-success badge-outline badge-sm shrink-0">
                        Terminée
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 text-sm">
                    <div className="flex items-center justify-start gap-2 md:col-span-2">
                        <span className="opacity-70">Articles</span>
                        <p className="font-medium">{recap.number_of_items}</p>
                    </div>
                    <div className="flex items-center justify-start gap-2 md:col-span-2">
                        <span className="opacity-70">Total</span>
                        <p className="font-medium">
                            {recap.total === null ? "—" : formatCurrencyEUR(recap.total)}
                        </p>
                    </div>
                    <div className="flex items-center justify-start gap-2 md:col-span-2">
                        <span className="opacity-70">Fermée</span>
                        <p className="font-medium">
                            {recap.closed_at ? formatDateTime(recap.closed_at) : "—"}
                        </p>
                    </div>
                    <div className="flex items-center justify-end gap-2 md:col-span-6">
                        <Link
                            to={`/shopping_history/${recap.id}`}
                            className="btn btn-sm btn-outline w-full md:w-auto"
                        >
                            Consulter
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
