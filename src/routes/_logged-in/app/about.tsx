import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_logged-in/app/about")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div className="font-bold text-red-50">Hello "/about"!</div>;
}
