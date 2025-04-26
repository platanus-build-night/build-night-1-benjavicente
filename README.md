# Tiuke.Money

Automatizando finanzas personales.

## ¿Que tiene esto?

- Lectura de correos con Cloudflare Workers Email
- Desbloqueo de PDFs con contraseña con Rust (lopdf) via WASM
- Lectura de PDFs con Google Gemini
- Backend en Convex para almacenar los movimientos
- Agente de OpenAI para ordenar los movimientos

## ¿Qué faltó?

- Buen Frontend (Tailwind, Tanstack Router, Vite, BaseUI)
- Añadir diseño propios
- Usar agregación, para ver la cantidad gastada por categoría
- Encontrar como evitar repetición de procesamiento (emails repetidos)
