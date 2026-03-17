export type ISODateTimeString = string;

export type ShoppingListStatus = "preparation" | "in_progress" | "completed";

export type ShoppingItemStatus = "pending" | "found" | "not_found" | "given_up";

export type ShoppingListRecap = {
    id: number;
    house_name: string;
    mall_name: string | null;
    mall_location: string | null;
    number_of_items: number;
    total: number | null;
    closed_at: ISODateTimeString | null;
};

export type UserInList = {
    id: number;
    first_name: string;
    last_name: string;
};

export type ProductBase = {
    id: number;
    name: string;
    comment: string | null;
    category: string | null;
};

export type ShoppingListItemDetailed = {
    id: number;
    custom_sort_index: number | null;
    quantity: number;
    price: number | null;
    in_promotion: boolean;
    need_coupons: boolean;
    status: ShoppingItemStatus;
    product: ProductBase | null;
    affected_user: UserInList | null;
};

export type ShoppingListRecapDetailed = {
    id: number;
    house_name: string | null;
    mall_name: string | null;
    mall_location: string | null;
    items: ShoppingListItemDetailed[] | null;
    created_at: ISODateTimeString | null;
    closed_at: ISODateTimeString | null;
    status: ShoppingListStatus;
    total: number | null;
    version: number;
};
