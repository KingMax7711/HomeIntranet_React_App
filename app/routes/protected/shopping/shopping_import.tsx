import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import { apiClient } from "~/api/apiClient";
import ImportedProductCard from "~/components/shopping_components/shopping_import_component/ImportedProductCard";
import { useShoppingListStore } from "~/stores/shopping_list";

type ProductLite = {
    id: number;
    name: string;
    default_price?: number | null;
    comment?: string | null;
    category?: string | null;
};

type CategoryLite = {
    id: number;
    name: string;
};

type ImportedItem = {
    id: number;
    sourceLine: string;
    proposedName: string;
    normalizedName: string;
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
        quantity: number;
        articleComment: string;
        inPromotion: boolean;
        needCoupons: boolean;
    };
};

type ParsedImportLine = {
    sourceLine: string;
    cleanedName: string;
    inferredInPromotion: boolean;
    inferredNeedCoupons: boolean;
    inferredArticleComment: string;
};

const endpointAllProducts = "/shopping_list_globals/all_products_lite";
const endpointAllCategories = "/shopping_list_globals/all_categories";
const endpointCreateProduct = "/shopping_list_globals/create_product_custom";
const endpointRegisterArticle = "/shopping_list_globals/register_article";

const MAX_IMPORT_CHARACTERS = 20000;
const MAX_IMPORT_ITEMS = 200;

const normalize = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
const safeTrim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const normalizeForMatch = (value: string) => {
    const singularized = value
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[’']/g, " ")
        .replace(/[^a-z0-9]+/g, " ")
        .split(" ")
        .filter(Boolean)
        .map((token) => {
            if (token.length > 3 && token.endsWith("s")) return token.slice(0, -1);
            if (token.length > 4 && token.endsWith("x")) return token.slice(0, -1);
            return token;
        });

    return singularized.join(" ").trim();
};

const cleanImportedLine = (line: string) => {
    let cleaned = line.trim();
    if (!cleaned) return "";

    cleaned = cleaned.replace(/^[-•●]\s*/, "").trim();

    if (/^voici\s+le\s+contenu\b/i.test(cleaned)) return "";

    cleaned = cleaned
        .replace(/\s+-\s*(catalogue|bon)\b.*$/i, "")
        .replace(/\s+-\s*jusqu['’]au\b.*$/i, "")
        .trim();

    return cleaned;
};

const normalizeForHint = (value: string) =>
    value
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9\s]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const inferItemHints = (line: string) => {
    const normalized = normalizeForHint(line);
    return {
        inferredNeedCoupons: /\bbon(s)?\b/.test(normalized),
        inferredInPromotion: /\bcatalogue\b|\bpromotion\b|\bpromo\b/.test(normalized),
    };
};

const extractArticleCommentFromLine = (line: string) => {
    const sanitized = line.replace(/^[-•●]\s*/, "").trim();
    if (!sanitized) return "";

    const segments = sanitized
        .split(/\s+-\s+/)
        .map((segment) => segment.trim())
        .filter(Boolean);

    const metadata = segments.slice(1).filter((segment) => {
        const normalized = normalizeForHint(segment);
        return /^(catalogue|bon)\b/.test(normalized);
    });

    return metadata.join(" • ");
};

const buildBigrams = (text: string) => {
    if (text.length < 2) return [text];
    const arr: string[] = [];
    for (let index = 0; index < text.length - 1; index += 1) {
        arr.push(text.slice(index, index + 2));
    }
    return arr;
};

const diceCoefficient = (left: string, right: string) => {
    if (!left || !right) return 0;
    if (left === right) return 1;

    const leftBigrams = buildBigrams(left);
    const rightBigrams = buildBigrams(right);
    const rightCounts = new Map<string, number>();

    rightBigrams.forEach((gram) => {
        rightCounts.set(gram, (rightCounts.get(gram) ?? 0) + 1);
    });

    let common = 0;
    leftBigrams.forEach((gram) => {
        const count = rightCounts.get(gram) ?? 0;
        if (count > 0) {
            common += 1;
            rightCounts.set(gram, count - 1);
        }
    });

    return (2 * common) / (leftBigrams.length + rightBigrams.length);
};

const scoreMatch = (leftNormalized: string, rightNormalized: string) => {
    if (!leftNormalized || !rightNormalized) return 0;
    if (leftNormalized === rightNormalized) return 1;

    const leftCompact = leftNormalized.replace(/\s+/g, "");
    const rightCompact = rightNormalized.replace(/\s+/g, "");

    let containsScore = 0;
    if (rightCompact.includes(leftCompact) || leftCompact.includes(rightCompact)) {
        containsScore =
            Math.min(leftCompact.length, rightCompact.length) /
            Math.max(leftCompact.length, rightCompact.length);
    }

    const leftTokens = new Set(leftNormalized.split(" ").filter(Boolean));
    const rightTokens = new Set(rightNormalized.split(" ").filter(Boolean));

    let commonTokens = 0;
    leftTokens.forEach((token) => {
        if (rightTokens.has(token)) commonTokens += 1;
    });

    const tokenScore =
        commonTokens / Math.max(1, Math.max(leftTokens.size, rightTokens.size));
    const diceScore = diceCoefficient(leftCompact, rightCompact);

    const leftFirst = leftNormalized.split(" ")[0] ?? "";
    const rightFirst = rightNormalized.split(" ")[0] ?? "";
    const firstTokenBonus = leftFirst && leftFirst === rightFirst ? 0.08 : 0;

    return Math.min(
        1,
        Math.max(tokenScore, diceScore * 0.92, containsScore * 0.9) + firstTokenBonus,
    );
};

const getAutoMatchThreshold = (tokenCount: number) => (tokenCount <= 1 ? 0.84 : 0.72);

const getSuggestionThreshold = (tokenCount: number) => (tokenCount <= 1 ? 0.62 : 0.48);

const getValidProductId = (product: ProductLite | null) => {
    if (!product) return null;
    if (typeof product.id !== "number") return null;
    if (!Number.isInteger(product.id) || product.id <= 0) return null;
    return product.id;
};

const parseImportText = (input: string) => {
    const seen = new Set<string>();
    const uniqueLines: ParsedImportLine[] = [];

    input.split(/\r?\n/).forEach((rawLine) => {
        const cleanedName = cleanImportedLine(rawLine);
        if (!cleanedName) return;

        const key = normalizeForMatch(cleanedName);
        if (!key || seen.has(key)) return;

        seen.add(key);
        const hints = inferItemHints(rawLine);

        uniqueLines.push({
            sourceLine: rawLine.trim(),
            cleanedName,
            inferredInPromotion: hints.inferredInPromotion,
            inferredNeedCoupons: hints.inferredNeedCoupons,
            inferredArticleComment: extractArticleCommentFromLine(rawLine),
        });
    });

    return uniqueLines;
};

export function meta() {
    return [
        { title: "NestBoard - Importations d'articles" },
        { name: "description", content: "Gestion des importations d'articles" },
    ];
}

export default function ShoppingImport() {
    const shoppingListId = useShoppingListStore((state) => state.view?.id);
    const forceSyncShoppingList = useShoppingListStore((state) => state.forceSync);

    const [importText, setImportText] = useState("");
    const [products, setProducts] = useState<ProductLite[]>([]);
    const [categories, setCategories] = useState<CategoryLite[]>([]);
    const [refetchData, setRefetchData] = useState(0);
    const [productsLoading, setProductsLoading] = useState(true);
    const [importedItems, setImportedItems] = useState<ImportedItem[]>([]);
    const [pendingByItemId, setPendingByItemId] = useState<
        Record<number, "catalog" | "list">
    >({});
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);

    const hasContent = useMemo(() => importText.trim().length > 0, [importText]);

    useEffect(() => {
        const controller = new AbortController();

        (async () => {
            setProductsLoading(true);
            try {
                const [productsResponse, categoriesResponse] = await Promise.all([
                    apiClient.get<ProductLite[]>(endpointAllProducts, {
                        signal: controller.signal,
                    }),
                    apiClient.get<CategoryLite[]>(endpointAllCategories, {
                        signal: controller.signal,
                    }),
                ]);

                setProducts(
                    Array.isArray(productsResponse.data) ? productsResponse.data : [],
                );
                setCategories(
                    Array.isArray(categoriesResponse.data) ? categoriesResponse.data : [],
                );
            } catch (error) {
                if (axios.isAxiosError(error) && error.code === "ERR_CANCELED") return;
                console.error("Erreur chargement catalogue produits:", error);
                setProducts([]);
                setCategories([]);
            } finally {
                setProductsLoading(false);
            }
        })();

        return () => controller.abort();
    }, [refetchData]);

    const findBestProduct = (normalizedName: string) => {
        let bestProduct: ProductLite | null = null;
        let bestScore = 0;

        products.forEach((product) => {
            const candidate = normalizeForMatch(product.name ?? "");
            if (!candidate) return;

            const score = scoreMatch(normalizedName, candidate);
            if (score > bestScore) {
                bestScore = score;
                bestProduct = product;
            }
        });

        const tokenCount = normalizedName.split(" ").filter(Boolean).length;
        const autoThreshold = getAutoMatchThreshold(tokenCount);
        const suggestionThreshold = getSuggestionThreshold(tokenCount);

        if (bestScore >= autoThreshold) {
            return {
                product: bestProduct,
                matchOrigin: "auto" as const,
                score: bestScore,
                suggestedProduct: null,
                suggestionScore: 0,
            };
        }

        if (bestScore >= suggestionThreshold) {
            return {
                product: null,
                matchOrigin: "none" as const,
                score: bestScore,
                suggestedProduct: bestProduct,
                suggestionScore: bestScore,
            };
        }

        return {
            product: null,
            matchOrigin: "none" as const,
            score: bestScore,
            suggestedProduct: null,
            suggestionScore: 0,
        };
    };

    const updateDraft = <K extends keyof ImportedItem["draft"]>(
        itemId: number,
        field: K,
        value: ImportedItem["draft"][K],
    ) => {
        setImportedItems((current) =>
            current.map((item) =>
                item.id === itemId
                    ? { ...item, draft: { ...item.draft, [field]: value } }
                    : item,
            ),
        );
    };

    const applySuggestedProduct = (itemId: number) => {
        setImportedItems((current) =>
            current.map((item) => {
                if (item.id !== itemId || !item.suggestedProduct) return item;

                return {
                    ...item,
                    matchedProduct: item.suggestedProduct,
                    matchOrigin: "suggestion",
                    matchScore: item.suggestionScore,
                    suggestedProduct: null,
                    suggestionScore: 0,
                };
            }),
        );
    };

    const rejectAutoMatchedProduct = (itemId: number) => {
        setImportedItems((current) =>
            current.map((item) => {
                if (item.id !== itemId || !item.matchedProduct) return item;

                return {
                    ...item,
                    matchedProduct: null,
                    matchOrigin: "none",
                    suggestedProduct: item.matchedProduct,
                    suggestionScore: item.matchScore,
                    matchScore: 0,
                };
            }),
        );
    };

    const ignoreSuggestedProduct = (itemId: number) => {
        setImportedItems((current) =>
            current.map((item) => {
                if (item.id !== itemId) return item;
                return {
                    ...item,
                    suggestedProduct: null,
                    suggestionScore: 0,
                };
            }),
        );
    };

    const handleAddToCatalog = async (item: ImportedItem) => {
        if (pendingByItemId[item.id]) return;

        setActionError(null);
        setActionSuccess(null);

        const name = safeTrim(item.draft.name) || safeTrim(item.proposedName);
        if (!name) {
            setActionError("Le nom du produit est requis.");
            return;
        }

        setPendingByItemId((current) => ({ ...current, [item.id]: "catalog" }));

        const categoryTrim = safeTrim(item.draft.categoryName);
        const resolvedCategory = categoryTrim
            ? categories.find(
                  (category) => normalize(category.name) === normalize(categoryTrim),
              )
            : undefined;
        const categoryPayload = categoryTrim
            ? resolvedCategory
                ? resolvedCategory.id
                : { name: categoryTrim }
            : null;

        const payload: Record<string, unknown> = {
            name,
            category_id: categoryPayload,
            comment: safeTrim(item.draft.comment),
        };

        const parsedDefaultPrice = Number(item.draft.defaultPrice);
        if (Number.isFinite(parsedDefaultPrice) && parsedDefaultPrice >= 0) {
            payload.default_price = parsedDefaultPrice;
        }

        try {
            const response = await apiClient.post(endpointCreateProduct, payload);
            const responseData = response.data as ProductLite | null | undefined;
            const createdId =
                typeof responseData?.id === "number" ? responseData.id : null;

            setImportedItems((current) =>
                current.map((currentItem) => {
                    if (currentItem.id !== item.id) return currentItem;

                    return {
                        ...currentItem,
                        matchedProduct: {
                            id:
                                createdId ??
                                currentItem.matchedProduct?.id ??
                                -currentItem.id,
                            name,
                            category: categoryTrim || null,
                            default_price:
                                Number.isFinite(parsedDefaultPrice) &&
                                parsedDefaultPrice >= 0
                                    ? parsedDefaultPrice
                                    : null,
                            comment: safeTrim(item.draft.comment) || null,
                        },
                        matchOrigin: "catalog",
                        suggestedProduct: null,
                        suggestionScore: 0,
                    };
                }),
            );

            setRefetchData((value) => value + 1);
            setActionSuccess(`Produit “${name}” ajouté au catalogue.`);
        } catch (error) {
            const detail = axios.isAxiosError(error)
                ? (error.response?.data as { detail?: unknown } | undefined)?.detail
                : undefined;

            setActionError(
                typeof detail === "string" && detail.trim()
                    ? detail
                    : "Impossible d’ajouter le produit au catalogue.",
            );
        } finally {
            setPendingByItemId((current) => {
                const next = { ...current };
                delete next[item.id];
                return next;
            });
        }
    };

    const handleAddToList = async (item: ImportedItem) => {
        if (pendingByItemId[item.id]) return;

        setActionError(null);
        setActionSuccess(null);

        if (!shoppingListId) {
            setActionError("Aucune liste de courses active.");
            return;
        }

        const name =
            safeTrim(item.draft.name) ||
            safeTrim(item.proposedName) ||
            safeTrim(item.matchedProduct?.name);
        if (!name) {
            setActionError("Le nom du produit est requis pour l’ajouter à la liste.");
            return;
        }

        setPendingByItemId((current) => ({ ...current, [item.id]: "list" }));

        const categoryTrim = safeTrim(item.draft.categoryName);
        const resolvedCategory = categoryTrim
            ? categories.find(
                  (category) => normalize(category.name) === normalize(categoryTrim),
              )
            : undefined;
        const categoryPayload = categoryTrim
            ? resolvedCategory
                ? resolvedCategory.id
                : { name: categoryTrim }
            : null;

        const parsedDefaultPrice = Number(item.draft.defaultPrice);

        const matchedProductId = getValidProductId(item.matchedProduct);

        const productPayload = matchedProductId
            ? matchedProductId
            : {
                  name,
                  category_id: categoryPayload,
                  default_price:
                      Number.isFinite(parsedDefaultPrice) && parsedDefaultPrice >= 0
                          ? parsedDefaultPrice
                          : undefined,
                  comment: safeTrim(item.draft.comment) || undefined,
              };

        const payload = {
            shopping_list: shoppingListId,
            in_promotion: !!item.draft.inPromotion,
            need_coupons: !!item.draft.needCoupons,
            quantity:
                Number.isFinite(item.draft.quantity) && item.draft.quantity > 0
                    ? Math.trunc(item.draft.quantity)
                    : 1,
            product: productPayload,
            comment: safeTrim(item.draft.articleComment) || null,
        };

        try {
            await apiClient.post(endpointRegisterArticle, payload);
            setImportedItems((current) =>
                current.filter((currentItem) => currentItem.id !== item.id),
            );
            setActionSuccess(
                `Article “${name || item.matchedProduct?.name}” ajouté à la liste.`,
            );
            await forceSyncShoppingList().catch(() => null);
        } catch (error) {
            const detail = axios.isAxiosError(error)
                ? (error.response?.data as { detail?: unknown } | undefined)?.detail
                : undefined;

            setActionError(
                typeof detail === "string" && detail.trim()
                    ? detail
                    : "Impossible d’ajouter l’article à la liste.",
            );
        } finally {
            setPendingByItemId((current) => {
                const next = { ...current };
                delete next[item.id];
                return next;
            });
        }
    };

    const handleImport = () => {
        setActionError(null);
        setActionSuccess(null);

        if (importText.length > MAX_IMPORT_CHARACTERS) {
            setActionError(
                `Import trop volumineux (max ${MAX_IMPORT_CHARACTERS} caractères).`,
            );
            return;
        }

        const parsedLines = parseImportText(importText);

        if (parsedLines.length > MAX_IMPORT_ITEMS) {
            setActionError(`Import trop volumineux (max ${MAX_IMPORT_ITEMS} articles).`);
            return;
        }

        const nextItems: ImportedItem[] = parsedLines.map((entry, index) => {
            const normalizedName = normalizeForMatch(entry.cleanedName);
            const { product, matchOrigin, score, suggestedProduct, suggestionScore } =
                findBestProduct(normalizedName);

            return {
                id: Date.now() + index,
                sourceLine: entry.sourceLine,
                proposedName: entry.cleanedName,
                normalizedName,
                matchedProduct: product,
                matchOrigin,
                matchScore: score,
                suggestedProduct,
                suggestionScore,
                draft: {
                    name: entry.cleanedName,
                    categoryName: "",
                    defaultPrice: "",
                    comment: "",
                    quantity: 1,
                    articleComment: entry.inferredArticleComment,
                    inPromotion: entry.inferredInPromotion,
                    needCoupons: entry.inferredNeedCoupons,
                },
            };
        });
        setImportedItems(nextItems);
    };

    const handlePasteFromClipboard = async () => {
        setActionError(null);
        setActionSuccess(null);

        if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
            setActionError("Collage non disponible dans ce navigateur.");
            return;
        }

        try {
            const clipboardText = await navigator.clipboard.readText();
            const nextText = clipboardText ?? "";
            setImportText(nextText);
            setActionSuccess("Contenu du presse-papiers collé.");
        } catch {
            setActionError(
                "Impossible d’accéder au presse-papiers. Vérifie les permissions du navigateur.",
            );
        }
    };

    const matchedCount = importedItems.filter((item) => item.matchedProduct).length;
    const newCount = importedItems.length - matchedCount;

    return (
        <div className="w-full flex flex-col gap-5 sm:px-3 md:px-4 md:max-w-3/4 mx-auto pt-5 items-center overflow-x-hidden">
            <div className="card w-full md:w-3/5 bg-base-300 shadow-xl">
                <div className="card-body gap-4">
                    <h2 className="card-title">Importer des articles</h2>
                    <p className="text-sm opacity-70">
                        Collez ici votre liste d'articles (un article par ligne, ou format
                        Leclerc).
                    </p>

                    <textarea
                        className="textarea textarea-bordered min-h-40 w-full"
                        placeholder="Exemple :&#10;Tomates&#10;Lait demi-écrémé&#10;Pain complet"
                        value={importText}
                        onChange={(event) => setImportText(event.target.value)}
                    />

                    <div className="card-actions justify-end gap-2">
                        <button
                            type="button"
                            className="btn w-full sm:w-auto"
                            disabled={productsLoading}
                            onClick={() => {
                                void handlePasteFromClipboard();
                            }}
                        >
                            Coller
                        </button>

                        <button
                            type="button"
                            className="btn btn-primary w-full sm:w-auto"
                            disabled={!hasContent || productsLoading}
                            onClick={handleImport}
                        >
                            {productsLoading
                                ? "Chargement du catalogue..."
                                : "Importer les articles"}
                        </button>
                    </div>

                    {actionError ? (
                        <div className="alert alert-error mt-2">
                            <span>{actionError}</span>
                        </div>
                    ) : null}

                    {actionSuccess ? (
                        <div className="alert alert-success mt-2">
                            <span>{actionSuccess}</span>
                        </div>
                    ) : null}
                </div>
            </div>

            {importedItems.length > 0 ? (
                <>
                    <div className="card w-full md:w-3/5 bg-base-300 shadow-xl">
                        <div className="card-body gap-2">
                            <h2 className="card-title">Résultat de l'import</h2>
                            <p className="text-sm opacity-70">
                                {importedItems.length} article(s) détecté(s) •{" "}
                                {matchedCount} lié(s) au catalogue • {newCount} à créer
                            </p>
                        </div>
                    </div>

                    <div className="w-full flex flex-col gap-6 md:w-3/5">
                        {importedItems.map((item) => {
                            return (
                                <ImportedProductCard
                                    key={item.id}
                                    item={item}
                                    categories={categories}
                                    showDivider={false}
                                    isLoading={!!pendingByItemId[item.id]}
                                    canRejectAutoMatch={
                                        !!item.matchedProduct &&
                                        item.matchOrigin === "auto"
                                    }
                                    onUseSuggestion={() => applySuggestedProduct(item.id)}
                                    onIgnoreSuggestion={() =>
                                        ignoreSuggestedProduct(item.id)
                                    }
                                    onRejectAutoMatch={() =>
                                        rejectAutoMatchedProduct(item.id)
                                    }
                                    onNameChange={(value) =>
                                        updateDraft(item.id, "name", value)
                                    }
                                    onCategoryChange={(value) =>
                                        updateDraft(item.id, "categoryName", value)
                                    }
                                    onDefaultPriceChange={(value) =>
                                        updateDraft(item.id, "defaultPrice", value)
                                    }
                                    onCommentChange={(value) =>
                                        updateDraft(item.id, "comment", value)
                                    }
                                    onQuantityChange={(value) =>
                                        updateDraft(item.id, "quantity", value)
                                    }
                                    onArticleCommentChange={(value) =>
                                        updateDraft(item.id, "articleComment", value)
                                    }
                                    onInPromotionChange={(checked) =>
                                        updateDraft(item.id, "inPromotion", checked)
                                    }
                                    onNeedCouponsChange={(checked) =>
                                        updateDraft(item.id, "needCoupons", checked)
                                    }
                                    onAddToCatalog={() => {
                                        void handleAddToCatalog(item);
                                    }}
                                    onAddToList={() => {
                                        void handleAddToList(item);
                                    }}
                                />
                            );
                        })}
                    </div>
                </>
            ) : null}
        </div>
    );
}
