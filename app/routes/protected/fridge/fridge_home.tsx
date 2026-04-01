export function meta() {
    return [
        {
            title: "NestBoard - Frigo",
        },
    ];
}

export default function FridgeHome() {
    return (
        <div className="pt-4 md:px-4 md:max-w-3/4 xxl:max-w-2/3 mx-auto">
            <h1 className="text-2xl font-bold mb-4">Frigo</h1>
            <p>Bienvenue dans la section Frigo de NestBoard !</p>
        </div>
    );
}
