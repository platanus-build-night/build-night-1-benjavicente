import { ConvexError, v } from "convex/values";
import { internalQuery, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("User not authenticated");

    const categories = await ctx.db
      .query("categories")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();

    return categories;
  },
});

export const getFromUser = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();

    return categories;
  },
});
