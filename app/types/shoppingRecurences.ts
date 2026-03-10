export type ShoppingRecurrence = {
    id: number;
    product_id: number;
    house_id: number;
};

export type ShoppingRecurrenceDetailled = {
    id: number;
    product_id: number;
    house_id: number;
    product_name: string;
    house_name: string;
};

export type ShoppingRecurrenceCreate = {
    product_id: number;
};
