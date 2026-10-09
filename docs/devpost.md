# DevPost draft — Healing Aura

**Short description (2–3 sentences):**
Patients in Puerto Rico who see providers outside their insurance network rarely get reimbursed. The
Triple-S claim form is confusing, plans reimburse far less than people assume, and claims get
returned for missing details. Healing Aura tells the provider's office what the patient's plan actually
reimburses (and what to do when it doesn't), prepares the complete claim from data the office already
has, and lets the patient review and accept it from a QR code. No data is ever stored.

## Inspiration

Raquel kept seeing the same pattern: people want care from providers who don't take insurance, such as
functional medicine, therapy and specialists with long network waitlists. They pay out of pocket, and
their plan owes them part of that money back. Almost nobody files. The form asks the patient for things
only the doctor knows (NPI, ICD-10 codes, CPT codes), and the doctor has no reason to sit down and fill
out an insurance form for a patient who already paid. Claims that do get filed come back for a missing
license number or a receipt that says "balance pending."

## What it does

- **Provider** imports the patient and their plan from intake records (simulated with synthetic
  patients) and adds the visit's diagnoses and services.
- **Coverage check:** we read the 2027 policies for five Triple-S individual plans. The app tells the
  provider whether the claim's route is reimbursable, how much, and under what conditions. A routine
  out-of-network visit isn't reimbursable on these plans, so instead of filing a claim that will be
  denied, the app offers routes that work: Contigo Fit ($20/month for acupuncture, massage,
  reflexology), the "no participating provider" clause (100% minus cost-sharing), Triple-S Natural,
  and in-network labs.
- **Patient** scans it and sees the fully completed claim: their details, the visit, every charge,
  and the filled PDF if they want it. They check the certification and tap *Acepto*. Nothing to type.
- The patient's phone shows a **4-digit acceptance code** computed from that exact version of the claim.
  The provider types it in, and that unlocks printing. If the office edits anything afterward, the code
  stops matching and a new QR is required.
- The office prints a packet built in the browser:
  - the **official Triple-S reimbursement form**, filled in field by field
  - the **itemized receipt** (*factura detallada*) Triple-S requires, with NPI, EIN, license, diagnosis,
    and amounts billed and paid on every line
  - a **cover sheet** with the mailing address and a checklist
- The patient signs section D, the provider signs and stamps, and it goes in the mail.
- Validation catches the mistakes that get claims returned: bad NPI check digit, malformed ICD-10 and
  CPT codes, missing EIN or license.

## How we built it

- SvelteKit (Svelte 5), deployed as a fully static site.
- `pdf-lib` fills the real AcroForm fields in Triple-S's public PDF and draws the receipt and cover
  sheet.
- The claim is JSON, deflate-compressed and base64url-encoded into the **URL fragment** of the QR
  link. Browsers never send the fragment to a server, so the server never sees claim data.
- Spanish-first UI, mobile-first patient flow.

## Challenges we ran into

- The Triple-S form looks like a flat scan, but it has 100+ hidden form fields. We first overlaid text
  by coordinates, saw white field boxes covering our text, and switched to filling the real fields.
- The contract-number box only holds one character: the third letter of the "ZU_" prefix. The rest of
  the number runs past it unboxed.
- Keeping the QR code scannable: compressing the payload keeps it under ~1 KB for six service lines.
- Confirming patient acceptance without a server. The answer was a short code derived from a hash of
  the exact claim payload, shown on the patient's phone and typed by the provider.
- Being honest about limits. The form needs a wet signature and the provider's *sello timbrado*, so the
  app prepares the packet and doesn't pretend it can submit it electronically.

## Accomplishments that we're proud of

- A real, mailable Triple-S claim generated end to end in under two minutes.
- Zero data retention by architecture, not by policy: there's no database to breach.
- A receipt that meets every item on Triple-S's own receipt checklist.

## What we learned

- The 2027 Triple-S individual plans (Directo, Pocket, Uno) are closed networks. Out-of-network care
  in PR is excluded except for a short list of named routes. Knowing that up front is itself help.

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
