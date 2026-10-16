import { Outlet } from "react-router";

export default function FridgeLayout() {
    return (
        <div className="flex-1">
            <Outlet />
        </div>
    );
}
