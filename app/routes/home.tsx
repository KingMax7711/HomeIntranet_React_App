import type { Route } from "./+types/home";
import { apiClient } from "../api/apiClient";
import { useEffect } from "react";

export function meta({}: Route.MetaArgs) {
    return [{ title: "Home Page" }, { name: "description", content: "Page d'aceuil" }];
}

export default function Home() {
    return <h1>Welcome to the Home Page</h1>;
}
