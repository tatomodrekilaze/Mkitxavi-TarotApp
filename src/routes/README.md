# Routes

This app uses TanStack Start's file-based router. Route files live here; the shared shell is `__root.tsx`.

- `index.tsx` serves the home page.
- `about.tsx` serves /about.
- A dollar-prefixed segment is dynamic: `guides.$slug.tsx` serves individual guides.
- API handlers live in `api/`.

Keep the shell's Outlet so nested routes can render. The router generates `src/routeTree.gen.ts`; update route files instead of editing that output.
