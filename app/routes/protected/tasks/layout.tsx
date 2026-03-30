import { Outlet } from "react-router";

export default function TasksLayout() {
    return (
        <div className="flex-1">
            <Outlet />
        </div>
    );
}
