export type shoppingRecap = {
    id: number;
    house_name: string;

    mall_name: string | null;
    mall_location: string | null;

    number_of_items: number;
    total: number;

    created_at: string;
    status: "preparation" | "in_progress" | "completed";
};
