import { Schema, Type } from "@google/genai";

export const systemInstruction = () => `
Debes tomar los archivos adjuntos y el contenido del usuario y resumir los movimientos bancarios.
Para esto, es necesario que que extraigas información de las transacciones bancarias, pagos y compeas.

Debes entregar los siguientes datos:
- Día
- Mes
- Año
- Monto, en formato float
- Nombre del movimiento raw: el nombre original del movimiento
- Nombre del movimiento: el nombre limpiado, eliminando información necesaria.
- Categoría: en que clasifica el movimiento, dependiendo de las categorías.
- Tipo: Si es un gasto o ingreso.
- Identificador de la tarjeta o cuenta: usualmente es los últimos 4 dígitos de la tarjeta o cuenta.
- Moneda: la moneda en la que se realizó el movimiento. Puede ser CLP, USD, EUR, etc.

Las categorías son las siguientes:
- Comida
- Entretenimiento
- Salud
- Transporte
- Hogar
- Inversión
- Sueldo
- Transferencia
- Otros

Si tienes la herramienta, puedes buscar en internet para identificar la categoría.

Para limpiar el nombre, debes eliminar información necesaria y dejar solo lo relevante.
Por ejemplo:

1. PAGO:MERPAGO*LAGUNA PI -> Laguna Pi.
No es relevanto dejar que es un pago, ni mercado pago, que es el medio de pago.

2. AGO:SUC VITACURA 5321 -> Sucursal Vitacura 5321
Expandir abreviaciones.

3. MIT Burger -> MIT Burger
No dejar en minúsculas abreviaciones desconocidas.

El esquema de cada transferencia es el siguiente:
${JSON.stringify(schema)}
No añadas espacios innecesarios en el JSON.
`;

export const schema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      day: { type: Type.INTEGER },
      month: { type: Type.INTEGER },
      year: { type: Type.INTEGER },
      amount: { type: Type.NUMBER },
      raw_transaction_name: { type: Type.STRING },
      clean_transaction_name: { type: Type.STRING },
      category: { type: Type.STRING },
      type: { type: Type.STRING },
      account_identifier: { type: Type.STRING },
      currency: { type: Type.STRING },
    },
    required: [
      "day",
      "month",
      "year",
      "amount",
      "raw_transaction_name",
      "clean_transaction_name",
      "category",
      "type",
      "account_identifier",
      "currency",
    ],
  },
} as const;
