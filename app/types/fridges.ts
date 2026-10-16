import type { ISODateString } from "./domain";

export type ProductDetailed = {
    id: number;
    name: string;
    comment: string | null;
    category_id: number | null;
    category_name: string | null;
};

export type FridgeItemDetailed = {
    id: number;
    product: ProductDetailed;
    fridge_id: number;
    quantity: number;
    added_at: ISODateString | null;
    expiration_date: ISODateString | null;
    source: string | null;
    comment: string | null;
};

export type FridgeItemLite = {
    id: number;
    fridge_id: number;
    product_id?: number | null;
    product_name: string;
    quantity: number;
    added_at: ISODateString | null;
    expiration_date: ISODateString | null;
    comment: string | null;
};

export type ShoppingListItemForFridge = {
    id: number;
    product_id: number | null;
    product_name: string | null;
    quantity: number;
};

export type ShoppingListViewForFridge = {
    id: number;
    closed_at: ISODateString | null;
    items: ShoppingListItemForFridge[];
};

export type FridgeItemCreatePayload = {
    product: number;
    fridge_id: number;
    quantity: number;
    expiration_date?: ISODateString | null;
    source?: string | null;
    comment?: string | null;
};

export type FridgeRecap = {
    fridge_id: number;
    fridge_name: string;
    fridge_main: boolean;
    number_of_items: number;
};

export type FridgeDetailed = {
    id: number;
    house_id: number;
    house_name: string;
    name: string;
    main: boolean;
    items: FridgeItemDetailed[];
};
