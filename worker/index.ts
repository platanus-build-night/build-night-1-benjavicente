/* eslint-disable @typescript-eslint/no-unused-vars */

import PostalMine from "postal-mime";
import { GoogleGenAI } from "@google/genai";
import { createMimeMessage } from "mimetext";
import { EmailMessage } from "cloudflare:email";
import initWASM, { remove_pdf_password } from "../pdf_password_remover/pkg/pdf_password_remover";
import wasm from "../pdf_password_remover/pkg/pdf_password_remover_bg.wasm";
import { Buffer } from "node:buffer";
import { schema, systemInstruction } from "./ai";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { Id } from "../convex/_generated/dataModel.js";

const emailRoute = "robots@tiuke.money";
let wasmReady = false;

export default {
  async fetch(request, env, ctx) {
    return new Response(null, { status: 404 });
  },
  async email(message, env, _ctx) {
    let runId: Id<"runs">;
    try {
      if (!wasmReady) {
        await initWASM(wasm);
        wasmReady = true;
      }

      const ai = new GoogleGenAI({ apiKey: env.GOOGLE_AI_API_KEY });
      const convex = new ConvexHttpClient(env.CONVEX_URL);

      runId = await convex.mutation(api.runs.create, {
        secretKey: env.SERVER_SECRET,
        email: message.from,
      });

      const rawEmail = new Response(message.raw);
      const email = await PostalMine.parse(await rawEmail.arrayBuffer());

      console.info("atachments", JSON.stringify(email.attachments));
      const base64Files: { data: string; mimeType: string }[] = [];
      for (const attachment of email.attachments) {
        console.info("attachment", attachment.filename);
        if (attachment.mimeType === "application/pdf") {
          const pdf = attachment;
          let pdfBuffer = pdf.content;
          if (typeof pdfBuffer === "string") {
            console.info("pdf buffer is string");
            pdfBuffer = Buffer.from(pdfBuffer, "base64");
          } else {
            console.info("pdf buffer is not string");
            pdfBuffer = Buffer.from(pdfBuffer);
          }

          console.info("extracting pdf buffer");
          const pdfWithoutPassword = await remove_pdf_password(new Uint8Array(pdfBuffer), ["9910"]);
          const file = Buffer.from(pdfWithoutPassword).toString("base64");
          console.info("pdf buffer extracted");
          base64Files.push({ data: file, mimeType: pdf.mimeType });
        }
      }

      const content = email.html ?? email.text;

      if (!content) throw new Error("No content found");

      console.log("email from", message.from);
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            parts: [
              ...base64Files.map((file) => ({
                inlineData: {
                  data: file.data,
                  mimeType: file.mimeType,
                },
              })),
              {
                text: content,
              },
            ],
          },
        ],
        config: {
          systemInstruction: systemInstruction(),
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });

      if (!response.text) throw new Error("No data found");

      if (response.text.length < 8) {
        console.info("No data found");
        return;
      }

      const [added] = await Promise.all([
        convex.action(api.movements.addMovementsWithAI, {
          data: response.text,
          email: message.from,
          secretKey: env.SERVER_SECRET,
        }),
        convex.mutation(api.runs.update, {
          run: runId,
          state: "processing",
          secretKey: env.SERVER_SECRET,
        }),
      ]);

      const msg = createMimeMessage();
      msg.setSender({ name: "Tiuke Robots", addr: emailRoute });
      msg.setHeader("In-Reply-To", message.headers.get("Message-ID") ?? "");
      msg.setRecipient(message.from);
      msg.setSubject("Re: " + email.subject);
      msg.addMessage({
        contentType: "text/plain",
        data: `Añadí ${added} movimientos a tu cuenta. Puedes verlos en la app.`,
      });

      console.info("msg", JSON.stringify(msg.headers));

      const replyMessage = new EmailMessage(emailRoute, message.from, msg.asRaw());

      await message.reply(replyMessage);
      await convex.mutation(api.runs.update, {
        run: runId,
        state: "ready",
        secretKey: env.SERVER_SECRET,
      });
    } catch (error) {
      console.error("Error processing email", error);
      // TODO: handle error
    }
  },
} satisfies ExportedHandler<Env>;
