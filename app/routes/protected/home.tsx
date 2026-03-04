import type { Route } from "./+types/home";
import { useAuthStore } from "../../stores/auth";

export function meta({}: Route.MetaArgs) {
    return [{ title: "Home Page" }, { name: "description", content: "Page d'aceuil" }];
}

export default function Home() {
    const user = useAuthStore((s) => s.user);
    const endSession = useAuthStore((s) => s.endSession);

    return (
        <div>
            <h1>Welcome to the Home Page {user?.last_name}</h1>
        </div>
    );
}
