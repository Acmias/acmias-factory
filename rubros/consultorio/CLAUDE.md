# CLAUDE.md · Rubro Consultorio (variantes Clínica y Procedimientos)

> Todo agente que trabaje en este rubro lo lee **después** del `CLAUDE.md` raíz y de `AGENTES-FACTORY.md`, y **antes** de tocar código o diseño.
> Versión 2.0 · 22 nov 2026 · borrador para revisar con el equipo.
> Alcance: `BRD-05-consultorio.md` (agenda) y `BRD-15-consultorio-clinico.md` (CLI-01 a CLI-41). Especificación de la demo: `DEMO-15-consultorio-clinico.md`. Pantallas: canvas "ACMIAS · Consultorio clínico · Pantallas de la demo".

## 1. Qué está construido (22 nov 2026)

| Pieza | Dónde |
| --- | --- |
| Agenda, reserva, lista de espera, ficha administrativa (BRD 05) | `src/components/consultorio/`, motor en `src/lib/rubros/barberia/` |
| Datos clínicos ficticios (fichas, evoluciones, recetas, resultados, presupuestos, fotos, permisos, familia) | `src/lib/rubros/consultorio/clinico/datos.ts` |
| Lógica clínica (firma, mensajes neutros, presupuestos, reportes, validación, compartir) | `src/lib/rubros/consultorio/clinico/logica.ts` |
| Panel: Inicio, Consultas, Resultados, Presupuestos, Galería, Reportes, "Ver como" y "Mostrar como" | `src/components/consultorio/clinico/PanelConsultorio.tsx` (suma pestañas a `PanelBarberia` con `extras`) |
| Portal del paciente con código de un solo uso | `/d/[slug]/portal` · `PortalPaciente.tsx` |
| Validación pública del QR (sin contenido) | `/d/[slug]/validar#v=…` · `ValidarDocumento.tsx` |
| Simulador de WhatsApp con secretaria virtual de respuestas fijas | `Simulador.tsx` |
| Gráficos de una serie con "Ver como tabla" (skill `dataviz`) | `Graficos.tsx` |
| Pruebas | `tests/consultorio.spec.ts`, `tests/consultorio-clinico.spec.ts` (390 y 1440 px) |

**Separación de datos:** la agenda se guarda en `acmias:demo:{slug}` y sigue sin campos clínicos (lo verifica una prueba). Lo clínico va en `acmias:demo:{slug}:clinico`, se borra con "Reiniciar demo" y con la demo.

**Falta (después del Demo Day):** preconsulta, check-in con QR y cola en vivo, récipe impreso, versiones editables de ítems, caja, alquiler de consultorio, stock y margen, permisos configurables, resumen semanal, pediatría y otros paquetes de especialidad.

## 2. Principios de experiencia (UX)

La meta: **un médico de 60 años y su secretaria lo usan sin capacitación, y un paciente reserva sin ayuda.**

1. Una pantalla, una tarea: un solo botón principal (color del consultorio).
2. Tres toques para lo frecuente.
3. Estado con color **y** texto, nunca solo color.
4. Nada se pierde; "¿estás seguro?" solo al firmar o borrar.
5. Primero el celular: 390 px, botones de 44 px o más.
6. Lenguaje del consultorio, no del sistema.
7. Vacíos que enseñan y errores que dicen qué hacer.
8. Privacidad visible: PIN, candado, registro de accesos.
9. Accesible: contraste 4,5:1, foco visible, etiquetas, teclado.
10. Lo simulado, rotulado ("Simulación", "Pago simulado", "Demo — sin validez legal").

## 3. Skills por etapa

| Etapa | Skills |
| --- | --- |
| Diseño | Tipo **Design**, `frontend-design`, Design System "ACMIAS", `acmias-fundacion` |
| Arquitectura | `feature-dev:code-architect`, `feature-dev:code-explorer`, `acmias-implementacion` |
| Programación | `feature-dev`, `vercel-react-best-practices`, `react-view-transitions` |
| Gráficos | `dataviz` |
| Textos | `writing-style-and-tone`, `acmias-comercial` |
| Validación | `web-design-guidelines`, Playwright 390 y 1440 px, `code-review`, `pr-review-toolkit`, `security-guidance` |

Ninguna pantalla nueva se programa sin su artboard aprobado.

## 4. Reglas del rubro

1. Solo datos ficticios. Aviso fijo: "Demo con datos ficticios. No cargues datos reales de pacientes."
2. **Excepción propuesta (22 nov 2026, a confirmar en la revisión del equipo):** los módulos clínicos son editables en la demo con datos ficticios; se borran con "Reiniciar demo" y al vencer la demo.
3. Receta, certificados y validación pública llevan "Demo — sin validez legal". La validación nunca muestra el contenido.
4. Simuladores de WhatsApp, pago y dictado siempre rotulados. El dictado no usa micrófono ni IA.
5. Ninguna IA recibe datos de pacientes. La secretaria virtual tiene respuestas fijas y nunca da consejos médicos.
6. Galería solo con ilustraciones; PIN siempre pedido; cada apertura queda registrada; sin descarga.
7. Mensajes al paciente neutros: `PALABRAS_CLINICAS` en `logica.ts` y prueba automática.
8. La secretaría no ve evoluciones, resultados, galería ni reportes clínicos.
9. Lo no construido se muestra como "Próximamente".
10. Toda pantalla pública dice "Demo ilustrativa" y lleva `noindex`.

## 5. Validación antes de cada merge

- [ ] Criterio de aceptación de la historia cumplido y coincide con su artboard
- [ ] Capturas a 390 y 1440 px con 3 combinaciones de colores de cliente
- [ ] `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:e2e` en verde
- [ ] Ningún mensaje del simulador con palabras clínicas
- [ ] Guardián de Marca: textos honestos y rótulos de simulación

## 6. Puertas humanas 🔒

- Merge a producción → Responsable Técnico.
- Precio en pantalla → Responsable Comercial.
- Excepción de datos clínicos en la demo → fundador, en la revisión con el equipo.
- Antes del primer consultorio real: contrato de encargado de tratamiento, política de privacidad, revisión legal local; receta real solo con plataforma registrada en ReNaPDiS (propia o integrada).
