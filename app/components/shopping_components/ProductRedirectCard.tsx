import { apiClient } from "~/api/apiClient";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

export default function ProductRedirectCard() {
    const [totalProducts, setTotalProducts] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [refreshIndex, setRefreshIndex] = useState(0);
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

    return (
        <div className="card bg-base-300 shadow-xl">
            <div className="card-body">
                <h2 className="card-title">Catalogue de produits</h2>
                <p>
                    {loading ? (
                        <span className="loading loading-spinner loading-xs" />
                    ) : totalProducts !== null ? (
                        `Le catalogue de produits contient actuellement ${totalProducts} produit${totalProducts > 1 ? "s" : ""}.`
                    ) : (
                        <span className="text-error">Indisponible</span>
                    )}
                </p>
                <div className="flex gap-2 mt-4">
                    <button
                        type="button"
                        className="btn btn-secondary w-1/2"
                        onClick={() => setRefreshIndex((i) => i + 1)}
                    >
                        Actualiser
                    </button>
                    <button
                        onClick={() => navigate("/shopping_products")}
                        className="btn btn-primary w-1/2"
                    >
                        Voir le catalogue
                    </button>
                </div>
            </div>
        </div>
    );
}
