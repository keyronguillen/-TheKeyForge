# Malta Clinics — SEO Outreach + Demo Landing Page

A two-part deliverable to pitch SEO/marketing services to real dental & aesthetic clinics in Malta.

## Structure

```
malta-clinics-seo/
├─ docs/
│  ├─ seo-analysis.md        # Section 1: 5 real clinics, failures, action list, notes, marketing plan
│  └─ outreach-templates.md  # Section 1.5: Email + WhatsApp PoC pitches
└─ landing-page/             # Section 2: clean, white, mobile-first demo site
   ├─ index.html
   ├─ css/styles.css
   └─ js/main.js
```

## Section 1 — SEO & Marketing
See [docs/seo-analysis.md](docs/seo-analysis.md). Audited 5 live clinics (ForteDent, Signature
Dental, ProDent Care, Regional Dental Clinic, Dental Implantology Unit). Top recurring failures:
**no Schema markup, missing image alt text, no/weak online booking, one site still on HTTP.**
Includes a senior-level marketing layer (GBP, reviews, medical-tourism, CRO, GDPR).

Outreach scripts (email + WhatsApp) in [docs/outreach-templates.md](docs/outreach-templates.md).

## Section 2 — Landing page
A demo "SmileMalta" clinic site showing the clinics what *good* looks like.
- **Mobile-first**, clean white palette, sticky footer.
- Hero → Services → Clinics carousel → **Booking (datetime picker + live availability calendar)**
  → Reviews → Contact → Footer.
- Login/Sign-up modal in the header, responsive hamburger menu.
- **GDPR cookie consent** banner + Schema/JSON-LD (the #1 audit gap, demonstrated fixed).
- Pure HTML/CSS/JS — no build step.

### Run it
```powershell
cd landing-page
python -m http.server 8000   # then open http://localhost:8000
```
Or just open `landing-page/index.html` in a browser.

> The availability calendar uses deterministic mock data on the client. In production the
> available slots come from the **admin backend via API**; the client only ever sees open dates.

## Sections 3 & 4 — TBD
Reserved (e.g. admin dashboard + booking API, payments). Not yet specified.
