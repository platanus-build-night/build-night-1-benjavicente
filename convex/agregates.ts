import { components } from "./_generated/api";
import { DataModel, Id } from "./_generated/dataModel";
import { TableAggregate } from "@convex-dev/aggregate";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

export const aggregateByMonthCategory = new TableAggregate<{
  Key: [Id<"categories">, number, number];
  DataModel: DataModel;
  Namespace: [Id<"users">, string];
  TableName: "movements";
}>(components.aggregateByMonthCategory, {
  sortKey: (doc) => [doc.category, doc.year, doc.month],
  sumValue: (doc) => doc.amount,
  namespace: (doc) => [doc.userId, doc.type],
});

export const agreateByCategoryByMonth = query({
  args: { month: v.number(), year: v.number() },
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    const categories = await ctx.db
      .query("categories")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();

    categories.map((category) => {
      aggregateByMonthCategory.sum(ctx, {
        namespace: [userId, category._id],
        bounds: {
          prefix: [category._id],
        },
      });
    });
  },
});
