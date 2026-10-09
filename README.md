# Healing Aura

Out-of-network reimbursement for patients in Puerto Rico, without the paperwork wall.

**Live demo:** https://18-212-154-202.sslip.io (no account needed — click *Datos de ejemplo*)

Many good providers in Puerto Rico don't take insurance. Patients pay out of pocket, and most never file
for the out-of-network reimbursement their plan owes them, because the claim form is confusing and gets
returned for missing details. The provider's office already has every detail the form needs, so
Healing Aura has the office prepare the claim and the patient just confirms it:

1. **Provider** imports the patient and their plan from intake records (simulated in the demo), adds
   ICD-10 diagnoses and CPT services, and picks the reason for the claim.
2. **Coverage check.** The app tells the provider, before anything is generated, whether that route is
   reimbursable under the patient's plan, how much, and the conditions. If it isn't (a routine
   out-of-network visit on a 2027 Triple-S individual plan), it blocks the claim and offers the routes
   that do work: Contigo Fit, the "no participating provider" clause, Triple-S Natural, in-network labs.
   Rules come from [the 2027 policy research](docs/triple-s-2027-reembolsos.md).
3. **Patient** scans the QR, reviews the completed claim and what to expect back, certifies it and taps
   *Acepto*. The phone shows a 4-digit code derived from that exact version of the claim.
4. **Provider** types the code, which unlocks printing: the official **Triple-S Salud** form filled
   in, the itemized receipt (*factura detallada*) with the reason for the request, and a cover sheet
   with expected reimbursement, conditions, the 1-year deadline and how to submit (email, app or mail).
   The patient signs section D; the provider signs and stamps.

If the provider edits anything after generating the QR, the old code stops working and they must
generate a new one, so the patient always approves what gets printed. The code shows the patient
opened and accepted that version; it is not a cryptographic signature.

## Privacy model

There is no backend and no database.

- The claim travels **inside the QR link's `#fragment`**, which browsers never send to a server.
- The PDF is generated **in the browser** with `pdf-lib`. Closing the tab discards everything.
- The site is static files only. Hosting logs see a page request, never claim data.

Demo data is synthetic. The demo NPI passes the check-digit test but is not a real provider.

## Run it

```sh
npm install
npm run dev        # http://localhost:5173
npm run test       # payload round-trip, validators, PDF packet
npm run check      # svelte-check
npm run build      # static site in build/
npm run e2e        # Playwright: coverage check → QR → patient accepts → provider prints, desktop + phone
                   # BASE_URL=https://18-212-154-202.sslip.io npm run e2e  to test the live site
npm run demo-video # records demo-video/healing-aura-demo.mp4 (needs npm run preview, ffmpeg, pdftoppm)
scripts/deploy.sh  # build + rsync to the EC2 host (Caddy, auto HTTPS)
```

Click **Datos de ejemplo** on the provider page, generate the QR code, then **Abrir como paciente** and
load the example patient to get a full packet.

## How the form filling works

`static/forms/triple-s-reembolso.pdf` is the public Triple-S form (Rev. 06/2009). It has real AcroForm
fields; `scripts/list-fields.mjs` prints them. `src/lib/pdf/triple-s.ts` maps our data onto those
fields by name and flattens the result so every printer renders the same thing. Adding an insurer means
adding one more mapping file.

## Research

- [Triple-S 2027 individual plans: what gets reimbursed](docs/triple-s-2027-reembolsos.md) — routes,
  exclusions, labs, claim rules and deadlines across five plans.

## Known limits

- Triple-S only so far. MCS (commercial and Classicare) is next — the forms are public and ask for the
  same data.
- The provider still signs and stamps (*sello timbrado*) by hand; the patient signs section D by hand.
- The intake-record import is simulated with three synthetic patients; a real version would read from
  the practice's EHR or intake form.
- No eligibility check yet, so the app can't tell a patient up front whether their plan pays
  out-of-network or how much. It makes the claim complete; it doesn't promise it will be paid.
- Prescriptions and labs use different forms and aren't covered.
