# CLAUDE.md · Rubro Uñas (manicuría y nail art)

Leé antes el `CLAUDE.md` raíz y `BRD-13-unas.md` (Proyecto ACMIAS).

## Dónde está cada cosa
- Usa la **agenda genérica** de la barbería (`src/lib/rubros/barberia/`): turnos, huecos, lista de espera, bloqueos, sellos y métricas. El estado es `EstadoAgenda` con `rubro: 'unas'`.
- Lo propio del rubro, en `src/lib/rubros/unas/`:
  - `tipos.ts`: Diseno con carpeta, Adicional, Opinion, CobroSalon, PagoTurno;
  - `logica.ts`;
  - `datos-ejemplo.ts`.
- El turno guarda `diseno` (foto de referencia y nota), `adicionales` (ids) y `pago` (forma de pago y estado de la seña).
- Pantallas, en `src/components/unas/`:
  - `ReservaUnas` (inicio + reserva) e `InicioSalon` (carpetas y opiniones);
  - `DisenoCita` (galería, detalle de la cita, estrellas);
  - `PanelDisenos` (Diseños, Precios y seña, Opiniones);
  - `TurnoUnas` (enlace de la clienta: seña pendiente y opinión);
  - `SitioUnas`.
- El panel es `PanelBarberia` con tres pestañas extra y la ficha "Para esta cita".
- Pruebas: `tests/unas.spec.ts`. Guion: `docs/demos/unas.md`.

## Flujo (definido por Maikel y Marilyn, 16 nov 2026)
1. **Inicio:** catálogo para mirar en tres carpetas (Diseños del salón, Inspiraciones, Tendencias 2027), opiniones con estrellas y botón "Reservar turno".
2. **Servicio**, con su precio.
3. **¿Querés agregar un diseño?:** lista de adicionales con precio (muñequitos, princesita…). Es opcional y la dueña la puede apagar.
4. **Foto de referencia:** opcional, de las mismas carpetas, con la opción "No, otro / sin foto". No se arma el diseño en la página.
5. **Día y hora**, con un filtro opcional de manicurista.
6. **Forma de pago del resto** (efectivo o Mercado Pago). La **seña** se paga siempre por el medio de la dueña (alias o enlace) y la clienta manda el **comprobante por WhatsApp**.
7. **La dueña confirma la seña** en "Para preparar"; con eso el turno pasa a confirmado.

## Reglas
1. Sin pasarela de pago: alias o enlace y comprobante por WhatsApp. El cobro integrado es un módulo "próximamente".
2. En la demo, los diseños son **ilustraciones SVG**. En la versión real, la dueña sube sus fotos. En Inspiraciones van fotos propias o con permiso; de las ajenas se guarda solo el enlace al pin.
3. Las opiniones de la demo son de ejemplo y lo dicen. Las reales las deja la clienta desde su turno, solo después de la cita y una por turno; la dueña puede ocultarlas.
4. Los colores de esmalte son datos de producto del catálogo, no colores de la interfaz.
5. La nota es para gustos del diseño. No pedir datos de salud.
