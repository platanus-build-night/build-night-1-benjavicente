import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.string(), // required email
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
  }).index("email", ["email"]),
  runs: defineTable({
    userId: v.id("users"),
    state: v.union(v.literal("reading-data"), v.literal("processing"), v.literal("ready")),
  }).index("userId", ["userId"]),
  settings: defineTable({
    userId: v.id("users"),
    currency: v.string(),
  }).index("userId", ["userId"]),
  categories: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.string(),
    color: v.string(),
    emoji: v.string(),
    isDefault: v.boolean(),
  })
    .index("userId", ["userId"])
    .index("default", ["userId", "isDefault"]),
  movements: defineTable({
    dateStr: v.string(),
    userId: v.id("users"),
    day: v.number(),
    month: v.number(),
    year: v.number(),
    amount: v.number(),
    name: v.string(),
    rawName: v.string(),
    category: v.id("categories"),
    type: v.union(v.literal("income"), v.literal("expense")),
    accountIdentifier: v.string(),
  })
    .index("userId", ["userId"])
    .index("by_day", ["userId", "dateStr"]),
});
