import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiClient } from "~/api/apiClient";
import type { FridgeRecap } from "~/types/fridges";
import { capitalizeAllWords, capitalizeFirstLetter } from "~/tools/formater";

type EditableFridge = {
    id: number;
    name: string;
    main: boolean;
    numberOfItems: number;
};

type Props = {
    fridges: FridgeRecap[];
    refreshFridgeRecaps: () => Promise<FridgeRecap[]>;
    onCloseRequested?: () => void;
};

const safeTrim = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const toEditableFridges = (fridges: FridgeRecap[]): EditableFridge[] =>
    [...fridges]
        .sort((a, b) => a.fridge_name.localeCompare(b.fridge_name))
        .map((fridge) => ({
            id: fridge.fridge_id,
            name: fridge.fridge_name,
            main: fridge.fridge_main,
            numberOfItems: fridge.number_of_items,
        }));

export default function FormManageFridges({
    fridges,
    refreshFridgeRecaps,
    onCloseRequested,
}: Props) {
    const [rows, setRows] = useState<EditableFridge[]>(() => toEditableFridges(fridges));
    const [baselineRows, setBaselineRows] = useState<EditableFridge[]>(() =>
        toEditableFridges(fridges),
    );
    const [newFridgeName, setNewFridgeName] = useState("");
    const [newFridgeMain, setNewFridgeMain] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [busyRowId, setBusyRowId] = useState<number | null>(null);
    const [deleteCandidateId, setDeleteCandidateId] = useState<number | null>(null);
    const rootRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const nextRows = toEditableFridges(fridges);
        setRows(nextRows);
        setBaselineRows(nextRows);
        setDeleteCandidateId(null);
        setGlobalError(null);
    }, [fridges]);

    useEffect(() => {
        if (!feedbackMessage) return;

        const timeoutId = setTimeout(() => setFeedbackMessage(null), 2200);
        return () => clearTimeout(timeoutId);
    }, [feedbackMessage]);

    const baselineById = useMemo(() => {
        return new Map(baselineRows.map((row) => [row.id, row]));
    }, [baselineRows]);

    const closeDialog = () => {
        if (onCloseRequested) {
            onCloseRequested();
            return;
        }

        const dialog = rootRef.current?.closest("dialog") as HTMLDialogElement | null;
        dialog?.close();
    };

    const syncFridgesFromServer = async (): Promise<EditableFridge[]> => {
        const refreshed = await refreshFridgeRecaps();
        const normalized = toEditableFridges(refreshed);
        setRows(normalized);
        setBaselineRows(normalized);
        return normalized;
    };

    const updateRow = (id: number, updater: (row: EditableFridge) => EditableFridge) => {
        setRows((current) => current.map((row) => (row.id === id ? updater(row) : row)));
    };

    const isRowDirty = (row: EditableFridge) => {
        const baseline = baselineById.get(row.id);
        if (!baseline) return true;

        return (
            safeTrim(row.name) !== safeTrim(baseline.name) || row.main !== baseline.main
        );
    };

    const handleCreateFridge = async () => {
        setCreateError(null);
        setGlobalError(null);

        const name = safeTrim(newFridgeName);
        if (name.length < 2) {
            setCreateError("Le nom du frigo doit faire au moins 2 caractères.");
            return;
        }

        setIsCreating(true);

        try {
            await apiClient.post("/fridges/create", {
                name,
                main: newFridgeMain,
            });

            await syncFridgesFromServer();
            setNewFridgeName("");
            setNewFridgeMain(false);
            setFeedbackMessage("Frigo ajouté avec succès.");
        } catch (error) {
            const detail = axios.isAxiosError(error)
                ? (error.response?.data as any)?.detail
                : undefined;
            setCreateError(
                typeof detail === "string" && detail.trim()
                    ? detail
                    : "Impossible d'ajouter le frigo.",
            );
        } finally {
            setIsCreating(false);
        }
    };

    const handleSaveFridge = async (row: EditableFridge) => {
        setGlobalError(null);
        setCreateError(null);

        const name = safeTrim(row.name);
        if (name.length < 2) {
            setGlobalError(
                `Le nom du frigo #${row.id} doit faire au moins 2 caractères.`,
            );
            return;
        }

        setBusyRowId(row.id);

        try {
            await apiClient.post(`/fridges/update/${row.id}`, {
                name,
                main: row.main,
            });

            await syncFridgesFromServer();
            setFeedbackMessage("Frigo mis à jour.");
        } catch (error) {
            const detail = axios.isAxiosError(error)
                ? (error.response?.data as any)?.detail
                : undefined;
            setGlobalError(
                typeof detail === "string" && detail.trim()
                    ? detail
                    : `Impossible de modifier le frigo #${row.id}.`,
            );
        } finally {
            setBusyRowId(null);
        }
    };

    const handleDeleteFridge = async (row: EditableFridge) => {
        setGlobalError(null);
        setCreateError(null);
        setBusyRowId(row.id);

        try {
            await apiClient.delete(`/fridges/delete/${row.id}`);
            await syncFridgesFromServer();
            setDeleteCandidateId(null);
            setFeedbackMessage("Frigo supprimé.");
        } catch (error) {
            const detail = axios.isAxiosError(error)
                ? (error.response?.data as any)?.detail
                : undefined;
            setGlobalError(
                typeof detail === "string" && detail.trim()
                    ? detail
                    : `Impossible de supprimer le frigo #${row.id}.`,
            );
        } finally {
            setBusyRowId(null);
        }
    };

    const hasAnyMainFridge = rows.some((row) => row.main);

    return (
        <div ref={rootRef} className="px-1 sm:px-2 pb-1">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold">Gestion des frigos</h2>
                    <p className="text-sm opacity-80 mt-1">
                        Ajoutez, modifiez ou supprimez vos frigos. Si un frigo est marqué
                        principal, les autres seront automatiquement repassés en
                        secondaire.
                    </p>
                </div>
                <span className="badge badge-outline badge-lg">
                    {rows.length} frigo{rows.length > 1 ? "s" : ""}
                </span>
            </div>

            <div className="divider my-3" />

            <div className="card bg-base-200 shadow-sm border border-base-300">
                <div className="card-body p-4 gap-3">
                    <h3 className="font-semibold">Ajouter un frigo</h3>

                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto] gap-3 items-end">
                        <label className="form-control">
                            <input
                                type="text"
                                autoComplete="off"
                                className="input input-bordered"
                                placeholder="Ex: Frigo cuisine"
                                value={newFridgeName}
                                onChange={(event) => {
                                    setNewFridgeName(event.target.value);
                                    if (createError) setCreateError(null);
                                }}
                                disabled={isCreating}
                            />
                        </label>

                        <label className="label cursor-pointer gap-2 justify-start lg:justify-center border border-base-300 rounded-box px-3 py-2 bg-base-100">
                            <input
                                type="checkbox"
                                className="checkbox checkbox-primary checkbox-sm"
                                checked={newFridgeMain}
                                onChange={(event) => {
                                    setNewFridgeMain(event.target.checked);
                                }}
                                disabled={isCreating}
                            />
                            <span className="label-text">Principal</span>
                        </label>

                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => {
                                void handleCreateFridge();
                            }}
                            disabled={isCreating}
                        >
                            {isCreating ? (
                                <span className="loading loading-spinner loading-sm" />
                            ) : null}
                            Ajouter
                        </button>
                    </div>

                    {createError ? (
                        <div className="alert alert-error alert-soft py-2">
                            <span>{createError}</span>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="mt-4 card bg-base-200 shadow-sm border border-base-300">
                <div className="card-body p-4">
                    <h3 className="font-semibold">Frigos existants</h3>

                    {rows.length === 0 ? (
                        <p className="text-sm opacity-80">
                            Aucun frigo trouvé pour le moment.
                        </p>
                    ) : (
                        <div className="mt-2 max-h-[42dvh] overflow-y-auto pr-1">
                            <div className="grid grid-cols-1 gap-3">
                                {rows.map((row) => {
                                    const isBusy = busyRowId === row.id;
                                    const dirty = isRowDirty(row);
                                    const prettyName = capitalizeAllWords(
                                        capitalizeFirstLetter(row.name || "frigo"),
                                    );

                                    return (
                                        <div
                                            key={row.id}
                                            className="rounded-2xl border border-base-300 bg-base-100 p-3"
                                        >
                                            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                                                <div className="w-full lg:flex-1">
                                                    <label className="label pt-0 pb-1">
                                                        <span className="label-text font-medium">
                                                            {prettyName}
                                                            {row.numberOfItems > 0 ? (
                                                                <span className="ml-2 text-sm font-normal opacity-70">
                                                                    ({row.numberOfItems}{" "}
                                                                    article
                                                                    {row.numberOfItems > 1
                                                                        ? "s"
                                                                        : ""}
                                                                    )
                                                                </span>
                                                            ) : null}
                                                        </span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="input input-bordered w-full"
                                                        value={row.name}
                                                        onChange={(event) => {
                                                            const nextValue =
                                                                event.target.value;
                                                            updateRow(
                                                                row.id,
                                                                (current) => ({
                                                                    ...current,
                                                                    name: nextValue,
                                                                }),
                                                            );
                                                        }}
                                                        disabled={isBusy}
                                                    />
                                                </div>
                                                <div className="w-1/4"></div>

                                                <label className="label cursor-pointer gap-2 lg:mt-6 justify-start">
                                                    <input
                                                        type="checkbox"
                                                        className="checkbox checkbox-primary checkbox-sm"
                                                        checked={row.main}
                                                        onChange={(event) => {
                                                            const checked =
                                                                event.target.checked;
                                                            setRows((current) =>
                                                                current.map(
                                                                    (candidate) => {
                                                                        if (!checked) {
                                                                            return candidate.id ===
                                                                                row.id
                                                                                ? {
                                                                                      ...candidate,
                                                                                      main: false,
                                                                                  }
                                                                                : candidate;
                                                                        }

                                                                        return {
                                                                            ...candidate,
                                                                            main:
                                                                                candidate.id ===
                                                                                row.id,
                                                                        };
                                                                    },
                                                                ),
                                                            );
                                                        }}
                                                        disabled={isBusy}
                                                    />
                                                    <span className="label-text">
                                                        Principal
                                                    </span>
                                                </label>

                                                <div className="flex items-center gap-2 lg:mt-6">
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-outline"
                                                        disabled={isBusy || !dirty}
                                                        onClick={() => {
                                                            void handleSaveFridge(row);
                                                        }}
                                                    >
                                                        {isBusy ? (
                                                            <span className="loading loading-spinner loading-xs" />
                                                        ) : null}
                                                        Enregistrer
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-error btn-outline"
                                                        disabled={isBusy}
                                                        onClick={() => {
                                                            setDeleteCandidateId(
                                                                (current) =>
                                                                    current === row.id
                                                                        ? null
                                                                        : row.id,
                                                            );
                                                        }}
                                                    >
                                                        Supprimer
                                                    </button>
                                                </div>
                                            </div>

                                            {deleteCandidateId === row.id ? (
                                                <div className="alert alert-warning alert-soft mt-3 py-2">
                                                    <div className="flex w-full flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                        <span>
                                                            Confirmer la suppression de ce
                                                            frigo et de ses articles ?
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                className="btn btn-xs"
                                                                onClick={() => {
                                                                    setDeleteCandidateId(
                                                                        null,
                                                                    );
                                                                }}
                                                                disabled={isBusy}
                                                            >
                                                                Annuler
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-xs btn-error"
                                                                onClick={() => {
                                                                    void handleDeleteFridge(
                                                                        row,
                                                                    );
                                                                }}
                                                                disabled={isBusy}
                                                            >
                                                                Confirmer
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {!hasAnyMainFridge ? (
                        <div className="alert alert-info alert-soft mt-3 py-2">
                            <span>
                                Aucun frigo principal sélectionné pour l'instant. Ce n'est
                                pas bloquant, mais recommandé.
                            </span>
                        </div>
                    ) : null}
                </div>
            </div>

            {globalError ? (
                <div className="alert alert-error alert-soft mt-4">
                    <span>{globalError}</span>
                </div>
            ) : null}

            {feedbackMessage ? (
                <div className="alert alert-success alert-soft mt-4">
                    <span>{feedbackMessage}</span>
                </div>
            ) : null}

            <div className="mt-5 flex items-center justify-end">
                <button type="button" className="btn btn-ghost" onClick={closeDialog}>
                    Fermer
                </button>
            </div>
        </div>
    );
}
