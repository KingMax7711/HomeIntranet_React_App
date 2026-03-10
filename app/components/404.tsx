import { useNavigate } from "react-router";

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="w-full h-screen flex flex-col items-center justify-center">
            <div className="card bg-base-300 shadow-xl p-8 md:w-1/4">
                <h1 className="text-3xl font-bold">Erreur 404</h1>
                <p className="text mt-4">
                    Nous sommes désolés, la page demandée n'existe pas ou n'est plus
                    disponible.
                </p>
                <button className="btn btn-primary mt-6" onClick={() => navigate("/")}>
                    Retour à l'accueil
                </button>
            </div>
        </div>
    );
}
