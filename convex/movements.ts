import { getAuthUserId } from "@convex-dev/auth/server";
import { action, internalMutation, internalQuery, MutationCtx, query } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import OpenAI from "openai";
import { zodResponseFormat, zodFunction } from "openai/helpers/zod";

import { z } from "zod";
import { Doc } from "./_generated/dataModel";
import { aggregateByMonthCategory } from "./agregates";

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { paginationOpts }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    return await ctx.db
      .query("movements")
      .withIndex("by_day", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(paginationOpts);
  },
});

export const getRunStuff = internalQuery({
  args: {
    email: v.string(),
    secretKey: v.string(),
  },
  handler: async (ctx, { email, secretKey }) => {
    if (secretKey !== process.env.SERVER_SECRET) return { ok: false, error: "Invalid secret key" } as const;

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    if (!user) return { ok: false, error: "User not found" } as const;

    const settings = await ctx.db
      .query("settings")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .first();

    if (!settings) return { ok: false, error: "Settings not found" } as const;

    const categories = await ctx.db
      .query("categories")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .collect();

    return { ok: true, settings, categories, user } as const;
  },
});

const movementsInputSchema = z.object({
  movements: z.array(
    z.object({
      day: z.number(),
      month: z.number(),
      year: z.number(),
      amount: z.number(),
      name: z.string(),
      rawName: z.string(),
      category: z.string(),
      type: z.union([z.literal("income"), z.literal("expense")]),
      accountIdentifier: z.string(),
    })
  ),
});

const devPrompt = () => `
Debes los datos de movimientos y guardalos en la base de datos.
Se te entregará la configuración del usuario, sus categorías, y los movimientos.

Deberás evitar añadir movimientos duplicados, y elegir correctamente la categoría.
Solo debes guardar los movimientos que sean de la misma currency que la del usuario.

Debes responder como una lista de movimientos, donde cada movimiento tiene que tener
todos los campos requeridos. Omite otros campos y movimientos incompletos.

En las categorías, debes retornar el id de la categoría, y no su nombre.
`;

const userPromopt = (stuff: { settings: Doc<"settings">; categories: Doc<"categories">[]; movements: string }) => `
<configuracion>
Currency: ${stuff.settings.currency}
</configuracion>
<categorias>
${stuff.categories
  .map(
    (descr) =>
      `- ${descr.name}${descr.isDefault ? " (opción por defecto)" : ""} [id: ${descr._id}]": ${descr.description}`
  )
  .join("\n")}
</categorias>
<movimientos>
${stuff.movements}
</movimientos>
`;

export const addMovementsWithAI = action({
  args: {
    email: v.string(),
    data: v.string(),
    secretKey: v.string(),
  },
  handler: async (ctx, { data, email, secretKey }) => {
    const stuff = await ctx.runQuery(internal.movements.getRunStuff, {
      email,
      secretKey,
    });

    if (!stuff.ok) throw new ConvexError(stuff.error);

    const { categories, settings, user } = stuff;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const run = await openai.beta.chat.completions.runTools({
      model: "gpt-4o-mini",
      response_format: zodResponseFormat(movementsInputSchema, "movements", {
        description: "Lista de movimientos",
      }),
      messages: [
        {
          role: "system",
          content: devPrompt(),
        },
        {
          role: "user",
          content: userPromopt({
            categories,
            settings,
            movements: data,
          }),
        },
      ],
      tools: [
        zodFunction({
          name: "get-old-movements",
          description: "Para obtener movimientos antiguos y evitar duplicados. Inclusive.",
          parameters: z.object({
            from: z.object({ year: z.number(), month: z.number(), day: z.number() }),
            to: z.object({ year: z.number(), month: z.number(), day: z.number() }),
          }),
          function: async ({ from, to }) => {
            const response = await ctx.runQuery(internal.movements.getMovementsInRange, { from, to, userId: user._id });
            return JSON.stringify(response);
          },
        }),
      ],
    });
    const completion = await run.finalChatCompletion();
    const movements = completion.choices[0].message.parsed!.movements;

    const added: number = await ctx.runMutation(internal.movements.saveAIMovements, {
      userId: user._id,
      movements,
    });

    return added;
  },
});

export const getMovementsInRange = internalQuery({
  args: {
    userId: v.id("users"),
    from: v.object({
      year: v.number(),
      month: v.number(),
      day: v.number(),
    }),
    to: v.object({
      year: v.number(),
      month: v.number(),
      day: v.number(),
    }),
  },
  handler: async (ctx, { from, to, userId }) => {
    const movements = await ctx.db
      .query("movements")
      .withIndex("by_day", (q) =>
        q
          .eq("userId", userId)
          .gte("dateStr", `${from.year}-${from.month}-${from.day}`)
          .lte("dateStr", `${to.year}-${to.month}-${to.day}`)
      )
      .collect();

    return movements;
  },
});

export const saveAIMovements = internalMutation({
  args: {
    userId: v.id("users"),
    movements: v.array(
      v.object({
        day: v.number(),
        month: v.number(),
        year: v.number(),
        amount: v.number(),
        name: v.string(),
        rawName: v.string(),
        category: v.string(),
        type: v.union(v.literal("income"), v.literal("expense")),
        accountIdentifier: v.string(),
      })
    ),
  },
  handler: async (ctx, { userId, movements }): Promise<number> => {
    const promises = await Promise.all(
      movements.map((movement) => {
        // @ts-expect-error TODO: el id de la categoría no se valida
        return insertMovement(ctx, {
          userId,
          ...movement,
        });
      })
    );
    return promises.length;
  },
});

async function insertMovement(ctx: MutationCtx, movement: Doc<"movements">) {
  const id = await ctx.db.insert("movements", {
    userId: movement.userId,
    day: movement.day,
    month: movement.month,
    year: movement.year,
    amount: movement.amount,
    name: movement.name,
    rawName: movement.rawName,
    category: movement.category,
    type: movement.type,
    accountIdentifier: movement.accountIdentifier,
    dateStr: `${movement.year}-${movement.month}-${movement.day}`,
  });

  const doc = await ctx.db.get(id);
  if (!doc) throw new ConvexError("Movement not found");
  aggregateByMonthCategory.insert(ctx, doc);

  return id;
}
