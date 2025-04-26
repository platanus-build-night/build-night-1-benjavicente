import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="p-2">
      <h3>Welcome!</h3>
      <img src="/tiuke.png" alt="tiuke" className="w-1/2 mx-auto" />
    </div>
  );
}
