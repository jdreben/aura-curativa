# DevPost draft — Healing Aura

**Short description (2–3 sentences):**
Patients in Puerto Rico who see providers outside their insurance network rarely get reimbursed. The
Triple-S claim form is confusing, plans reimburse far less than people assume, and claims get
returned for missing details. Healing Aura tells the provider's office what the patient's plan actually
reimburses (and what to do when it doesn't), prepares the complete claim from data the office already
has, and lets the patient review and accept it from a QR code. No data is ever stored.

## Inspiration

Health insurance plans can be difficult to navigate and in-network coverage can often be limiting. The result is patients frequently paying for out-of-network services without realizing they could be reimbursed by their plans. And even when they do realize it, it can be a hastle to locate the right form, fill it out correctly, draft the letter explaining why the services are covered under the plan, coordinate with your doctor so they fill out their end of the form. With Aura Curativa, patients can easily generate a completed claim form for their out-of-network visit or service so they can have the provider quickly fill in their part of the form. The patient can then mail or email the completed claim without ever having to spend hours tracking down the right form or figuring out the coverage details of their plan. 

## What it does

Before or after a patient in Puerto Rico pays an out-of-network provider, Healing Aura answers one question: *¿Me reembolsan?*

1. **Pick your plan.** Choose the insurer (Triple-S or First Medical), then the exact 2027 individual plan.
2. **Pick your service.** Acupuncture, massage, a specialist visit, glasses, therapy, imaging and more.
3. **Get a straight answer.** Is it reimbursable, roughly how much comes back, and what will you still owe? Every answer cites the policy rule behind it. You also see cheaper options, like an in-network copay or a $0 alternative.
4. **File the claim.** If the service is reimbursable, a guided wizard asks only what the app can't already fill in. It then generates:
   - the insurer's own claim form, filled in, with the provider's section left blank for them,
   - a cover sheet with the mailing address and filing deadline,
   - a letter that cites the exact policy clause that entitles the patient to the refund.
5. **Send it to the provider.** One tap creates a prefilled email that asks the provider to complete and sign their part. On a phone, the PDF goes through the share sheet. The email comes from the patient's own account.

If the patient hasn't had the visit yet, the app warns them when the plan needs preauthorization. It also fills the form as far as it can, so they can bring it to the appointment.

A separate comparison page puts plans next to each other. For each plan, it shows the premium, deductible, out-of-pocket maximum and the out-of-network answer for each service.

No account, no sign-up, nothing stored.

## How we built it

- **Research first.** We read the 2027 policy documents for five Triple-S individual plans and four First Medical Directo plans. We also read Triple-S's published out-of-network estimates under Ley 134-2020. Then we turned each plan's reimbursement rules into code: closed versus open network, the rate basis, copays and coinsurance, filing deadlines, exclusions, and named benefits like Contigo Fit and adult glasses.
- **SvelteKit + TypeScript + Tailwind**, built as a static site. There is no backend at all.
- **pdf-lib in the browser.** It fills Triple-S's official form by its real field names. First Medical's form has no fillable fields, so we place every value by page coordinates. The cover sheet and policy letter are generated on the same pass.
- **Vitest** tests the estimator, plan rules, validators and the generated PDFs. **Playwright** runs the full patient flow end to end on desktop and phone viewports, including against the live site.
- **Caddy on a small EC2 instance** serves the static files over HTTPS.

## Challenges we ran into

- Creating a flow that does not require any data storage, while still allowing the patient and provider to collaborate on the same claim. 
- Insurance policies are long Spanish-language PDFs, and the answer to "will they pay me back?" is spread across several sections. Triple-S individual plans are closed networks, so a routine out-of-network visit isn't reimbursable. A few named benefits still are, and we had to find each one.
- Insurers don't reimburse what you paid. They pay their contracted rate minus your copay. Triple-S publishes average estimates, but First Medical doesn't publish its fee schedule. So for First Medical we show the formula and the copay instead of an invented dollar figure.
- The two insurers' forms need different approaches. One has real form fields. The other is a flat scan, so every value had to be positioned by hand and checked on the printed page.
- An email link can't attach a file. On phones we hand the PDF to the native share sheet. On desktop we open the patient's email app and download the PDF so they can attach it.

## Accomplishments that we're proud of

- A real, mailable claim for either Triple-S or First Medical individual plans generated to meet all of the insurance's requirements.
- Zero data retention by architecture, not by policy: there's no database to breach.
- A page that compares insurance plans reimbursement policies and benefits, helping patients understand their coverage and potential out-of-network options under each one.

## What we learned

- The barrier isn't eligibility. It's paperwork split across two people who never fill it out together.
- Puerto Rico insurers publish their reimbursement forms, and the forms rarely change (Triple-S's is from 2022). One template per insurer is maintainable.

## What's next for Healing Aura

- Add the missing Puerto Rican insurers (MCS, Plan Menonita, etc.) to the platform.
- Add a provider-facing flow so the provider can either (a) print the completed form alongside their patient's receipt so the patient can mail everything to their insurance company or (b) generate a QR code that gives the patient access to a completed form that they can email to their insurance company without ever needing to type in the claim or explanation of why it should be covered.
- Eligibility checks (X12 270/271) so patients know their out-of-network deductible and coinsurance before the visit.
- Optional certified-mail sending through a HIPAA-eligible print-and-mail API.
- Prescription medication reimbursement forms.
- English UI toggle.

## Built With

svelte, sveltekit, typescript, tailwindcss, pdf-lib, qrcode, vite, vitest, playwright, aws-ec2, caddy

## Try it out

- Live demo: https://18-212-154-202.sslip.io
- Code: https://github.com/jdreben/healing-aura
