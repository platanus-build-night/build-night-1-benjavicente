import { useAuthActions } from "@convex-dev/auth/react";
import { createFileRoute } from "@tanstack/react-router";
import * as v from "valibot";

export const Route = createFileRoute("/login")({
  validateSearch: v.object({
    redirect: v.optional(v.string()),
  }),
  component: RouteComponent,
});

function RouteComponent() {
  const { signIn } = useAuthActions();

  return <button onClick={() => void signIn("google")}>Sign in with Google</button>;
}
