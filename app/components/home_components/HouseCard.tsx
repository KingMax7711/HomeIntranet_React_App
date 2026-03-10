import type { User } from "~/types/domain";
import { apiClient } from "~/api/apiClient";
import { useState, useEffect } from "react";
import axios from "axios";
import { capitalizeAllWords } from "~/tools/formater";
import { House, Users, Copy } from "lucide-react";

type HouseDetailed = {
    id: number;
    name: string;
    members: User[];
};

export default function HouseCard({
    user,
    onGenerateInvitation,
    onLeftHouse,
    onJoinHouse,
    onCreateHouse,
    invitationCode,
    isLoading,

    code,
    onChangeCode,
    NewHousename,
    onChangeName,
    houseCardError,
}: {
    user: User | null;
    onGenerateInvitation: () => void;
    onLeftHouse: () => void;
    onJoinHouse: () => void;
    onCreateHouse: () => void;
    invitationCode: string | null;
    isLoading: boolean;

    code: string;
    onChangeCode: (code: string) => void;
    NewHousename: string;
    onChangeName: (name: string) => void;
    houseCardError: string | null;
}) {
    const [house, setHouse] = useState<HouseDetailed | null>(null);
    const [houseStatus, setHouseStatus] = useState<
        "idle" | "loading" | "loaded" | "none" | "error"
    >("idle");

    useEffect(() => {
        if (!user) {
            setHouse(null);
            setHouseStatus("idle");
            return;
        }

        const controller = new AbortController();
        setHouseStatus("loading");

        (async () => {
            try {
                const r = await apiClient.get<HouseDetailed>("/houses/my_house", {
                    signal: controller.signal,
                });
                setHouse(r.data);
                setHouseStatus("loaded");
            } catch (e) {
                if (axios.isAxiosError(e) && e.code === "ERR_CANCELED") return;

                const status = axios.isAxiosError(e) ? e.response?.status : undefined;
                if (status === 404) {
                    setHouse(null);
                    setHouseStatus("none");
                    return;
                }

                setHouse(null);
                setHouseStatus("error");
            }
        })();

        return () => controller.abort();
    }, [user?.id, user?.house_id]);

    if (!user) {
        return (
            <div className="card bg-base-200 shadow">
                <div className="card-body p-4">
                    <p className="opacity-70">Aucun utilisateur connecté</p>
                </div>
            </div>
        );
    }

    if (!user.house_id) {
        return (
            <div className="card bg-base-200 shadow">
                <div className="card-body p-4">
                    <p className="opacity-70 text-center">
                        Vous n'êtes pas encore dans une maison.
                    </p>
                    <p className="opacity-70 text-center italic">
                        Rejoignez ou Créez une maison pour accéder au reste des
                        fonctionnalités.
                    </p>
                    <div className="flex flex-col md:flex-row w-full gap-4 mt-4">
                        <div className="form-control flex flex-col flex-1/2">
                            <label className="label">
                                <span className="label-text">Code de la maison</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Entrez le code de la maison"
                                className="input input-bordered w-full"
                                value={code}
                                onChange={(e) => onChangeCode(e.target.value)}
                            />
                        </div>
                        <div className="form-control flex flex-col flex-1/2">
                            <label className="label">
                                <span className="label-text">Nom de la maison</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Entrez le nom de la maison"
                                className="input input-bordered w-full"
                                value={NewHousename}
                                onChange={(e) => onChangeName(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex gap-4 mt-4">
                        <button
                            className="btn btn-primary flex-1/2"
                            onClick={onJoinHouse}
                            disabled={!code || isLoading}
                        >
                            {isLoading && (
                                <span className="loading loading-spinner loading-xs" />
                            )}
                            Rejoindre <span className="hidden md:block">une maison</span>
                        </button>
                        <button
                            className="btn btn-secondary flex-1/2"
                            onClick={onCreateHouse}
                            disabled={!NewHousename || isLoading}
                        >
                            {isLoading && (
                                <span className="loading loading-spinner loading-xs" />
                            )}
                            Créer une maison
                        </button>
                    </div>
                    {houseCardError && (
                        <p className="text-error text-sm mt-2">{houseCardError}</p>
                    )}
                </div>
            </div>
        );
    } else {
        return (
            <div className="card bg-base-200">
                {houseStatus === "loading" && (
                    <div className="card-body p-4">
                        <p className="opacity-70 text-center">
                            Chargement de votre maison...
                        </p>
                    </div>
                )}
                {houseStatus === "error" && (
                    <div className="card-body p-4">
                        <p className="opacity-70 text-center">
                            Erreur lors du chargement de votre maison.
                        </p>
                    </div>
                )}
                {houseStatus === "loaded" && house && (
                    <div className="card-body p-4">
                        <div className="flex justify-between items-center gap-4 mb-4">
                            <h3 className="font-semibold text-lg">
                                {capitalizeAllWords(house.name)}
                            </h3>
                            <span className="text-sm opacity-70">ID: #{house.id}</span>
                        </div>
                        <p className="font-medium mb-2">Membres:</p>
                        <ul className="list mb-4 bg-base-100 p-3 rounded-3xl max-h-48 overflow-y-auto">
                            {house.members.map((member) => (
                                <li
                                    key={member.id}
                                    className="list-row flex flex-col md:flex-row md:justify-between items-start"
                                >
                                    {capitalizeAllWords(
                                        `${member.first_name} ${member.last_name}`.trim(),
                                    ) || "Utilisateur"}{" "}
                                    {member.email && (
                                        <span className="mx-1 opacity-70 italic">
                                            {member.email}
                                        </span>
                                    )}
                                    {member.privileges === "owner" && (
                                        <span className="badge badge-primary badge-sm">
                                            Propriétaire
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                        <div className="flex gap-4">
                            <button
                                className="btn btn-error btn-outline flex-1/2"
                                onClick={onLeftHouse}
                                disabled={isLoading}
                            >
                                {isLoading && (
                                    <span className="loading loading-spinner loading-xs" />
                                )}
                                Quitter la maison
                            </button>
                            <button
                                className="btn btn-primary flex-1/2"
                                onClick={onGenerateInvitation}
                                disabled={isLoading}
                            >
                                {isLoading && (
                                    <span className="loading loading-spinner loading-xs" />
                                )}
                                Générer une invitation
                            </button>
                        </div>
                        {invitationCode && (
                            <div className="alert alert-info mt-4 flex justify-between items-center">
                                <span>
                                    Code d'invitation: <strong>{invitationCode}</strong>
                                </span>
                                <button
                                    className="btn btn-sm btn-info border-0"
                                    onClick={() =>
                                        navigator.clipboard.writeText(invitationCode)
                                    }
                                    title="Copier le code"
                                    disabled={isLoading}
                                >
                                    <Copy size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }
}
