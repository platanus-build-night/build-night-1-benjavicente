import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

export const listRecent = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    const timeAgo = Date.now() - 5 * 60 * 1000;
    const runs = await ctx.db
      .query("runs")
      .withIndex("userId", (q) => q.eq("userId", userId).gte("_creationTime", timeAgo))
      .order("desc")
      .take(10);

    return runs;
  },
});

export const create = mutation({
  args: {
    email: v.string(),
    secretKey: v.string(),
  },
  handler: async (ctx, { secretKey, email }) => {
    if (secretKey !== process.env.SERVER_SECRET) throw new ConvexError("Invalid secret key");
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (!user) throw new ConvexError("Invalid user");
    const runId = await ctx.db.insert("runs", { userId: user._id, state: "reading-data" });
    return runId;
  },
});

export const update = mutation({
  args: {
    run: v.id("runs"),
    state: v.union(v.literal("reading-data"), v.literal("processing"), v.literal("ready")),
    secretKey: v.string(),
  },
  handler: async (ctx, { run, state, secretKey }) => {
    if (secretKey !== process.env.SERVER_SECRET) throw new ConvexError("Invalid secret key");
    const updatedRun = await ctx.db.patch(run, { state });
    return updatedRun;
  },
});
