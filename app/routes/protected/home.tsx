import type { Route } from "./+types/home";
import type { shoppingRecap } from "~/types/shoppingRecap";
import { useAuthStore } from "../../stores/auth";
import { useState, useEffect } from "react";
import UserCard from "~/components/home_components/UserCard";
import HouseCard from "~/components/home_components/HouseCard";
import ShoppingRecapCard from "~/components/home_components/ShoppingRecapCard";
import FridgeComingSoonCard from "~/components/home_components/FridgeComingSoonCard";
import { apiClient } from "~/api/apiClient";
import axios from "axios";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "NestBoard - Page d'acceuil" },
        { name: "description", content: "Page d'aceuil" },
    ];
}

export default function Home() {
    const user = useAuthStore((s) => s.user);
    const ensureSession = useAuthStore((s) => s.ensureSession);
    const [localShoppingRecap, setLocalShoppingRecap] = useState<shoppingRecap | null>(
        null,
    );
    const [houseCode, setHouseCode] = useState("");
    const [newHouseName, setNewHouseName] = useState("");
    const [houseCardError, setHouseCardError] = useState<string | null>(null);
    const [invitationCode, setInvitationCode] = useState<string | null>(null);
    const [isHouseActionLoading, setIsHouseActionLoading] = useState(false);

    useEffect(() => {
        const fetchShoppingRecap = async () => {
            try {
                const r = await apiClient.get<shoppingRecap>(
                    "/shopping_list_view/shopping_list/recap",
                );
                setLocalShoppingRecap(r.data);
            } catch (e) {
                if (axios.isAxiosError(e)) {
                    console.error(
                        "Failed to fetch shopping recap:",
                        e.response?.data || e.message,
                    );
                } else {
                    console.error("Unexpected error:", e);
                }
            }
        };

        if (user) {
            fetchShoppingRecap();
        } else {
            setLocalShoppingRecap(null);
        }
    }, [user]);

    const handleJoinHouse = async () => {
        if (isHouseActionLoading) return;
        setHouseCardError(null);
        setIsHouseActionLoading(true);

        try {
            const r = await apiClient.post(`/houses/join/${houseCode}`);
            console.log("Join house response:", r.data);
            ensureSession(); // Refresh user session to get updated house info
        } catch (e) {
            if (axios.isAxiosError(e)) {
                console.error("Failed to join house:", e.response?.data || e.message);
                if (e.response?.status === 404) {
                    setHouseCardError(
                        "Code de maison invalide. Veuillez vérifier le code et réessayer.",
                    );
                } else {
                    setHouseCardError(`Une erreur inattendue est survenue: ${String(e)}`);
                }
            } else {
                console.error("Unexpected error:", e);
                setHouseCardError(`Une erreur inattendue est survenue: ${String(e)}`);
            }
        } finally {
            setIsHouseActionLoading(false);
        }
    };

    const handleCreateHouse = async () => {
        if (isHouseActionLoading) return;
        setHouseCardError(null);
        setIsHouseActionLoading(true);

        try {
            const r = await apiClient.post(`/houses/create`, {
                name: newHouseName,
            });
            console.log("Create house response:", r.data);
            ensureSession(); // Refresh user session to get updated house info
        } catch (e) {
            if (axios.isAxiosError(e)) {
                console.error("Failed to create house:", e.response?.data || e.message);
                setHouseCardError(
                    `Une erreur inattendue est survenue: ${String(e.response?.data || e.message)}`,
                );
            } else {
                console.error("Unexpected error:", e);
                setHouseCardError(`Une erreur inattendue est survenue: ${String(e)}`);
            }
        } finally {
            setIsHouseActionLoading(false);
        }
    };

    const handleGenerateInvitation = async () => {
        if (isHouseActionLoading) return;
        setHouseCardError(null);
        setIsHouseActionLoading(true);

        try {
            const r = await apiClient.post(`/houses/generate_invitation_code`);
            setInvitationCode(r.data.invitation_code);
        } catch (e) {
            if (axios.isAxiosError(e)) {
                console.error(
                    "Failed to generate invitation:",
                    e.response?.data || e.message,
                );
                setHouseCardError(
                    `Une erreur inattendue est survenue: ${String(e.response?.data || e.message)}`,
                );
            } else {
                console.error("Unexpected error:", e);
                setHouseCardError(`Une erreur inattendue est survenue: ${String(e)}`);
            }
        } finally {
            setIsHouseActionLoading(false);
        }
    };

    const handleLeftHouse = async () => {
        if (isHouseActionLoading) return;
        setHouseCardError(null);
        setIsHouseActionLoading(true);

        try {
            const r = await apiClient.post(`/houses/leave`);
            console.log("Leave house response:", r.data);
            ensureSession(); // Refresh user session to get updated house info
        } catch (e) {
            if (axios.isAxiosError(e)) {
                console.error("Failed to leave house:", e.response?.data || e.message);
                setHouseCardError(
                    `Une erreur inattendue est survenue: ${String(e.response?.data || e.message)}`,
                );
            } else {
                console.error("Unexpected error:", e);
                setHouseCardError(`Une erreur inattendue est survenue: ${String(e)}`);
            }
        } finally {
            setIsHouseActionLoading(false);
        }
    };

    return (
        <div className="grid md:grid-cols-3 gap-6 md:px-10">
            <div className="flex flex-col gap-8">
                <UserCard user={user} />
                <HouseCard
                    user={user}
                    onJoinHouse={handleJoinHouse}
                    onGenerateInvitation={handleGenerateInvitation}
                    onLeftHouse={handleLeftHouse}
                    onCreateHouse={handleCreateHouse}
                    invitationCode={invitationCode}
                    isLoading={isHouseActionLoading}
                    code={houseCode}
                    onChangeCode={setHouseCode}
                    NewHousename={newHouseName}
                    onChangeName={setNewHouseName}
                    houseCardError={houseCardError}
                />
            </div>
            <ShoppingRecapCard shoppingRecap={localShoppingRecap} />
            <FridgeComingSoonCard />
        </div>
    );
}
