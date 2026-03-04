import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
    layout("routes/protected/layout.tsx", [
        index("routes/protected/home.tsx"),
        layout("routes/protected/shopping/layout.tsx", [
            route("shopping_home", "routes/protected/shopping/shopping_home.tsx"),
        ]),
    ]),
    layout("routes/auth/layout.tsx", [
        route("login", "routes/auth/login.tsx"),
        route("register", "routes/auth/register.tsx"),
    ]),
] satisfies RouteConfig;
