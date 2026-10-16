import { useMemo, useState } from "react";
import {
    capitalizeAllWords,
    capitalizeFirstLetter,
    formatCurrencyEUR,
} from "~/tools/formater";

type ProductLite = {
    id: number;
    name: string;
    default_price?: number | null;
    comment?: string | null;
    category?: string | null;
    fridge_product?: boolean;
};

type CategoryLite = {
    id: number;
    name: string;
};

const normalize = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
const safeTrim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export type ImportedItemView = {
    id: number;
    sourceLine: string;
    proposedName: string;
    matchedProduct: ProductLite | null;
    matchOrigin: "none" | "auto" | "suggestion" | "catalog";
    matchScore: number;
    suggestedProduct: ProductLite | null;
    suggestionScore: number;
    draft: {
        name: string;
        categoryName: string;
        defaultPrice: string;
        comment: string;
        fridgeProduct: boolean;
        quantity: number;
        articleComment: string;
        inPromotion: boolean;
        needCoupons: boolean;
    };
};

export default function ImportedProductCard({
    item,
    categories,
    showDivider,
    isLoading,
    canRejectAutoMatch,
    onNameChange,
    onCategoryChange,
    onDefaultPriceChange,
    onCommentChange,
    onFridgeProductChange,
    onQuantityChange,
    onArticleCommentChange,
    onInPromotionChange,
    onNeedCouponsChange,
    onUseSuggestion,
    onIgnoreSuggestion,
    onRejectAutoMatch,
    onAddToCatalog,
    onAddToList,
}: {
    item: ImportedItemView;
    categories: CategoryLite[];
    showDivider: boolean;
    isLoading: boolean;
    canRejectAutoMatch: boolean;
    onNameChange: (value: string) => void;
    onCategoryChange: (value: string) => void;
    onDefaultPriceChange: (value: string) => void;
    onCommentChange: (value: string) => void;
    onFridgeProductChange: (checked: boolean) => void;
    onQuantityChange: (value: number) => void;
    onArticleCommentChange: (value: string) => void;
    onInPromotionChange: (checked: boolean) => void;
    onNeedCouponsChange: (checked: boolean) => void;
    onUseSuggestion: () => void;
    onIgnoreSuggestion: () => void;
    onRejectAutoMatch: () => void;
    onAddToCatalog: () => void;
    onAddToList: () => void;
}) {
    const isMatched = !!item.matchedProduct;
    const hasSuggestion = !isMatched && !!item.suggestedProduct;
    const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);

    const filteredCategories = useMemo(() => {
        const query = normalize(item.draft.categoryName ?? "");
        if (!query) return [];

        const list = categories.filter((category) =>
            normalize(category.name).includes(query),
        );
        list.sort((a, b) => a.name.localeCompare(b.name));
        return list.slice(0, 8);
    }, [categories, item.draft.categoryName]);

    const productBadgeLabel = isMatched ? "Existant" : "Nouveau";
    const productBadgeClass = isMatched
        ? "badge badge-primary badge-outline"
        : "badge badge-accent badge-outline";

    return (
        <div className="flex flex-col gap-4">
            <div className="card w-full bg-base-300 shadow-xl">
                <div className="card-body gap-4">
                    <section className="bg-base-200 rounded-box p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-3">
                            <h4 className="font-semibold">Sélection du produit</h4>
                            <span className={productBadgeClass}>{productBadgeLabel}</span>
                        </div>

                        <div className="form-control mt-3">
                            <label className="label">
                                <span className="label-text">Nom</span>
                            </label>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                value={item.draft.name}
                                disabled={isLoading}
                                onChange={(event) => onNameChange(event.target.value)}
                            />
                            <span className="text-xs opacity-60 mt-1">
                                Ligne importée : {item.sourceLine}
                            </span>

                            {canRejectAutoMatch ? (
                                <div className="mt-2 rounded-box bg-base-100 px-3 py-2 border border-base-300 flex items-center gap-2">
                                    <p className="text-xs opacity-80">
                                        Ce n’est pas ce produit ?
                                    </p>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-xs w-fit gap-0"
                                        disabled={isLoading}
                                        onClick={onRejectAutoMatch}
                                    >
                                        Retirer
                                    </button>
                                </div>
                            ) : null}

                            {hasSuggestion ? (
                                <div className="mt-2 rounded-box bg-base-100 px-3 py-2 border border-base-300">
                                    <p className="text-xs opacity-80">
                                        Ne s’agirait-il pas de ce produit ?
                                        <br className="block md:hidden" />
                                        <span className="font-medium">
                                            {" "}
                                            {capitalizeAllWords(
                                                item.suggestedProduct?.name ?? "",
                                            )}
                                        </span>
                                        <span className="opacity-60">
                                            {" "}
                                            ({Math.round(item.suggestionScore * 100)}%)
                                        </span>
                                    </p>
                                    <div className="mt-2 flex justify-between gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-xs"
                                            disabled={isLoading}
                                            onClick={onUseSuggestion}
                                        >
                                            Utiliser cette suggestion
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-xs"
                                            disabled={isLoading}
                                            onClick={onIgnoreSuggestion}
                                        >
                                            Ignorer
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        <div className="mt-4 bg-base-100 rounded-box p-3 sm:p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-lg font-semibold truncate">
                                        {capitalizeAllWords(
                                            item.draft.name || item.proposedName,
                                        )}
                                    </div>
                                    <div className="text-xs opacity-60">
                                        Fiabilité du rapprochement :{" "}
                                        {Math.round(item.matchScore * 100)}%
                                    </div>
                                </div>
                                <span className={productBadgeClass}>
                                    {productBadgeLabel}
                                </span>
                            </div>

                            <div className="divider my-3" />

                            {isMatched ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <div className="text-xs opacity-60">
                                            Produit catalogue
                                        </div>
                                        <div className="font-medium">
                                            {capitalizeAllWords(
                                                item.matchedProduct?.name ?? "",
                                            ) || "—"}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs opacity-60">
                                            Catégorie
                                        </div>
                                        <div className="font-medium">
                                            {capitalizeFirstLetter(
                                                item.matchedProduct?.category ?? "",
                                            ) || "—"}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs opacity-60">Prix</div>
                                        <div className="font-medium">
                                            {typeof item.matchedProduct?.default_price ===
                                            "number"
                                                ? formatCurrencyEUR(
                                                      item.matchedProduct.default_price,
                                                  )
                                                : "—"}
                                        </div>
                                    </div>
                                    {item.matchedProduct?.comment ? (
                                        <div className="md:col-span-2">
                                            <div className="text-xs opacity-60">
                                                Commentaire
                                            </div>
                                            <div className="opacity-80 whitespace-pre-wrap italic">
                                                {item.matchedProduct.comment}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="form-control flex flex-col">
                                        <label className="label">
                                            <span className="label-text">Catégorie</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                className="input input-bordered w-full"
                                                placeholder="Optionnel"
                                                value={item.draft.categoryName}
                                                disabled={isLoading}
                                                onFocus={() => {
                                                    if (
                                                        safeTrim(item.draft.categoryName)
                                                    ) {
                                                        setCategoryMenuOpen(true);
                                                    }
                                                }}
                                                onChange={(event) => {
                                                    onCategoryChange(event.target.value);
                                                    setCategoryMenuOpen(true);
                                                }}
                                                onBlur={() => {
                                                    setTimeout(
                                                        () => setCategoryMenuOpen(false),
                                                        120,
                                                    );
                                                }}
                                            />

                                            {categoryMenuOpen &&
                                            safeTrim(item.draft.categoryName) ? (
                                                <div className="absolute z-30 mt-2 w-full">
                                                    <ul
                                                        className="menu bg-base-100 rounded-box shadow-xl border border-base-300 p-2"
                                                        onMouseDown={(event) =>
                                                            event.preventDefault()
                                                        }
                                                    >
                                                        {filteredCategories.length ===
                                                        0 ? (
                                                            <li>
                                                                <span className="text-sm opacity-70">
                                                                    Aucun résultat
                                                                </span>
                                                            </li>
                                                        ) : (
                                                            filteredCategories.map(
                                                                (category) => (
                                                                    <li key={category.id}>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                onCategoryChange(
                                                                                    category.name,
                                                                                );
                                                                                setCategoryMenuOpen(
                                                                                    false,
                                                                                );
                                                                            }}
                                                                        >
                                                                            <span className="font-medium">
                                                                                {
                                                                                    category.name
                                                                                }
                                                                            </span>
                                                                        </button>
                                                                    </li>
                                                                ),
                                                            )
                                                        )}
                                                        <li className="mt-1">
                                                            <button
                                                                type="button"
                                                                className="btn btn-ghost btn-sm justify-start"
                                                                onClick={() =>
                                                                    setCategoryMenuOpen(
                                                                        false,
                                                                    )
                                                                }
                                                            >
                                                                Créer “
                                                                {safeTrim(
                                                                    item.draft
                                                                        .categoryName,
                                                                )}
                                                                ”
                                                            </button>
                                                        </li>
                                                    </ul>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="form-control flex flex-col">
                                        <label className="label">
                                            <span className="label-text">Prix</span>
                                        </label>
                                        <div className="flex items-stretch gap-2 w-full min-w-0">
                                            <input
                                                type="number"
                                                min={0}
                                                step={0.01}
                                                className="input input-bordered flex-1 min-w-0"
                                                placeholder="Optionnel"
                                                value={item.draft.defaultPrice}
                                                disabled={isLoading}
                                                onChange={(event) =>
                                                    onDefaultPriceChange(
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                            <div className="join md:hidden flex-none">
                                                <button
                                                    type="button"
                                                    className="btn join-item w-10 px-0"
                                                    disabled={isLoading}
                                                    onClick={() => {
                                                        const current = Number(
                                                            item.draft.defaultPrice,
                                                        );
                                                        const safeCurrent =
                                                            Number.isFinite(current) &&
                                                            current >= 0
                                                                ? current
                                                                : 0;
                                                        const nextRaw = safeCurrent - 0.1;
                                                        const nextRounded =
                                                            Math.round(nextRaw * 100) /
                                                            100;
                                                        const next = Math.max(
                                                            0,
                                                            nextRounded,
                                                        );
                                                        onDefaultPriceChange(
                                                            String(next),
                                                        );
                                                    }}
                                                    aria-label="Diminuer le prix"
                                                >
                                                    -
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn join-item w-10 px-0"
                                                    disabled={isLoading}
                                                    onClick={() => {
                                                        const current = Number(
                                                            item.draft.defaultPrice,
                                                        );
                                                        const safeCurrent =
                                                            Number.isFinite(current) &&
                                                            current >= 0
                                                                ? current
                                                                : 0;
                                                        const nextRaw = safeCurrent + 0.1;
                                                        const nextRounded =
                                                            Math.round(nextRaw * 100) /
                                                            100;
                                                        const next = Math.max(
                                                            0,
                                                            nextRounded,
                                                        );
                                                        onDefaultPriceChange(
                                                            String(next),
                                                        );
                                                    }}
                                                    aria-label="Augmenter le prix"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-control md:col-span-2">
                                        <label className="label">
                                            <span className="label-text">
                                                Commentaire
                                            </span>
                                        </label>
                                        <textarea
                                            className="textarea textarea-bordered min-h-18 md:w-full"
                                            placeholder="Optionnel"
                                            value={item.draft.comment}
                                            disabled={isLoading}
                                            onChange={(event) =>
                                                onCommentChange(event.target.value)
                                            }
                                        />
                                    </div>

                                    <div className="form-control md:col-span-2 mt-1">
                                        <label className="label cursor-pointer justify-start gap-3">
                                            <input
                                                type="checkbox"
                                                className="checkbox"
                                                checked={item.draft.fridgeProduct}
                                                disabled={isLoading}
                                                onChange={(event) =>
                                                    onFridgeProductChange(
                                                        event.target.checked,
                                                    )
                                                }
                                            />
                                            <span className="label-text">
                                                Produit a conserver au frigo ?
                                            </span>
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="bg-base-200 rounded-box p-3 sm:p-4">
                        <h4 className="font-semibold">Ajout dans la liste</h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                            <div className="form-control md:col-span-2 flex flex-col">
                                <label className="label">
                                    <span className="label-text">Quantité</span>
                                </label>
                                <div className="flex items-stretch gap-2 w-full min-w-0">
                                    <input
                                        type="number"
                                        min={1}
                                        step={1}
                                        className="input input-bordered flex-1 min-w-0"
                                        value={item.draft.quantity}
                                        disabled={isLoading}
                                        onChange={(event) => {
                                            const parsed = Number(event.target.value);
                                            onQuantityChange(
                                                Number.isFinite(parsed) && parsed > 0
                                                    ? Math.trunc(parsed)
                                                    : 1,
                                            );
                                        }}
                                    />
                                    <div className="join md:hidden flex-none">
                                        <button
                                            type="button"
                                            className="btn join-item w-10 px-0"
                                            disabled={isLoading}
                                            onClick={() =>
                                                onQuantityChange(
                                                    Math.max(
                                                        1,
                                                        Math.trunc(
                                                            item.draft.quantity - 1,
                                                        ),
                                                    ),
                                                )
                                            }
                                            aria-label="Diminuer la quantité"
                                        >
                                            -
                                        </button>
                                        <button
                                            type="button"
                                            className="btn join-item w-10 px-0"
                                            disabled={isLoading}
                                            onClick={() =>
                                                onQuantityChange(
                                                    Math.max(
                                                        1,
                                                        Math.trunc(
                                                            item.draft.quantity + 1,
                                                        ),
                                                    ),
                                                )
                                            }
                                            aria-label="Augmenter la quantité"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="form-control mt-3 md:col-span-2">
                                <label className="label">
                                    <span className="label-text">
                                        Commentaire (Article)
                                    </span>
                                </label>
                                <textarea
                                    className="textarea textarea-bordered w-full"
                                    placeholder="Optionnel"
                                    value={item.draft.articleComment}
                                    disabled={isLoading}
                                    onChange={(event) =>
                                        onArticleCommentChange(event.target.value)
                                    }
                                />
                            </div>

                            <div className="form-control mt-3">
                                <label className="label cursor-pointer justify-start gap-3">
                                    <input
                                        type="checkbox"
                                        className="checkbox"
                                        checked={item.draft.inPromotion}
                                        disabled={isLoading}
                                        onChange={(event) =>
                                            onInPromotionChange(event.target.checked)
                                        }
                                    />
                                    <span className="label-text">
                                        Article en promotion ?
                                    </span>
                                </label>
                            </div>

                            <div className="form-control mt-3">
                                <label className="label cursor-pointer justify-start gap-3">
                                    <input
                                        type="checkbox"
                                        className="checkbox"
                                        checked={item.draft.needCoupons}
                                        disabled={isLoading}
                                        onChange={(event) =>
                                            onNeedCouponsChange(event.target.checked)
                                        }
                                    />
                                    <span className="label-text">
                                        Article nécessite un coupon ?
                                    </span>
                                </label>
                            </div>
                        </div>
                    </section>

                    <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3">
                        {isLoading ? (
                            <span className="loading loading-spinner loading-sm" />
                        ) : null}

                        {!isMatched ? (
                            <button
                                type="button"
                                className="btn btn-secondary w-full md:w-auto"
                                disabled={isLoading}
                                onClick={onAddToCatalog}
                            >
                                Ajouter au catalogue
                            </button>
                        ) : null}

                        <button
                            type="button"
                            className="btn btn-primary w-full md:w-auto"
                            disabled={isLoading}
                            onClick={onAddToList}
                        >
                            Ajouter à la liste
                        </button>
                    </div>
                </div>
            </div>

            {showDivider ? <div className="divider my-0" /> : null}
        </div>
    );
}
