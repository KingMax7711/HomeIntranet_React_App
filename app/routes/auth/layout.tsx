import { Outlet } from "react-router";
import type { Route } from "./+types/layout";
import clsx from "clsx";

export default function Layout() {
    return (
        <div className="flex flex-col flex-1 items-center justify-center min-h-screen bg-base-100">
            <div className="w-full max-w-md p-4 bg-base-200 rounded-lg shadow-md">
                <Outlet />
            </div>
        </div>
    );
}
