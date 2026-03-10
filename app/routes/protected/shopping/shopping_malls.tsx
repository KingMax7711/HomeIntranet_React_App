import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "~/api/apiClient";
import MallCard from "~/components/shopping_components/MallCard";
import FormAjoutMall from "~/components/shopping_components/FormAjoutMall";
import FormEditMall from "~/components/shopping_components/FormEditMall";
import type { MallBase } from "~/types/mall";

export function meta() {
    return [
        { title: "HomeFlow - Magasins" },
        { name: "description", content: "Gestion des magasins" },
    ];
}

export default function ShoppingMalls() {
    const [malls, setMalls] = useState<MallBase[]>([]);
    const [status, setStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");

    const [searchQuery, setSearchQuery] = useState("");
    const [refreshIndex, setRefreshIndex] = useState(0);

    const addDialogRef = useRef<HTMLDialogElement | null>(null);
    const editDialogRef = useRef<HTMLDialogElement | null>(null);
    const [selectedMall, setSelectedMall] = useState<MallBase | null>(null);

    const openDialogAtTop = (dlg: HTMLDialogElement | null) => {
        if (!dlg) return;
        dlg.showModal();

        const run = () => {
            const box = dlg.querySelector<HTMLElement>(".modal-box");
            box?.scrollTo({ top: 0 });
            try {
                dlg.focus();
            } catch {
                // ignore
            }
            box?.scrollTo({ top: 0 });
        };

        requestAnimationFrame(() => {
            run();
            setTimeout(run, 50);
        });
    };

    const handleOpenAdd = () => openDialogAtTop(addDialogRef.current);
    const handleOpenEdit = (mall: MallBase) => {
        setSelectedMall(mall);
        openDialogAtTop(editDialogRef.current);
    };

    const handleDelete = (mall: MallBase) => {
        const id = mall.id;
        if (!id) return;

        (async () => {
            try {
                await apiClient.delete(`/malls/delete/${id}`);
                setRefreshIndex((v) => v + 1);
            } catch (e) {
                const detail = axios.isAxiosError(e)
                    ? (e.response?.data as any)?.detail
                    : undefined;
                const statusCode = axios.isAxiosError(e) ? e.response?.status : undefined;

                const fallback =
                    statusCode === 409 || statusCode === 400
                        ? "Impossible de supprimer ce magasin car il est utilisé."
                        : "Une erreur est survenue lors de la suppression du magasin.";

                alert(typeof detail === "string" && detail.trim() ? detail : fallback);
            }
        })();
    };

    useEffect(() => {
        const controller = new AbortController();
        setStatus("loading");

        (async () => {
            try {
                const r = await apiClient.get<MallBase[]>("/malls/all", {
                    signal: controller.signal,
                });
                setMalls(Array.isArray(r.data) ? r.data : []);
                setStatus("loaded");
            } catch (e) {
                if (axios.isAxiosError(e) && e.code === "ERR_CANCELED") return;
                console.error("Failed to fetch malls", e);
                setMalls([]);
                setStatus("error");
            }
        })();

        return () => controller.abort();
    }, [refreshIndex]);

    const sortedMalls = useMemo(() => {
        const list = Array.isArray(malls) ? [...malls] : [];
        list.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
        return list;
    }, [malls]);

    const filteredMalls = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return sortedMalls;
        return sortedMalls.filter((m) => (m.name ?? "").toLowerCase().includes(q));
    }, [sortedMalls, searchQuery]);

    return (
        <div className="pt-4 md:px-4 md:max-w-3/4 xxl:max-w-2/3 mx-auto">
            <div className="card bg-base-300 shadow-xl">
                <div className="card-body gap-4">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="card-title">Liste des magasins</h2>

                        <input
                            type="search"
                            className="hidden md:block input input-bordered w-1/4"
                            placeholder="Rechercher un magasin par nom…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />

                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={handleOpenAdd}
                        >
                            Ajouter un magasin
                        </button>
                    </div>

                    <div className="w-full md:hidden">
                        <div className="form-control flex-1">
                            <input
                                type="search"
                                className="input input-bordered input-sm w-full"
                                placeholder="Rechercher un magasin par nom…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="divider my-0" />

                    {status === "loading" ? (
                        <p className="text-sm opacity-70 flex items-center gap-2">
                            <span className="loading loading-spinner loading-xs" />
                            Chargement…
                        </p>
                    ) : status === "error" ? (
                        <p className="text-sm text-error">Indisponible</p>
                    ) : filteredMalls.length === 0 ? (
                        <p className="text-sm opacity-70 text-center">
                            {searchQuery.trim()
                                ? "Aucun magasin ne correspond à la recherche."
                                : "Aucun magasin enregistré pour le moment."}
                        </p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {filteredMalls.map((m) => (
                                <MallCard
                                    key={m.id}
                                    mall={m}
                                    onEdit={handleOpenEdit}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <dialog ref={addDialogRef} className="modal" tabIndex={-1}>
                <div className="modal-box w-11/12 max-w-none sm:max-w-2xl max-h-[90dvh] sm:max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain px-3 sm:px-6 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pt-6 sm:pb-6 rounded-3xl">
                    <FormAjoutMall onDone={() => setRefreshIndex((v) => v + 1)} />
                </div>
            </dialog>

            <dialog
                ref={editDialogRef}
                className="modal"
                onClose={() => setSelectedMall(null)}
                tabIndex={-1}
            >
                <div className="modal-box w-11/12 max-w-none sm:max-w-2xl max-h-[90dvh] sm:max-h-[calc(100vh-6rem)] overflow-y-auto overscroll-contain px-3 sm:px-6 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:pt-6 sm:pb-6">
                    <h2 className="text-xl font-bold text-center pb-3 sm:pb-4">
                        Édition du magasin
                    </h2>
                    <FormEditMall
                        mall={selectedMall}
                        onDone={() => setRefreshIndex((v) => v + 1)}
                    />
                </div>
            </dialog>
        </div>
    );
}
