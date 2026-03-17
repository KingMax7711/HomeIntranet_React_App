export default function Footer() {
    const currentVersion = import.meta.env.VITE_REACT_APP_VERSION || "dev";

    return (
        <footer className="w-full bg-gray-100 text-center py-4 mt-8">
            <p className="text-sm text-gray-600">
                &copy; {new Date().getFullYear()} NestBoard. Tous droits réservés.
                <span className="hidden md:inline"> • </span>
                <span className="block md:inline text-xs mt-1">
                    Version: {currentVersion}
                </span>
            </p>
        </footer>
    );
}
