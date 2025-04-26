import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";

interface RouterContext {
  // The ReturnType of your useAuth hook or the value of your AuthContext
  auth: ReturnType<typeof useConvexAuth>;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <>
      <div className="p-2 flex gap-2">
        <Link to="/" className="[&.active]:font-bold">
          Home
        </Link>{" "}
        <Link to="/app" className="[&.active]:font-bold">
          About
        </Link>
      </div>
      <hr />
      <Outlet />
    </>
  ),
});
