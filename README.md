# Healing Aura

**¿Me reembolsan?** Before a patient in Puerto Rico pays a provider outside their plan's network, Healing
Aura tells them whether their plan will pay them back, roughly how much, what would cost less, and
exactly how to file the claim.

**Live demo:** https://18-212-154-202.sslip.io (no account needed)

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
- **Triple-S employer/PYMES plans** with a reimbursement benefit pay the *contracted rate* minus copay.
  Triple-S publishes the averages under Ley 134-2020: a specialist visit comes back at about **$17**.
- **First Medical Directo 2027** (Gold Plus, Gold, Silver Plus, Silver) does reimburse out of network:
  the highest in-network rate for the same specialty, minus copay or coinsurance. Claims are due within
  **90 days**. Acupuncture is excluded.

## What the patient does

1. **Su plan.** Pick the plan.
2. **Su servicio.** Pick the service and enter what it costs.
3. **Su respuesta.** Reimbursable or not, the estimate back and what they'll still owe, the reasoning,
   and cheaper alternatives (an in-network copay, Triple-S Natural, SALUS or Metro Pavía at $0).
4. **Cómo reclamarlo.** What to ask the provider for, the deadline, and where to send it. For Triple-S
   the app fills in the official claim form (patient sections plus services) for the provider to
   complete and sign. For First Medical it links the insurer's form.

Providers can also prepare the whole claim for the patient at [`/proveedor`](https://18-212-154-202.sslip.io/proveedor):
import the patient, run the same coverage check, and hand over a QR code. The patient reviews and
accepts on their phone, and the provider prints the packet once the patient's code matches.

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
npm run e2e        # Playwright, desktop + phone: patient estimate → form; provider QR → accept → print
                   # BASE_URL=https://18-212-154-202.sslip.io npm run e2e  to test the live site
npm run demo-video # records demo-video/healing-aura-demo.mp4 (needs npm run preview, ffmpeg, pdftoppm)
scripts/deploy.sh  # build + rsync to the EC2 host (Caddy, auto HTTPS)
```

## Where the rules live

- `src/lib/estimate.ts`: patient-side estimator: plans, services, published averages, in-network
  costs, claim rules per insurer.
- `src/lib/plans.ts`: reimbursement routes for the provider flow.
- `src/lib/pdf/triple-s.ts`: fills the real AcroForm fields of `static/forms/triple-s-reembolso.pdf`
  (Rev. 06/2009) by name; `scripts/list-fields.mjs` prints them.

## Research

- [Triple-S 2027 individual plans: what gets reimbursed](docs/triple-s-2027-reembolsos.md)
- [Triple-S published out-of-network estimates (Ley 134-2020)](docs/triple-s-oon-estimates-2027.md)
- [First Medical Directo 2027: reimbursement rules and source cross-check](docs/first-medical-2027-reembolsos.md)

## Known limits

- Estimates, not coverage determinations. Plans change every year.
- First Medical doesn't publish its fee schedule, so the app shows the formula and the copay and points
  the patient to First Medical's estimate line (1-888-318-0274), not a dollar figure.
- MCS, Menonita, Bella Vista and Ryder aren't verified yet; the app says so.
- Employer plans vary; the app assumes a reimbursement benefit and tells the patient to confirm it.
- Signatures and the provider's stamp stay on paper.
- The provider flow's intake-record import is simulated with three synthetic patients.
