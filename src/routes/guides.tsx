import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout only — hub SEO lives on `guides.index`; articles set their own head. */
export const Route = createFileRoute("/guides")({
  component: () => <Outlet />,
});
