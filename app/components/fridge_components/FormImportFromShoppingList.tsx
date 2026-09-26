import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "~/api/apiClient";
import type {
    FridgeItemCreatePayload,
    FridgeRecap,
    ShoppingListViewForFridge,
} from "~/types/fridges";
import { capitalizeAllWords, formatDate } from "~/tools/formater";

type ImportDraftItem = {
    shoppingListItemId: number;
    productId: number | null;
    productName: string;
    initialQuantity: number;
    quantity: number;
    expirationDate: string | null;
    comment: string;
    targetFridgeId: number;
};

type FridgeExistingProducts = {
    productIds: Set<number>;
    productNames: Set<string>;
};

type Props = {
    fridges: FridgeRecap[];
    refreshToken: number;
    onImported?: (fridgeIds: number[]) => void | Promise<void>;
    onCloseRequested?: () => void;
};

const endpointRecapForFridge = "/shopping_list_view/last_shopping_list/recap_for_fridge";
const endpointMassiveCreate = "/fridge_items/massive_create";

const normalizeName = (value: unknown) =>
    (typeof value === "string" ? value : "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

const safeText = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const isValidDateInput = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const toSafeInt = (value: unknown, fallback = 0) => {
    if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
    if (typeof value === "string") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return Math.trunc(parsed);
    }
    return fallback;
};

const getDefaultFridgeId = (fridges: FridgeRecap[]) => {
    const mainFridge = fridges.find((fridge) => fridge.fridge_main);
    if (mainFridge) return mainFridge.fridge_id;
    return fridges[0]?.fridge_id ?? 0;
};

const hasProductInFridge = (
    existingByFridge: Map<number, FridgeExistingProducts>,
    fridgeId: number,
    productId: number | null,
    productName: string,
) => {
    const bucket = existingByFridge.get(fridgeId);
    if (!bucket) return false;

    if (
        typeof productId === "number" &&
        productId > 0 &&
        bucket.productIds.has(productId)
    ) {
        return true;
    }

    const normalizedName = normalizeName(productName);
    if (!normalizedName) return false;
    return bucket.productNames.has(normalizedName);
};

export default function FormImportFromShoppingList({
    fridges,
    refreshToken,
    onImported,
    onCloseRequested,
}: Props) {
    const formRef = useRef<HTMLDivElement | null>(null);

    const [shoppingListId, setShoppingListId] = useState<number | null>(null);
    const [shoppingListClosedAt, setShoppingListClosedAt] = useState<string | null>(null);
    const [items, setItems] = useState<ImportDraftItem[]>([]);
    const [existingByFridge, setExistingByFridge] = useState<
        Map<number, FridgeExistingProducts>
    >(new Map());

    const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
    const [loadError, setLoadError] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const closeDialog = () => {
        if (onCloseRequested) {
            onCloseRequested();
            return;
        }
        const dialog = formRef.current?.closest("dialog") as HTMLDialogElement | null;
        dialog?.close();
    };

    const hydrateExistingProducts = async () => {
        if (fridges.length === 0) return new Map<number, FridgeExistingProducts>();

        const entries = await Promise.all(
            fridges.map(async (fridge) => {
                const response = await apiClient.get<unknown>(
                    `/fridge_items_view/fridge_detailed/${fridge.fridge_id}`,
                );
                const payload = (response.data ?? {}) as any;
                const rawItems = Array.isArray(payload) ? payload : payload.items;

                const productIds = new Set<number>();
                const productNames = new Set<string>();

                if (Array.isArray(rawItems)) {
                    rawItems.forEach((rawItem) => {
                        const item = (rawItem ?? {}) as any;
                        const productId = toSafeInt(
                            item.product?.id ?? item.product_id,
                            0,
                        );
                        if (productId > 0) productIds.add(productId);

                        const productName =
                            safeText(item.product?.name) || safeText(item.product_name);
                        const normalized = normalizeName(productName);
                        if (normalized) productNames.add(normalized);
                    });
                }

                return [fridge.fridge_id, { productIds, productNames }] as const;
            }),
        );

        return new Map<number, FridgeExistingProducts>(entries);
    };

    const loadImportData = async () => {
        setStatus("loading");
        setLoadError(null);
        setSubmitError(null);

        if (fridges.length === 0) {
            setShoppingListId(null);
            setShoppingListClosedAt(null);
            setItems([]);
            setExistingByFridge(new Map());
            setStatus("ready");
            return;
        }

        try {
            const [recapResponse, existingMap] = await Promise.all([
                apiClient.get<ShoppingListViewForFridge>(endpointRecapForFridge),
                hydrateExistingProducts(),
            ]);

            const recap = (recapResponse.data ?? {
                id: 0,
                closed_at: null,
                items: [],
            }) as ShoppingListViewForFridge;

            const defaultFridgeId = getDefaultFridgeId(fridges);
            const nextItems: ImportDraftItem[] = (
                Array.isArray(recap.items) ? recap.items : []
            )
                .map((item, index) => {
                    const productName = safeText(item.product_name) || "Produit";
                    const productId =
                        typeof item.product_id === "number" &&
                        Number.isFinite(item.product_id)
                            ? item.product_id
                            : null;

                    const quantity = Math.max(1, toSafeInt(item.quantity, 1));

                    return {
                        shoppingListItemId: toSafeInt(item.id, index + 1),
                        productId,
                        productName,
                        initialQuantity: quantity,
                        quantity,
                        expirationDate: "",
                        comment: "",
                        targetFridgeId: defaultFridgeId,
                    };
                })
                .sort((a, b) => a.productName.localeCompare(b.productName));

            setShoppingListId(toSafeInt(recap.id, 0));
            setShoppingListClosedAt(
                typeof recap.closed_at === "string" && recap.closed_at.trim()
                    ? recap.closed_at
                    : null,
            );
            setExistingByFridge(existingMap);
            setItems(nextItems);
            setStatus("ready");
        } catch (error) {
            const detail = axios.isAxiosError(error)
                ? (error.response?.data as any)?.detail
                : undefined;
            setLoadError(
                typeof detail === "string" && detail.trim()
                    ? detail
                    : "Impossible de charger les produits de la dernière liste.",
            );
            setStatus("error");
        }
    };

    useEffect(() => {
        if (refreshToken <= 0) return;
        void loadImportData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshToken]);

    const selectedCount = items.length;
    const totalQuantity = useMemo(
        () => items.reduce((acc, item) => acc + item.quantity, 0),
        [items],
    );

    const summaryLabel = useMemo(() => {
        const articleLabel = selectedCount > 1 ? "articles" : "article";
        const unitLabel = totalQuantity > 1 ? "unités" : "unité";
        return `${selectedCount} ${articleLabel} · ${totalQuantity} ${unitLabel}`;
    }, [selectedCount, totalQuantity]);

    const updateItem = (
        shoppingListItemId: number,
        updater: (current: ImportDraftItem) => ImportDraftItem,
    ) => {
        setItems((current) =>
            current.map((item) =>
                item.shoppingListItemId === shoppingListItemId ? updater(item) : item,
            ),
        );
    };

    const handleSubmitImport = async () => {
        setSubmitError(null);

        if (items.length === 0) {
            setSubmitError("Aucun produit sélectionné pour l'importation.");
            return;
        }

        const payload: FridgeItemCreatePayload[] = items.map((item) => ({
            product: item.productId ?? 0,
            fridge_id: item.targetFridgeId,
            quantity: Math.max(1, Math.trunc(item.quantity)),
            expiration_date: safeText(item.expirationDate) || null,
            source: "auto",
            comment: safeText(item.comment) || null,
        }));

        if (payload.some((entry) => !entry.product || entry.product <= 0)) {
            setSubmitError("Certains produits n'ont pas d'identifiant valide.");
            return;
        }

        if (payload.some((entry) => !entry.fridge_id || entry.fridge_id <= 0)) {
            setSubmitError("Certains frigos de destination ne sont pas valides.");
            return;
        }

        if (
            payload.some(
                (entry) =>
                    typeof entry.expiration_date === "string" &&
                    entry.expiration_date.length > 0 &&
                    !isValidDateInput(entry.expiration_date),
            )
        ) {
            setSubmitError("La date de péremption doit être au format AAAA-MM-JJ.");
            return;
        }

        setIsSubmitting(true);
        try {
            await apiClient.post(endpointMassiveCreate, payload);
            const impactedFridgeIds = Array.from(
                new Set(items.map((item) => item.targetFridgeId)),
            );
            await onImported?.(impactedFridgeIds);
            closeDialog();
        } catch (error) {
            const detail = axios.isAxiosError(error)
                ? (error.response?.data as any)?.detail
                : undefined;
            setSubmitError(
                typeof detail === "string" && detail.trim()
                    ? detail
                    : "Impossible de procéder à l'importation.",
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div ref={formRef} className="px-2 pb-1">
            <h2 className="text-xl font-bold text-center pb-1">Import frigo</h2>
            <p className="text-sm text-center opacity-75 pb-3 sm:pb-4">
                Ajuste les lignes puis importe en lot dans le frigo de ton choix.
            </p>

            {status === "loading" ? (
                <div className="rounded-box border border-base-content/15 bg-base-200 px-4 py-3 flex items-center gap-2 text-sm">
                    <span className="loading loading-spinner loading-sm" />
                    Chargement de la dernière liste de courses...
                </div>
            ) : null}

            {status === "error" ? (
                <div className="alert alert-error alert-soft">
                    <span>{loadError ?? "Erreur de chargement."}</span>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        onClick={() => {
                            void loadImportData();
                        }}
                    >
                        Réessayer
                    </button>
                </div>
            ) : null}

            {status === "ready" && items.length === 0 ? (
                <div className="rounded-box border border-dashed border-base-content/20 bg-base-200 px-4 py-4">
                    <p className="text-sm opacity-80">
                        Aucun produit frigo trouvé dans la dernière liste de courses.
                    </p>
                </div>
            ) : null}

            {status === "ready" && items.length > 0 ? (
                <>
                    <section className="bg-base-100 border border-base-content/15 rounded-box shadow-sm p-3 sm:p-4 mb-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="badge badge-outline badge-primary">
                                {summaryLabel}
                            </span>
                            {shoppingListClosedAt ? (
                                <span className="text-sm opacity-80">
                                    Liste du {formatDate(shoppingListClosedAt)}
                                </span>
                            ) : shoppingListId ? (
                                <span className="text-sm opacity-80">
                                    Liste #{shoppingListId}
                                </span>
                            ) : (
                                <span className="text-sm opacity-70">
                                    Dernière liste terminée
                                </span>
                            )}
                        </div>
                    </section>

                    <div className="grid grid-cols-1 gap-3 max-h-[50dvh] overflow-y-auto pr-1">
                        {items.map((item) => {
                            const alreadyInTarget = hasProductInFridge(
                                existingByFridge,
                                item.targetFridgeId,
                                item.productId,
                                item.productName,
                            );

                            return (
                                <section
                                    key={item.shoppingListItemId}
                                    className="bg-base-100 border border-base-content/15 rounded-box shadow-sm p-3 sm:p-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <h3 className="text-lg font-semibold truncate">
                                                {capitalizeAllWords(item.productName)}
                                            </h3>
                                            <p className="text-xs opacity-70 mt-1">
                                                Acheté: {item.initialQuantity}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <span
                                                className={`badge badge-outline ${
                                                    alreadyInTarget
                                                        ? "badge-warning"
                                                        : "badge-success"
                                                }`}
                                            >
                                                {alreadyInTarget
                                                    ? "Déjà présent"
                                                    : "Nouveau"}
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-xs btn-outline btn-error"
                                                onClick={() => {
                                                    setItems((current) =>
                                                        current.filter(
                                                            (entry) =>
                                                                entry.shoppingListItemId !==
                                                                item.shoppingListItemId,
                                                        ),
                                                    );
                                                }}
                                                disabled={isSubmitting}
                                            >
                                                Retirer
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start mt-3">
                                        <div className="form-control w-full">
                                            <label className="label pb-1 justify-start">
                                                <span className="label-text">
                                                    Quantité
                                                </span>
                                            </label>
                                            <div className="flex items-stretch gap-2">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    step={1}
                                                    className="input input-bordered w-full"
                                                    value={item.quantity}
                                                    onChange={(event) => {
                                                        const parsed = Number(
                                                            event.target.value,
                                                        );
                                                        updateItem(
                                                            item.shoppingListItemId,
                                                            (current) => ({
                                                                ...current,
                                                                quantity:
                                                                    Number.isFinite(
                                                                        parsed,
                                                                    ) && parsed > 0
                                                                        ? Math.trunc(
                                                                              parsed,
                                                                          )
                                                                        : 1,
                                                            }),
                                                        );
                                                    }}
                                                    disabled={isSubmitting}
                                                />
                                                <div className="join shrink-0">
                                                    <button
                                                        type="button"
                                                        className="btn join-item"
                                                        onClick={() => {
                                                            updateItem(
                                                                item.shoppingListItemId,
                                                                (current) => ({
                                                                    ...current,
                                                                    quantity: Math.max(
                                                                        1,
                                                                        current.quantity -
                                                                            1,
                                                                    ),
                                                                }),
                                                            );
                                                        }}
                                                        disabled={isSubmitting}
                                                        aria-label="Diminuer la quantité"
                                                    >
                                                        -
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn join-item"
                                                        onClick={() => {
                                                            updateItem(
                                                                item.shoppingListItemId,
                                                                (current) => ({
                                                                    ...current,
                                                                    quantity:
                                                                        current.quantity +
                                                                        1,
                                                                }),
                                                            );
                                                        }}
                                                        disabled={isSubmitting}
                                                        aria-label="Augmenter la quantité"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="form-control w-full">
                                            <label className="label pb-1 justify-start">
                                                <span className="label-text">
                                                    Frigo de destination
                                                </span>
                                            </label>
                                            <select
                                                className="select select-bordered w-full"
                                                value={item.targetFridgeId}
                                                onChange={(event) => {
                                                    updateItem(
                                                        item.shoppingListItemId,
                                                        (current) => ({
                                                            ...current,
                                                            targetFridgeId: toSafeInt(
                                                                event.target.value,
                                                                current.targetFridgeId,
                                                            ),
                                                        }),
                                                    );
                                                }}
                                                disabled={isSubmitting}
                                            >
                                                {fridges.map((fridge) => (
                                                    <option
                                                        key={fridge.fridge_id}
                                                        value={fridge.fridge_id}
                                                    >
                                                        {fridge.fridge_name}
                                                        {fridge.fridge_main
                                                            ? " (Principal)"
                                                            : ""}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="form-control w-full">
                                            <label className="label pb-1 justify-start">
                                                <span className="label-text">
                                                    Date de péremption
                                                </span>
                                            </label>
                                            <input
                                                type="date"
                                                className="input input-bordered w-full"
                                                value={item.expirationDate}
                                                onChange={(event) => {
                                                    updateItem(
                                                        item.shoppingListItemId,
                                                        (current) => ({
                                                            ...current,
                                                            expirationDate:
                                                                event.target.value,
                                                        }),
                                                    );
                                                }}
                                                disabled={isSubmitting}
                                            />
                                        </div>

                                        <div className="form-control w-full md:col-span-2">
                                            <label className="label pb-1 justify-start">
                                                <span className="label-text">
                                                    Commentaire
                                                </span>
                                            </label>
                                            <textarea
                                                className="textarea textarea-bordered w-full min-h-20"
                                                placeholder="Optionnel"
                                                value={item.comment}
                                                onChange={(event) => {
                                                    updateItem(
                                                        item.shoppingListItemId,
                                                        (current) => ({
                                                            ...current,
                                                            comment: event.target.value,
                                                        }),
                                                    );
                                                }}
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                </>
            ) : null}

            {submitError ? (
                <div className="alert alert-error alert-soft mt-3">
                    <span>{submitError}</span>
                </div>
            ) : null}

            <div className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
                {isSubmitting ? (
                    <span className="loading loading-spinner loading-sm" />
                ) : null}
                <button
                    type="button"
                    className="btn btn-ghost w-full sm:w-auto"
                    onClick={closeDialog}
                    disabled={isSubmitting}
                >
                    Annuler
                </button>
                <button
                    type="button"
                    className="btn btn-primary w-full sm:w-auto"
                    onClick={() => {
                        void handleSubmitImport();
                    }}
                    disabled={isSubmitting || status !== "ready" || items.length === 0}
                >
                    Procéder à l'importation
                </button>
            </div>
        </div>
    );
}
