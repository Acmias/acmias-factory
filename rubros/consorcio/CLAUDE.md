# CLAUDE.md · Rubro Consorcios (administración de N edificios)

Leé antes el `CLAUDE.md` raíz y `BRD-14-consorcios.md` (Proyecto ACMIAS).

## Dónde está cada cosa
- Lógica en `src/lib/rubros/consorcio/`:
  - `tipos.ts`: Administración, Edificio, Unidad, Personal, Gasto, Obra, Liquidación, Expensa, Pago, Aviso, Comunicado, Reclamo, Reserva;
  - `logica.ts`: cuenta corriente por unidad, prorrateo, cierre del mes, cobranza, pagos, obras, SUM, reclamos;
  - `datos-ejemplo.ts`: 3 edificios ficticios en Caseros (Tres de Febrero), 64 unidades, 3 meses liquidados. El historial se arma con la misma lógica de la app.
- Pantallas en `src/components/consorcio/`:
  - `PanelConsorcio`: Tablero, Gastos, Obras, Personal, Expensas, Cobranza, Espacios comunes, Comunicados y reclamos, Edificios;
  - `MiExpensa`: el vecino entra con `?uf=CODIGO` desde el WhatsApp;
  - `Documentos`: liquidación y recibo imprimibles, ilustraciones de obra;
  - `SitioConsorcio`.
- Pruebas: `tests/consorcio.spec.ts`. Guion: `docs/demos/consorcio.md`.

## Reglas de negocio
1. **Cuenta corriente:** deuda = todo lo cargado en expensas menos los pagos acreditados. Los pagos se imputan a las expensas más viejas primero.
2. **Cierre del mes:**
   - prorratea ordinarias, extraordinarias y fondo de reserva por porcentual, y corrige el redondeo en la unidad más grande;
   - suma el saldo anterior con el interés mensual del edificio y las reservas del SUM "a la expensa";
   - no se puede volver a cargar un gasto en un mes liquidado.
3. **Ley 14.701 (Provincia de Buenos Aires):**
   - la liquidación lleva lo del art. 11: datos de la administración y del consorcio, gastos con proveedor y CUIT, personal, seguros, honorarios, juicios, movimientos de la cuenta, estado de cuentas por unidad y **unidades en mora**;
   - el recibo lleva lo del art. 12, incluido "Sin deuda a la fecha";
   - los presupuestos se validan contra el art. 13 y no se puede elegir uno incompleto.
4. **Pagos:**
   - Mercado Pago se acredita solo, y solo si el edificio vinculó su cuenta (a nombre del consorcio);
   - la transferencia queda "a confirmar" hasta que la administración la ve en el banco.
5. **Morosos y SUM:** con 2 o más meses vencidos no se puede reservar el espacio común.
6. **Privacidad:** en la vista de los vecinos, la liquidación muestra iniciales en lugar de nombres.

## En la demo (simulado) y en la versión real
- **Mercado Pago:** en la demo, la vinculación de la cuenta y el pago son simulados y no se piden datos de tarjeta. En la versión real se usa el modelo Marketplace (Split 1:1), con OAuth por consorcio y Checkout Bricks.
- **WhatsApp:** en la demo, el envío masivo solo queda registrado; el envío individual abre WhatsApp. En la versión real se usa la Cloud API de Meta con plantillas de utilidad.
- **Fotos de obra:** son ilustraciones; la administración puede subir fotos reales.
- **Entre teléfonos:** que el vecino y la administración vean lo mismo desde dispositivos distintos depende de Neon.
