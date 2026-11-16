# CLAUDE.md · Rubro Uñas (manicuría y nail art)

Leé antes el `CLAUDE.md` raíz y `BRD-13-unas.md` (Proyecto ACMIAS).

## Dónde está cada cosa
- Usa la **agenda genérica** de la barbería (`src/lib/rubros/barberia/`): turnos, huecos, lista de espera, bloqueos, sellos y métricas. El estado es `EstadoAgenda` con `rubro: 'unas'`.
- Lo propio del rubro: `src/lib/rubros/unas/` (`tipos.ts` con Diseno y EleccionDiseno, `logica.ts`, `datos-ejemplo.ts` con 3 manicuristas, 7 servicios, 15 esmaltes y 15 diseños).
- El diseño elegido queda en `Turno.diseno` (diseño del catálogo, enlace de Pinterest, captura, forma y nota).
- Pantallas: `src/components/unas/` (ReservaUnas, MuestraUnas, DisenoCita, PanelDisenos, SitioUnas). El panel es `PanelBarberia` con la pestaña "Diseños" y la ficha "Para esta cita"; el enlace de la clienta es `GestionTurno` con "Cambiar diseño".
- Pruebas: `tests/unas.spec.ts`. Guion: `docs/demos/unas.md`.

## Flujo de la clienta
Con quién → servicio → día y hora → diseño → confirmar. En el diseño, en este orden: trabajos de quien la atiende, lo que se hace en el equipo y su idea de Pinterest (enlace y captura opcional). Todo queda en la cita.

## Reglas
1. Los diseños de la demo son **ilustraciones SVG**; en la versión real van las fotos de los trabajos (con permiso de la clienta si se ven sus manos).
2. Los colores de esmalte son datos de producto del catálogo, no colores de la interfaz: la interfaz usa solo el motor de marca.
3. Pinterest: solo se guarda el enlace (pin.it y dominios de Pinterest) y, si la clienta quiere, una captura achicada en su teléfono. No se descargan imágenes de Pinterest.
4. La nota es para gustos del diseño (largo, colores, evento). No pedir datos de salud.
5. Fuera de la demo (próximamente): fotos reales del portfolio, cobro de la seña, recordatorio automático, sincronizar la cita entre teléfonos (Neon).
