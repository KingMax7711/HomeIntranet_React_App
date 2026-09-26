export type SearchableByName = {
    id: number;
    name: string;
};

export const normalizeSearchText = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[’']/g, " ")
        .replace(/[^a-z0-9\s]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const buildBigrams = (text: string) => {
    if (text.length < 2) return [text];

    const grams: string[] = [];
    for (let index = 0; index < text.length - 1; index += 1) {
        grams.push(text.slice(index, index + 2));
    }

    return grams;
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
        if (count <= 0) return;
        common += 1;
        rightCounts.set(gram, count - 1);
    });

    return (2 * common) / (leftBigrams.length + rightBigrams.length);
};

const computeNameScore = (query: string, candidate: string) => {
    if (!query || !candidate) return 0;
    if (query === candidate) return 1;

    const queryTokens = query.split(" ").filter(Boolean);
    const candidateTokens = candidate.split(" ").filter(Boolean);

    const tokenMatchCount = queryTokens.reduce((count, token) => {
        return candidateTokens.some((candidateToken) => candidateToken.includes(token))
            ? count + 1
            : count;
    }, 0);

    const tokenCoverage = tokenMatchCount / Math.max(1, queryTokens.length);

    const queryCompact = query.replace(/\s+/g, "");
    const candidateCompact = candidate.replace(/\s+/g, "");

    const inclusionScore =
        candidateCompact.includes(queryCompact) || queryCompact.includes(candidateCompact)
            ? Math.min(queryCompact.length, candidateCompact.length) /
              Math.max(queryCompact.length, candidateCompact.length)
            : 0;

    const diceScore = diceCoefficient(queryCompact, candidateCompact);

    const firstTokenBonus =
        queryTokens[0] && candidateTokens[0] === queryTokens[0] ? 0.1 : 0;

    return Math.min(
        1,
        Math.max(tokenCoverage, diceScore * 0.95, inclusionScore * 0.9) + firstTokenBonus,
    );
};

export const smartNameSearch = <T extends SearchableByName>(
    items: T[],
    query: string,
    options?: { limit?: number; minScore?: number },
): T[] => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return [];

    const minScore = options?.minScore ?? 0.34;
    const limit = options?.limit ?? 8;

    return items
        .map((item) => {
            const normalizedName = normalizeSearchText(item.name);
            const score = computeNameScore(normalizedQuery, normalizedName);

            return {
                item,
                score,
            };
        })
        .filter(({ score }) => score >= minScore)
        .sort((left, right) => {
            if (right.score !== left.score) return right.score - left.score;
            return left.item.name.localeCompare(right.item.name);
        })
        .slice(0, limit)
        .map(({ item }) => item);
};
