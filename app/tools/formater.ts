export function capitalizeAllWords(str: string) {
    return str
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

export function capitalizeFirstLetter(str: string) {
    if (str.length === 0) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function formatDate(dateStr: string) {
    const trimmed = (dateStr ?? "").trim();

    // Cas fréquent côté API: date ISO sans heure (YYYY-MM-DD).
    // `new Date("YYYY-MM-DD")` est interprété en UTC et peut décaler le jour
    // en affichage local; on reconstruit une date locale.
    const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(trimmed);
    const date = m
        ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
        : new Date(trimmed);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

export function formatDateTime(dateStr: string) {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("fr-FR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function formatCurrencyEUR(value: number) {
    const safe = Number.isFinite(value) ? value : 0;
    return new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 2,
    }).format(safe);
}

export function sortByCustomSortIndex<T extends { custom_sort_index?: number | null }>(
    items: T[],
): T[] {
    const decorated = items.map((item, originalPosition) => {
        const raw = item.custom_sort_index;
        const idx =
            typeof raw === "number" && Number.isFinite(raw)
                ? raw
                : Number.NEGATIVE_INFINITY;
        return { item, idx, originalPosition };
    });

    decorated.sort((a, b) => {
        if (a.idx !== b.idx) return a.idx - b.idx;
        return a.originalPosition - b.originalPosition;
    });

    return decorated.map((d) => d.item);
}
