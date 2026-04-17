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
    product_name: string;
    quantity: number;
    expiration_date: ISODateString | null;
};

export type FridgeRecap = {
    fridge_id: number;
    fridge_name: string;
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
