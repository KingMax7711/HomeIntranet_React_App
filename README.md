<div align="center">

# 🏠 NestBoard

**Un intranet maison moderne — listes de courses, tâches et plus encore.**

![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-v7-CA4245?style=flat-square&logo=reactrouter&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![DaisyUI](https://img.shields.io/badge/DaisyUI-5-5A0EF8?style=flat-square)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white)

</div>

---

## ✨ Présentation

**NestBoard** est une application intranet conçue pour la gestion du quotidien à la maison. Organisée autour d'un système de **maisons partagées**, elle permet à plusieurs membres d'un foyer de collaborer sur les listes de courses, les tâches, et d'autres fonctionnalités à venir.

---

## 🚀 Fonctionnalités

### 🏡 Tableau de bord
- Carte utilisateur avec informations du profil
- Gestion de la maison : créer, rejoindre, quitter ou inviter des membres via un code d'invitation
- Récapitulatif rapide de la liste de courses active
- Carte réfrigérateur *(à venir)*

### 🛒 Module Shopping

| Page | Description |
|---|---|
| **Accueil Shopping** | Vue d'ensemble de la liste de courses active, ajout/édition d'articles |
| **Course en cours** | Mode optimisé pour faire ses courses en magasin |
| **Produits** | Catalogue de produits réutilisables |
| **Catégories** | Organisation des produits par catégorie |
| **Magasins** | Gestion des lieux de courses (hypermarchés, supérettes…) |
| **Tri personnalisé** | Réorganisation des articles par glisser-déposer |
| **Récurrences** | Produits achetés régulièrement pour un ajout facilité |
| **Historique** | Consultation des listes de courses passées |
| **Importation** | Import de produits en masse |

### ✅ Module Tâches
- Liste de tâches partagée entre les membres du foyer

### ⚙️ Paramètres
- Gestion du profil utilisateur (informations personnelles, mot de passe)

### 🔐 Authentification
- Inscription et connexion sécurisées
- Tokens JWT avec refresh automatique et heartbeat de session
- Déconnexion forcée en cas d'expiration de session

---

## 🛠️ Stack technique

| Catégorie | Technologie |
|---|---|
| Framework UI | [React 19](https://react.dev/) |
| Routing & SSR | [React Router v7](https://reactrouter.com/) |
| Langage | [TypeScript 5](https://www.typescriptlang.org/) |
| Build tool | [Vite 7](https://vitejs.dev/) |
| Style | [TailwindCSS 4](https://tailwindcss.com/) + [DaisyUI 5](https://daisyui.com/) |
| État global | [Zustand](https://zustand-demo.pmnd.rs/) |
| Formulaires | [React Hook Form](https://react-hook-form.com/) |
| HTTP Client | [Axios](https://axios-http.com/) |
| Glisser-déposer | [dnd-kit](https://dndkit.com/) |
| Icônes | [Lucide React](https://lucide.dev/) |
| Conteneurisation | [Docker](https://www.docker.com/) (multi-stage, Node 20 Alpine) |

---

## ⚙️ Prérequis

- [Node.js](https://nodejs.org/) `>= 20`
- [npm](https://www.npmjs.com/) `>= 10`
- Une API backend compatible (variable d'environnement `VITE_API_URL`)

---

## 🏁 Démarrage rapide

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet :

```env
VITE_API_URL=http://localhost:8000
```

### 3. Lancer le serveur de développement

```bash
npm run dev
```

L'application sera disponible sur **[http://localhost:5173](http://localhost:5173)**.

---

## 📦 Build de production

```bash
npm run build
```

Les fichiers générés se trouvent dans `build/` :

```
build/
├── client/    # Assets statiques
└── server/    # Code serveur (SSR)
```

Pour démarrer le serveur de production :

```bash
npm run start
```

---

## 🐳 Docker

### Build & run en une commande

```bash
docker build -t nestboard .
docker run -p 3000:3000 -e VITE_API_URL=http://your-api:8000 nestboard
```

L'application sera disponible sur **[http://localhost:3000](http://localhost:3000)**.

### Détails du Dockerfile

Le build utilise une **construction multi-étapes** pour minimiser la taille de l'image finale :

1. **`development-dependencies-env`** — installation de toutes les dépendances
2. **`production-dependencies-env`** — installation des dépendances de production uniquement
3. **`build-env`** — compilation de l'application
4. **Image finale** — Node 20 Alpine allégée avec uniquement le nécessaire pour tourner

---

## 📁 Structure du projet

```
app/
├── api/                     # Client HTTP Axios + intercepteurs JWT
├── components/
│   ├── home_components/     # Composants du tableau de bord
│   ├── shopping_components/ # Composants du module shopping
│   └── tasks_components/    # Composants du module tâches
├── routes/
│   ├── auth/                # Login, Register
│   └── protected/           # Pages authentifiées
│       ├── home.tsx
│       ├── settings.tsx
│       ├── shopping/        # Toutes les pages shopping
│       └── tasks/           # Page des tâches
├── stores/                  # State management Zustand
├── types/                   # Types TypeScript partagés
└── tools/                   # Utilitaires (formatage, etc.)
```

---

## 🔑 Authentification

L'authentification repose sur des **tokens JWT** gérés entièrement côté client :

- L'**access token** est stocké en mémoire (Zustand) et injecté automatiquement dans chaque requête via un intercepteur Axios.
- Le **refresh token** est stocké dans un cookie HTTP-only géré par le backend.
- Un **heartbeat** vérifie régulièrement la validité de la session (toutes les 30 s en mode normal, 15 s en mode récupération réseau).
- En cas d'expiration du token, le refresh est déclenché **automatiquement et de manière transparente** pour l'utilisateur.

---

## 📜 Scripts disponibles

| Commande | Description |
|---|---|
| `npm run dev` | Démarre le serveur de développement avec HMR |
| `npm run build` | Compile l'application pour la production |
| `npm run start` | Démarre le serveur de production |
| `npm run typecheck` | Vérifie les types TypeScript |

---

<div align="center">

Fait avec ❤️ — *NestBoard, votre intranet maison.*

</div>
