import type { Route } from "./+types/shopping_productsRecurrences";

export function meta({}: Route.MetaArgs) {
    return [{ title: "HomeFlow - Récurrences" }];
}

export default function ShoppingProductsRecurrences() {
    return (
        <div>
            <h1>Récurrences</h1>
            <p>Cette page affiche les produits récurrents.</p>
        </div>
    );
}
