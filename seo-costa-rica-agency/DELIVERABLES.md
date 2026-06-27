# Entregables — Sistema de captación SEO (Costa Rica)

Cuatro piezas listas para usar, alineadas con el brief de `README`
(clínicas, dentistas y pymes del GAM · español primero · WhatsApp + SINPE Móvil).

```
seo-costa-rica-agency/
├─ README                      # Brief original del proyecto
├─ DELIVERABLES.md             # Este archivo
├─ data/
│  └─ outreach-targets.csv     # (4) CSV de prospectos con datos de contacto
├─ outreach-tracker/
│  └─ index.html               # (1) Rastreador de prospectos (estático)
├─ tools/
│  ├─ audit.js                 # (2) Auditor de sitios (Node, sin dependencias)
│  └─ urls.sample.txt          # Lista de URLs de ejemplo para el auditor
└─ landing-page/
   ├─ index.html               # (3) Landing page lista para desplegar
   ├─ css/styles.css
   └─ js/main.js
```

## 1) Rastreador de prospectos — `outreach-tracker/index.html`
Herramienta estática (abrir con doble clic). Registra **5 objetivos por vertical**
(Clínicas, Dentistas, Pymes) con sus **puntajes SEO**, HTTPS, móvil y velocidad.
- KPIs, filtros por vertical/estado, búsqueda y orden por columna.
- Guarda en `localStorage`; **Importar / Exportar CSV**; botón **Restaurar** datos de ejemplo.
- Enlace directo a WhatsApp por prospecto (`wa.me/506…`).

## 2) Auditor de sitios — `tools/audit.js`
Revisa **HTTPS, responsive móvil y velocidad** (+ señales SEO básicas). Node ≥18, sin dependencias.
```bash
node tools/audit.js https://sitio1.cr https://sitio2.com
node tools/audit.js --file tools/urls.sample.txt --csv reporte.csv --json reporte.json
```
Sin argumentos usa `tools/urls.sample.txt`. Imprime un reporte por sitio + resumen,
y puede exportar a CSV/JSON. Detecta http→https, certificados inválidos, falta de
`<meta viewport>`, TTFB/tiempo total y un puntaje global 0–100.

## 3) Landing page — `landing-page/index.html`
Página vanilla HTML/CSS/JS **mobile-first**, lista para desplegar (Vercel/Netlify/GitHub Pages).
- Español primero, **WhatsApp-first** (botón flotante + CTAs con mensaje prellenado).
- 3 planes (**$150 / $450 / $900**, equivalente en ₡) con mención de **SINPE Móvil**.
- Mini-formulario de auditoría que arma el mensaje y abre WhatsApp.
- SEO on-page: title/description con keywords del brief, Open Graph, JSON-LD `ProfessionalService`, banner de cookies.
- ⚙️ Cambiá el número en `landing-page/js/main.js` → `WA_NUMBER` (formato `506XXXXXXXX`).

## 4) CSV de prospectos — `data/outreach-targets.csv`
15 prospectos (5 por vertical) con campos de contacto: vertical, negocio, cantón/provincia,
sitio, https, móvil, velocidad, **seo_score**, contacto, teléfono, **whatsapp**, email,
instagram, estado, próxima acción y notas. Es el mismo set semilla del rastreador.

> ⚠️ **Nota:** los nombres y datos de contacto son **ilustrativos** (números/correos de muestra).
> Reemplazalos con prospectos reales de tu investigación antes de hacer outreach.
