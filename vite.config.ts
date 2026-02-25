import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
    server: {
        host: true, // ou '0.0.0.0' pour exposer sur ton réseau local
        https: {
            key: "../certs/dev-key.pem",
            cert: "../certs/dev-cert.pem",
        },
        port: 5173, // optionnel, fixe le port
    },
});
