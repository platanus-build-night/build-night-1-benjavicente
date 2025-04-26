import { createFileRoute, redirect } from "@tanstack/react-router";
import { queryClient } from "../../client";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/_logged-in/app")({
  loader: async ({ location }) => {
    const settings = await queryClient.ensureQueryData(convexQuery(api.settings.get, {}));
    if (!settings) {
      throw redirect({
        to: "/request-an-invite",
        params: {
          redirect: location.href,
        },
      });
    }
  },
});
