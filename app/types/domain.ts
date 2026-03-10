export type Id = number;

// ISO 8601 date string (ex: "2026-02-25").
export type ISODateString = string;

// Ajuste ce type au fur et à mesure que l'API /users/me/ se stabilise.
export type User = {
    id: Id;
    first_name: string;
    last_name: string;
    email: string;
    inscription_date: ISODateString;
    privileges: "owner" | "user";
    house_id: Id | null;
    [key: string]: unknown;
};
