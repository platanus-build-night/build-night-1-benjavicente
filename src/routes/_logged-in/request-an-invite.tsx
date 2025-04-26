import { createFileRoute, Navigate } from "@tanstack/react-router";
import { queryClient } from "../../client";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import { useSuspenseQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/_logged-in/request-an-invite")({
  loader: async () => {
    await queryClient.ensureQueryData(convexQuery(api.settings.get, {}));
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data } = useSuspenseQuery(convexQuery(api.settings.get, {}));
  if (data) return <Navigate to="/app" />;

  return <div>Necesitas una invitación :(</div>;
}
