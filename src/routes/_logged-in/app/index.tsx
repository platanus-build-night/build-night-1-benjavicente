import { createFileRoute } from "@tanstack/react-router";
import { usePaginatedQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useSuspenseQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { queryClient } from "../../../client";
import * as Icons from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/_logged-in/app/")({
  loader: async () => {
    await Promise.all([
      queryClient.ensureQueryData(convexQuery(api.settings.get, {})),
      queryClient.ensureQueryData(convexQuery(api.categories.list, {})),
      queryClient.ensureQueryData(convexQuery(api.runs.listRecent, {})),
    ]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data: categories } = useSuspenseQuery(convexQuery(api.categories.list, {}));
  const { data: runs } = useSuspenseQuery(convexQuery(api.runs.listRecent, {}));
  const { results, status, loadMore } = usePaginatedQuery(api.movements.list, {}, { initialNumItems: 30 });

  const groupedByDay = useMemo(() => {
    return results
      .reduce((acc, item) => {
        if (acc.at(-1)?.dateStr !== item.dateStr) acc.push({ dateStr: item.dateStr, items: [] });
        acc[acc.length - 1].items.push(item);
        return acc;
      }, [] as { dateStr: string; items: (typeof results)[number][] }[])
      .sort((a, b) => {
        const dateA = new Date(a.dateStr);
        const dateB = new Date(b.dateStr);
        return dateB.getTime() - dateA.getTime();
      });
  }, [results]);

  return (
    <div className="max-w-xl mx-auto">
      <div>
        {runs.map(({ state, _id }) => (
          <div key={_id}>
            Run {_id} - {state}
          </div>
        ))}
      </div>
      <h2>Movimientos</h2>
      <div className="flex flex-col gap-2">
        {groupedByDay.map(({ items }) => (
          <>
            <div>
              {new Intl.DateTimeFormat("es-CL", {
                year: "numeric",
                month: "long",
                day: "2-digit",
              }).format(new Date(items[0].year, items[0].month - 1, items[0].day))}
            </div>
            <>
              {items.map(({ _id, name, amount, category, accountIdentifier }) => (
                <BankMovementItem
                  key={_id}
                  amount={amount}
                  name={name}
                  category={categories.find((cat) => cat._id === category)!.name}
                  emoji={categories.find((cat) => cat._id === category)!.emoji}
                />
              ))}
            </>
          </>
        ))}
      </div>
      <button className="disabled:text-gray-400" onClick={() => loadMore(5)} disabled={status !== "CanLoadMore"}>
        Load More
      </button>
    </div>
  );
}

interface BankMovementItemProps {
  name: string;
  amount: number;
  category: string;
  emoji: string;
}

function BankMovementItem({ name, amount, category, emoji }: BankMovementItemProps) {
  const isPositive = amount >= 0;

  const formattedAmount = new Intl.NumberFormat("en-CL", {
    style: "currency",
    currency: "CLP",
  }).format(Math.abs(amount));

  return (
    <div className="overflow-hidden border rounded-lg shadow-sm tabular-nums">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              <span className="text-lg" role="img" aria-label={category}>
                {emoji}
              </span>
            </div>
            <div>
              <h3 className="font-medium">{name}</h3>
              <p className="text-sm text-gray-500">{category}</p>
            </div>
          </div>
          <div>{}</div>
          <div className="flex items-center">
            <span className={`font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
              {isPositive ? "+" : "-"}
              {formattedAmount}
            </span>
            <div className={`ml-2 ${isPositive ? "text-green-600" : "text-red-600"}`}>
              {isPositive ? <Icons.ArrowUpRight className="h-4 w-4" /> : <Icons.ArrowDownRight className="h-4 w-4" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
