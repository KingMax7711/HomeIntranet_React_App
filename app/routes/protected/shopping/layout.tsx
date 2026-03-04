import { Outlet } from "react-router";
import { useEffect } from "react";
import { useShoppingListStore } from "~/stores/shopping_list";

export default function ShoppingLayout() {
    const startSync = useShoppingListStore((s) => s.startSync);
    const stopSync = useShoppingListStore((s) => s.stopSync);

    useEffect(() => {
        void startSync();
        return () => {
            stopSync();
        };
    }, [startSync, stopSync]);

    return (
        <div className="flex-1">
            <Outlet />
        </div>
    );
}
