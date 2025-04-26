import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { defaultCategories } from "./defaultCategories";
import { getAuthUserId } from "@convex-dev/auth/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");
    const settings = await ctx.db
      .query("settings")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first();

    return settings;
  },
});

export const getFromUser = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");
    const settings = await ctx.db
      .query("settings")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .first();

    return settings;
  },
});

export const create = internalMutation({
  args: {
    userId: v.id("users"),
    currency: v.string(),
  },
  handler: async (ctx, { currency, userId }) => {
    await Promise.all(
      defaultCategories.map((category) => ctx.db.insert("categories", { ...category, userId: userId }))
    );
    await ctx.db.insert("settings", { userId, currency });
  },
});
