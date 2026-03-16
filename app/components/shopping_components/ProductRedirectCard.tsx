import { apiClient } from "~/api/apiClient";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

export default function ProductRedirectCard() {
    const [totalProducts, setTotalProducts] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [refreshIndex, setRefreshIndex] = useState(0);

    const [totalCategories, setTotalCategories] = useState<number | null>(null);
    const [loadingCategories, setLoadingCategories] = useState(false);
    const [refreshCategoriesIndex, setRefreshCategoriesIndex] = useState(0);

    const [totalMalls, setTotalMalls] = useState<number | null>(null);
    const [loadingMalls, setLoadingMalls] = useState(false);
    const [refreshMallsIndex, setRefreshMallsIndex] = useState(0);

    const [totalRecurrences, setTotalRecurrences] = useState<number | null>(null);
    const [loadingRecurrences, setLoadingRecurrences] = useState(false);
    const [refreshRecurrencesIndex, setRefreshRecurrencesIndex] = useState(0);

    const navigate = useNavigate();

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);

        (async () => {
            try {
                const r = await apiClient.get("/products/total", {
                    signal: controller.signal,
                });
                setTotalProducts(r.data);
            } catch (e) {
                setTotalProducts(null);
            } finally {
                setLoading(false);
            }
        })();

        return () => controller.abort();
    }, [refreshIndex]);

    useEffect(() => {
        const controller = new AbortController();
        setLoadingMalls(true);

        (async () => {
            try {
                const r = await apiClient.get("/malls/all", {
                    signal: controller.signal,
                });
                setTotalMalls(Array.isArray(r.data) ? r.data.length : null);
            } catch (e) {
                setTotalMalls(null);
            } finally {
                setLoadingMalls(false);
            }
        })();

        return () => controller.abort();
    }, [refreshMallsIndex]);

    useEffect(() => {
        const controller = new AbortController();
        setLoadingCategories(true);

        (async () => {
            try {
                const r = await apiClient.get("/categories/total", {
                    signal: controller.signal,
                });
                setTotalCategories(r.data);
            } catch (e) {
                setTotalCategories(null);
            } finally {
                setLoadingCategories(false);
            }
        })();

        return () => controller.abort();
    }, [refreshCategoriesIndex]);

    useEffect(() => {
        const controller = new AbortController();
        setLoadingRecurrences(true);

        (async () => {
            try {
                const r = await apiClient.get("/product_recurrences/all", {
                    signal: controller.signal,
                });
                setTotalRecurrences(Array.isArray(r.data) ? r.data.length : null);
            } catch (e) {
                setTotalRecurrences(null);
            } finally {
                setLoadingRecurrences(false);
            }
        })();

        return () => controller.abort();
    }, [refreshRecurrencesIndex]);

    return (
        <div className="collapse collapse-arrow bg-base-300 shadow-xl rounded-box p-3">
            <input type="checkbox" />
            <div className="collapse-title text-lg font-semibold">Catalogues</div>
            <div className="collapse-content">
                <h3 className="font-semibold">Produits</h3>
                <p className="text-sm opacity-80 mt-1">
                    {loading ? (
                        <span className="loading loading-spinner loading-xs" />
                    ) : totalProducts !== null ? (
                        `Le catalogue contient ${totalProducts} produit${totalProducts > 1 ? "s" : ""}.`
                    ) : (
                        <span className="text-error">Indisponible</span>
                    )}
                </p>
                <div className="flex gap-2 mt-3">
                    <button
                        type="button"
                        className="btn btn-secondary w-1/2"
                        onClick={() => setRefreshIndex((i) => i + 1)}
                    >
                        Actualiser
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate("/shopping_products")}
                        className="btn btn-primary w-1/2"
                    >
                        Voir le catalogue
                    </button>
                </div>

                <div className="divider my-4" />

                <h3 className="font-semibold">Catégories</h3>
                <p className="text-sm opacity-80 mt-1">
                    {loadingCategories ? (
                        <span className="loading loading-spinner loading-xs" />
                    ) : totalCategories !== null ? (
                        `Le catalogue contient ${totalCategories} catégorie${totalCategories > 1 ? "s" : ""}.`
                    ) : (
                        <span className="text-error">Indisponible</span>
                    )}
                </p>
                <div className="flex gap-2 mt-3">
                    <button
                        type="button"
                        className="btn btn-secondary w-1/2"
                        onClick={() => setRefreshCategoriesIndex((i) => i + 1)}
                    >
                        Actualiser
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate("/shopping_category")}
                        className="btn btn-primary w-1/2"
                    >
                        Voir les catégories
                    </button>
                </div>

                <div className="divider my-4" />

                <h3 className="font-semibold">Récurrences</h3>
                <p className="text-sm opacity-80 mt-1">
                    {loadingRecurrences ? (
                        <span className="loading loading-spinner loading-xs" />
                    ) : totalRecurrences !== null ? (
                        `Il y a actuellement ${totalRecurrences} récurrence${totalRecurrences > 1 ? "s" : ""}.`
                    ) : (
                        <span className="text-error">Indisponible</span>
                    )}
                </p>
                <div className="flex gap-2 mt-3">
                    <button
                        type="button"
                        className="btn btn-secondary w-1/2"
                        onClick={() => setRefreshRecurrencesIndex((i) => i + 1)}
                    >
                        Actualiser
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate("/shopping_recurrences")}
                        className="btn btn-primary w-1/2"
                    >
                        Voir les récurrences
                    </button>
                </div>

                <div className="divider my-4" />

                <h3 className="font-semibold">Magasins</h3>
                <p className="text-sm opacity-80 mt-1">
                    {loadingMalls ? (
                        <span className="loading loading-spinner loading-xs" />
                    ) : totalMalls !== null ? (
                        `La liste contient ${totalMalls} magasin${totalMalls > 1 ? "s" : ""}.`
                    ) : (
                        <span className="text-error">Indisponible</span>
                    )}
                </p>
                <div className="flex gap-2 mt-3">
                    <button
                        type="button"
                        className="btn btn-secondary w-1/2"
                        onClick={() => setRefreshMallsIndex((i) => i + 1)}
                    >
                        Actualiser
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate("/shopping_malls")}
                        className="btn btn-primary w-1/2"
                    >
                        Voir les magasins
                    </button>
                </div>
            </div>
        </div>
    );
}
