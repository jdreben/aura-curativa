# DevPost draft — Healing Aura

**Short description (2–3 sentences):**
Patients in Puerto Rico who see providers outside their insurance network rarely get reimbursed. The
Triple-S claim form is confusing and gets returned for missing details. Healing Aura splits the form:
the provider fills in their part and shows a QR code, the patient finishes on their phone, and out comes
a complete, ready-to-mail reimbursement packet. No patient data is ever stored.

## Inspiration

Raquel kept seeing the same pattern: people want care from providers who don't take insurance, such as
functional medicine, therapy and specialists with long network waitlists. They pay out of pocket, and
their plan owes them part of that money back. Almost nobody files. The form asks the patient for things
only the doctor knows (NPI, ICD-10 codes, CPT codes), and the doctor has no reason to sit down and fill
out an insurance form for a patient who already paid. Claims that do get filed come back for a missing
license number or a receipt that says "balance pending."

## What it does

- **Provider** enters their info once, plus the visit's diagnoses and services. They get a QR code.
- **Patient** scans it, sees a summary of the visit, and fills in only their own details: name, Triple-S
  contract number, address.
- The app builds a PDF packet in the browser:
  - the **official Triple-S reimbursement form**, filled in field by field
  - the **itemized receipt** (*factura detallada*) Triple-S requires, with NPI, EIN, license, diagnosis,
    and amounts billed and paid on every line
  - a **cover sheet** with the mailing address and a checklist (sign section D, provider stamp, one
    form per family member, and so on)
- Validation catches the mistakes that get claims returned: bad NPI check digit, malformed ICD-10 and
  CPT codes, missing EIN or license.

## How we built it

- SvelteKit (Svelte 5), deployed as a fully static site.
- `pdf-lib` fills the real AcroForm fields in Triple-S's public PDF and draws the receipt and cover
  sheet.
- Provider data is JSON, deflate-compressed and base64url-encoded into the **URL fragment** of the QR
  link. Browsers never send the fragment to a server, so the server never sees claim data.
- Spanish-first UI, mobile-first patient flow.

## Challenges we ran into

- The Triple-S form looks like a flat scan, but it has 100+ hidden form fields. We first overlaid text
  by coordinates, saw white field boxes covering our text, and switched to filling the real fields.
- The contract-number box only holds one character: the third letter of the "ZU_" prefix. The rest of
  the number runs past it unboxed.
- Keeping the QR code scannable: compressing the payload keeps it under ~1 KB for six service lines.
- Being honest about limits. The form needs a wet signature and the provider's *sello timbrado*, so the
  app prepares the packet and doesn't pretend it can submit it electronically.

## Accomplishments that we're proud of

- A real, mailable Triple-S claim generated end to end in under two minutes.
- Zero data retention by architecture, not by policy: there's no database to breach.
- A receipt that meets every item on Triple-S's own receipt checklist.

## What we learned

- The barrier isn't eligibility. It's paperwork split across two people who never fill it out together.
- Puerto Rico insurers publish their reimbursement forms, and the forms rarely change (Triple-S's is
  from 2009). One template per insurer is maintainable.
- MCS Classicare (Medicare Advantage) also reimburses some out-of-network services, so the market is
  bigger than commercial PPO plans.

## What's next for Healing Aura

- MCS (commercial and Classicare) templates, then other Puerto Rico plans.
- Eligibility checks (X12 270/271) so patients know their out-of-network deductible and coinsurance
  before the visit.
- Optional certified-mail sending through a HIPAA-eligible print-and-mail API.
- Prescription and lab reimbursement forms.
- English UI toggle.

## Built With

svelte, sveltekit, typescript, tailwindcss, pdf-lib, qrcode, vite, vitest, playwright, aws-ec2, caddy

## Try it out

- Live demo: https://18-212-154-202.sslip.io
- Code: https://github.com/jdreben/healing-aura
