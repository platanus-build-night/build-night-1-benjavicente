import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "./index.css";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { convex, queryClient } from "./client";
import { useConvexAuth } from "convex/react";
import { QueryClientProvider } from "@tanstack/react-query";

const router = createRouter({
  routeTree,
  context: { auth: { isAuthenticated: false, isLoading: true } },
  defaultPreload: "viewport",
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

function App() {
  const authState = useConvexAuth();
  if (authState.isLoading) return null;
  return <RouterProvider router={router} context={{ auth: authState }} />;
}

const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <ConvexAuthProvider client={convex}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </ConvexAuthProvider>
    </StrictMode>
  );
}
