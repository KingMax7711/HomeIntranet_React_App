import { capitalizeFirstLetter, formatCurrencyEUR } from "~/tools/formater";

export type ProductCatalogItem = {
    id: number;
    name: string;
    default_price?: number | null;
    comment?: string | null;
    category?: string | null;
    category_id?: unknown;
};

export type Category = {
    id: number;
    name: string;
};

export type AddToListState = "idle" | "adding" | "added";

const categoryLabelFromProduct = (p: ProductCatalogItem): string => {
    if (typeof p.category === "string" && p.category.trim()) return p.category.trim();

    const anyP = p as any;
    const c = anyP?.category_id;
    if (typeof c === "string" && c.trim()) return c.trim();
    if (typeof c === "number" && Number.isFinite(c)) return `#${c}`;
    if (c && typeof c === "object") {
        const n = (c as any)?.name;
        if (typeof n === "string" && n.trim()) return n.trim();
        const id = (c as any)?.id;
        if (typeof id === "number" && Number.isFinite(id)) return `#${id}`;
    }

    return "—";
};

export default function ProductCard({
    product,
    onEdit,
    onDelete,
    onAddToList,
    addToListState = "idle",
    addToListDisabled = false,
}: {
    product: ProductCatalogItem;
    onEdit: (product: ProductCatalogItem) => void;
    onDelete: (product: ProductCatalogItem) => void;
    onAddToList: (product: ProductCatalogItem) => void;
    addToListState?: AddToListState;
    addToListDisabled?: boolean;
}) {
    const name = capitalizeFirstLetter(product.name?.trim() || "Produit");
    const category = capitalizeFirstLetter(categoryLabelFromProduct(product));
    const comment = (product.comment ?? "").trim();

    const hasDefaultPrice =
        typeof product.default_price === "number" &&
        Number.isFinite(product.default_price);

    const isAdding = addToListState === "adding";
    const isAdded = addToListState === "added";
    const disableAddButton = addToListDisabled || isAdding || isAdded;

    return (
        <div className="card bg-base-100 shadow">
            <div className="card-body p-4 md:gap-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <h3 className="font-semibold leading-tight truncate">
                                {name}
                            </h3>
                            <span className="hidden md:block badge badge-ghost badge-outline badge-sm opacity-70 shrink-0">
                                #{product.id}
                            </span>
                        </div>
                        <p className="text-sm opacity-70 truncate">{category}</p>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center gap-2 shrink-0">
                        <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={() => onEdit(product)}
                        >
                            Éditer
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-error btn-outline"
                            onClick={() => onDelete(product)}
                        >
                            Supprimer
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div className="flex items-center justify-start gap-3 md:col-span-2">
                        <span className="text-sm opacity-70">Prix </span>
                        <span className="font-medium">
                            {hasDefaultPrice
                                ? formatCurrencyEUR(product.default_price as number)
                                : "—"}
                        </span>
                    </div>
                    <div className="flex items-center justify-start gap-3 md:col-span-3">
                        <span className="text-sm opacity-70">Commentaire</span>
                        <span className="font-medium truncate">{comment || "—"}</span>
                    </div>
                    <div className="flex items-center justify-end gap-3 md:col-span-1">
                        <button
                            type="button"
                            className={`btn btn-sm w-full md:w-3/4 ${isAdded ? "btn-success" : "btn-info"}`}
                            onClick={() => onAddToList(product)}
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
