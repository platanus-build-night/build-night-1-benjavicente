/* eslint-disable @typescript-eslint/no-unused-vars */

import PostalMine from "postal-mime";
import { GoogleGenAI } from "@google/genai";
import { createMimeMessage } from "mimetext";
import { EmailMessage } from "cloudflare:email";
import initWASM, { remove_pdf_password } from "../pdf_password_remover/pkg/pdf_password_remover";
import wasm from "../pdf_password_remover/pkg/pdf_password_remover_bg.wasm";
import { Buffer } from "node:buffer";

const emailRoute = "robots@tiuke.money";
let wasmReady = false;

export default {
  // fetch(request) {
  //   const url = new URL(request.url);

  //   if (url.pathname.startsWith("/api/")) {
  //     return Response.json({
  //       name: "Cloudflare",
  //     });
  //   }
  // return new Response(null, { status: 404 });
  // },
  // ignore unused ctx

  async email(message, env, _ctx) {
    if (!wasmReady) {
      await initWASM(wasm);
      wasmReady = true;
    }

    const ai = new GoogleGenAI({ apiKey: env.GOOGLE_AI_API_KEY });

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
        systemInstruction: "Entrega los detalles del mobimiento del banco, incluyendo fecha, monto, nomnre y categoría",
      },
    });

    console.info(JSON.stringify(response));

    const msg = createMimeMessage();
    msg.setSender({ name: "Tiuke Robots", addr: emailRoute });
    msg.setHeader("In-Reply-To", message.headers.get("Message-ID") ?? "");
    msg.setRecipient(message.from);
    msg.setSubject("Re: " + email.subject);
    msg.addMessage({
      contentType: "text/plain",
      data: response.text!,
    });

    console.info("msg", JSON.stringify(msg.headers));

    const replyMessage = new EmailMessage(emailRoute, message.from, msg.asRaw());

    await message.reply(replyMessage);
  },
} satisfies ExportedHandler<Env>;
