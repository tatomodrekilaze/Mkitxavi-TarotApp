import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Layout only — hub SEO lives on `tarot.index`; cards set their own head. */
export const Route = createFileRoute("/tarot")({
  component: () => <Outlet />,
});
