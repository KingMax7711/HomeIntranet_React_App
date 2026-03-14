import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
    layout("routes/protected/layout.tsx", [
        index("routes/protected/home.tsx"),
        route("settings", "routes/protected/settings.tsx"),
        layout("routes/protected/shopping/layout.tsx", [
            route("shopping_home", "routes/protected/shopping/shopping_home.tsx"),
            route(
                "shopping_in_progress",
                "routes/protected/shopping/shopping_in_progress.tsx",
            ),
            route("shopping_products", "routes/protected/shopping/shopping_products.tsx"),
            route("shopping_malls", "routes/protected/shopping/shopping_malls.tsx"),
            route("shopping_sort", "routes/protected/shopping/shopping_sort.tsx"),
            route(
                "shopping_recurrences",
                "routes/protected/shopping/shopping_productsRecurrences.tsx",
            ),
        ]),
    ]),
    layout("routes/auth/layout.tsx", [
        route("login", "routes/auth/login.tsx"),
        route("register", "routes/auth/register.tsx"),
    ]),
] satisfies RouteConfig;
