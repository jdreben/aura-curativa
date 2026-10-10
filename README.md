# Aura Curativa

**¿Me reembolsan?** Before a patient in Puerto Rico pays a provider outside their plan's network, Aura
Curativa tells them whether their plan will pay them back, roughly how much, what would cost less, and
exactly how to file the claim.

**Live demo:** https://auracurativa.pages.dev (no account needed)

## Why

Many good providers in Puerto Rico don't take insurance. Patients pay cash and assume their plan will
reimburse them. Often it won't, and when it will, the amount is set by the insurer's contracted rate,
not by what the patient paid. Claims that are filed get returned for a missing NPI, license or stamped
receipt. Nobody tells the patient any of this before they pay.

We read the 2027 policies and published estimates so patients don't have to:

- **Triple-S individual plans** (Directo Bronce/Plata, Pocket Plata/Oro, Uno Plata) are closed networks.
  A routine out-of-network visit in PR is not reimbursable. A few named routes are: Contigo Fit ($20/month
  for acupuncture, massage, reflexology), adult glasses ($75/year), and 100% minus copay when no network
  provider offers the service.
- Where Triple-S does reimburse (plans with a reimbursement benefit), it pays its *contracted rate* minus
  copay, not what the patient paid. Its published average for a specialist visit is about **$17**.
- **First Medical Directo 2027** (Gold Plus, Gold, Silver Plus, Silver) does reimburse out of network:
  the highest in-network rate for the same specialty, minus copay or coinsurance. Claims are due within
  **90 days**. Acupuncture is excluded.

## What the patient does

1. **Su plan.** Pick the insurer (Triple-S or First Medical), then the exact 2027 individual plan.
2. **Su servicio.** Pick the service and enter what it costs.
3. **Su respuesta.** Reimbursable or not, the estimate back and what they'll still owe, the reasoning,
   and cheaper alternatives (an in-network copay, Triple-S Natural, SALUS or Metro Pavía at $0).
4. **¿Quiere ayuda con el proceso? → ¡Empecemos!** (only when something is reimbursable) opens a guided
   claim at `/reclamar`:
   - *¿Ya recibió el servicio?* **Sí:** date, amount, provider; plan-specific questions that justify the
     claim (e.g. Contigo Fit's HRA and preventive visit); then only the personal details the app can't
     fill. It generates the insurer's form (Triple-S's official AcroForm, or First Medical's 2023 form by
     coordinates), a cover sheet, and a **letter citing the policy clause** that entitles the refund.
   - **Todavía no:** a preauthorization warning when the plan requires one, then the form filled as far as
     possible to bring to the appointment.
   - **Review:** a summary plus the PDF; *Corregir algo* opens every field, then regenerates.
   - **Get it to the provider:** either *print it and bring it*, or *send it by email*. The email page
     has a prefilled message, a download of the form and letter for the provider, and a download of the
     full packet (next steps, form and letter) for the patient. The email goes from the patient's own
     account; nothing touches a server.
   - **Finish:** *Terminar y volver al inicio* clears everything the patient typed from memory, shows a
     short "datos borrados" confirmation, and returns to the home page.

An earlier prototype of a provider-side flow lives at [`/proveedor`](https://auracurativa.pages.dev/proveedor)
(the provider prepares the claim and hands the patient a QR code). It is not part of the submitted
product; a fuller provider flow is on the roadmap.

## Demo shortcut

Add `?demo` to the URL (e.g. `/?demo`, then an example and *¡Empecemos!*) to fill every form with
synthetic data. The *Datos de ejemplo* button on the claim wizard does the same.

## Plan comparison (`/comparar`)

Pick an insurer and plan; the table puts it next to the other insurer's plans of the same metal tier
(or the nearest tier), with the monthly premium for a chosen age on top and each service's
out-of-network answer from the same estimator the claim wizard uses.

Update once a year in `src/lib/compare.ts`: premiums (OCS rate filings, `Tarifas.pdf`), deductible,
out-of-pocket maximum, hospital and ER copays, and sources. Triple-S had not published 2027 premiums
as of 2026-10-09, so its premium cells say so until `premiums` is filled in.

## Privacy model

There is no backend and no database.

- Everything is computed and generated **in the browser**; the PDF is built with `pdf-lib`.
- In the provider flow, the claim travels **inside the QR link's `#fragment`**, which browsers never send
  to a server.
- The site is static files. Hosting logs see a page request, never claim data.

Demo data is synthetic. The demo NPI passes the check-digit test but is not a real provider.

## Run it

```sh
npm install
npm run dev        # http://localhost:5173
npm run test       # estimator, plan rules, payload, validators, PDF packets
npm run check      # svelte-check
npm run build      # static site in build/
npm run e2e        # Playwright, desktop + phone: estimate → claim wizard → downloads → finish
                   # BASE_URL=https://auracurativa.pages.dev npm run e2e  to test the live site
npm run demo-video          # patient-flow video → demo-video/aura-curativa-patient.mp4 (ffmpeg, pdftoppm)
npm run demo-video:provider # provider-flow video → demo-video/aura-curativa-provider.mp4
```

Hosting: Cloudflare Pages builds and deploys every push to `main` (build command `npm run build`,
output `build/`, `NODE_VERSION=24`). `static/_headers` sets `Referrer-Policy: no-referrer`.
`scripts/deploy.sh` is the older EC2 + Caddy path, kept until the old URL is retired.

## Where the rules live

- `src/lib/estimate.ts`: patient-side estimator: plans, services, published averages, in-network
  costs, claim rules per insurer.
- `src/lib/plans.ts`: reimbursement routes for the provider flow.
- `src/lib/pdf/triple-s.ts`: fills the real AcroForm fields of `static/forms/triple-s-reembolso.pdf`
  (Rev. 06/2009) by name; `scripts/list-fields.mjs` prints them.
- `src/lib/pdf/first-medical.ts`: places values on First Medical's flat form by page coordinates;
  `scripts/dump-labels.mjs` prints a page's text positions, and `scripts/split-pages.mjs` splits a PDF.
- `src/lib/justify.ts`: the claim questions, the policy letter, the next steps and the provider email.

## Pitch materials

- `docs/devpost.md`: the Devpost story. `docs/devpost-thumbnail.png` and `docs/devpost-gallery/`: images.
- `docs/slides/aura-curativa-deck.pptx` and `.pdf`: the 6-slide pitch deck.

## Research

- [Triple-S 2027 individual plans: what gets reimbursed](docs/triple-s-2027-reembolsos.md)
- [Triple-S published out-of-network estimates (Ley 134-2020)](docs/triple-s-oon-estimates-2027.md)
- [First Medical Directo 2027: reimbursement rules and source cross-check](docs/first-medical-2027-reembolsos.md)

## Known limits

- Estimates, not coverage determinations. Plans change every year.
- First Medical doesn't publish its fee schedule, so the app shows the formula and the copay and points
  the patient to First Medical's estimate line (1-888-318-0274), not a dollar figure.
- Only 2027 individual plans from Triple-S and First Medical for now. MCS, Menonita, Bella Vista, Ryder
  and employer plans come next.
- Signatures and the provider's stamp stay on paper.
- The patient still mails or emails the claim to the insurer.
- The `/proveedor` prototype's intake-record import is simulated with three synthetic patients.
