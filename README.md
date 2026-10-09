# Healing Aura

Out-of-network reimbursement for patients in Puerto Rico, without the paperwork wall.

Many good providers in Puerto Rico don't take insurance. Patients pay out of pocket, and most never file
for the out-of-network reimbursement their plan owes them, because the claim form is confusing and gets
returned for missing details. Healing Aura splits the form between the people who actually have the
information:

1. **Provider** fills in their part once (NPI, license, ICD-10 diagnoses, CPT services, amounts paid) and
   gets a QR code.
2. **Patient** scans it on their phone and adds only what they know: name, contract number, address.
3. The app produces a ready-to-mail packet: the official **Triple-S Salud** reimbursement form filled
   in, the itemized receipt (*factura detallada*) Triple-S requires, and a cover sheet with the mailing
   address and a checklist.

## Privacy model

There is no backend and no database.

- Provider data travels **inside the QR link's `#fragment`**, which browsers never send to a server.
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
```

Click **Datos de ejemplo** on the provider page, generate the QR code, then **Abrir como paciente** and
load the example patient to get a full packet.

## How the form filling works

`static/forms/triple-s-reembolso.pdf` is the public Triple-S form (Rev. 06/2009). It has real AcroForm
fields; `scripts/list-fields.mjs` prints them. `src/lib/pdf/triple-s.ts` maps our data onto those
fields by name and flattens the result so every printer renders the same thing. Adding an insurer means
adding one more mapping file.

## Known limits

- Triple-S only so far. MCS (commercial and Classicare) is next — the forms are public and ask for the
  same data.
- The provider still signs and stamps (*sello timbrado*) by hand; the patient signs section D by hand.
- No eligibility check yet, so the app can't tell a patient up front whether their plan pays
  out-of-network or how much. It makes the claim complete; it doesn't promise it will be paid.
- Prescriptions and labs use different forms and aren't covered.
