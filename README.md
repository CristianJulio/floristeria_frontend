# Floristería — frontend

Internal web app for the shop's staff: registering orders, managing products, payments and users.
It talks to the API in `../backend`.

## Stack

- React 19 + TypeScript + Vite (with the React Compiler)
- shadcn/ui + Tailwind CSS
- React Router
- TanStack Query
- React Hook Form + zod

## Running it locally

1. Start the backend (see `../backend`), which runs on `http://localhost:3010`.
2. Create a `.env` file in this folder with the API's address:
   ```
   VITE_API_URL=http://localhost:3010
   ```
3. Install and start:
   ```
   npm install
   npm run dev
   ```
   The app runs on `http://localhost:5173`, the address the backend's `CORS_ORIGIN` allows.
