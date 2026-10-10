## Inspiration

Health insurance plans can be difficult to navigate and in-network coverage can often be limiting. On top of that, who wants to figure out how to submit complex reimbursement claims for services that might not even be covered by your plan? 

This results in patients frequently taking on the financial burden for out-of-network services, or just not seeking care at all, because they don't realize they could be reimbursed by their plans. Even when they do realize it, it can be a hassle to locate the right form, fill it out correctly, and draft the letter explaining why the services are covered under the plan. Plus, even after all of that, you still have to coordinate with your doctor so they fill out their end of the form. 

With Aura Curativa, patients can easily generate a completed claim form for their out-of-network visit or service so it can easily be completed by the provider and then mailed or emailed to their insurance company. No more long hours spent tracking down the right form or figuring out the coverage details of your plan. Aura Curativa makes it easy to understand your coverage and submit claims for reimbursement, so you can focus on your health instead of paperwork. 

## What it does

Before or after a patient in Puerto Rico pays an out-of-network provider, Aura Curativa answers one question: *¿Me reembolsan?*

1. **Pick your plan.** Select your current insurer, then select the exact plan you have with them.
2. **Pick your service.** Acupuncture, massage, a specialist visit, lab work, glasses, therapy, transportation, and more.
3. **Get a straight answer.** Is it reimbursable under your plan, roughly how much would you get back, and what will you still owe? Every answer cites the policy rule behind it. You also see cheaper options, like an in-network copay or a $0 alternative.
4. **Generate your claim.** If the service is reimbursable, the user will be guided through the process of filling in the remaining details. The platform then generates a packet that includes:
   - a cover sheet with a list of next steps, instructions on how to submit the claim, and the filing deadline,
   - the insurer's own claim form, filled in, with the provider's section left blank for them to complete,
   - a letter to the insurance company citing the exact policy clause that entitles you to the refund.
5. **Send it to your provider.** Either print out the packet and take it to your provider or tap a button to generate a prefilled email asking your provider to complete and sign their part before sending it back. The email comes from the patient's own email account.
6. **File your claim.** Once your provider returns the completed form, you just follow the rules on the cover sheet of the packet to mail or email the claim to your insurance company and wait for the money to roll in.

If the patient hasn't had the visit yet, the app warns them when the plan needs preauthorization. It also fills the form as far as it can, so they can bring it to the appointment.

A separate comparison page also puts plans next to each other, helping people compare their options more easily. For each plan, it shows the premium, deductible, out-of-pocket maximum and the out-of-network answer for each service.

No account, no sign-up, nothing stored.

## How we built it

- **Research first.** We agentically reviewed the 2027 policy documents for five Triple-S individual plans and four First Medical Directo plans. We also agentically reviewed Triple-S's published out-of-network estimates under Ley 134-2020. Then we turned each plan's reimbursement rules into code: closed versus open network, the rate basis, copays and coinsurance, filing deadlines, exclusions, and named benefits like Contigo Fit and adult glasses.
- **SvelteKit + TypeScript + Tailwind**, built as a static site. There is no backend at all.
- **pdf-lib in the browser.** It fills Triple-S's official form by its real field names. First Medical's form has no fillable fields, so we place every value by page coordinates. The cover sheet and policy letter are generated on the same pass.
- **Vitest** tests the estimator, plan rules, validators and the generated PDFs. **Playwright** runs the full patient flow end to end on desktop and phone viewports, including against the live site.
- **Caddy on a small EC2 instance** serves the static files over HTTPS.

## Challenges we ran into

- Creating a flow that does not require any data storage, while still allowing the patient and provider to collaborate on the same claim. 
- Insurance policies are long Spanish-language PDFs, and the answer to "will they pay me back?" is spread across several sections. Triple-S individual plans are closed networks, so a routine out-of-network visit isn't reimbursable. A few named benefits still are, and we had to find each one.
- Insurers don't reimburse what you paid. They pay their contracted rate minus your copay. Triple-S publishes average estimates, but First Medical doesn't publish its fee schedule. So for First Medical we show the formula and the copay instead of an invented dollar figure.
- The two insurers' forms need different approaches. One has real form fields. The other is a flat scan, so every value had to be positioned by hand and checked on the printed page.

## Accomplishments that we're proud of

- A real, mailable claim for either Triple-S or First Medical individual plans generated to meet all of the insurance's requirements.
- Zero data retention by architecture, not by policy: there's no database to breach.
- A page that compares insurance plans reimbursement policies and benefits, helping patients understand their coverage and potential out-of-network options under each one.

## What we learned

- The barrier isn't always eligibility. It's also paperwork split across two people who never fill it out together.
- Puerto Rico insurers publish their reimbursement forms, and the forms rarely change (Triple-S's is from 2022). One template per insurer is maintainable.

## What's next for Aura Curativa

- Add the missing Puerto Rican insurers (MCS, Plan Menonita, etc.) to the platform.
- Add a provider-facing flow so the provider can either: 
   - print out the completed form alongside their patient's receipt so the patient only has to mail the claim to their insurance company, or 
   - generate a QR code that gives the patient access to a completed form that they can email to their insurance company.
- Prescription medication reimbursement forms.
- English UI toggle.

## Built With

lattis, claude, svelte, sveltekit, typescript, tailwindcss, pdf-lib, qrcode, vite, vitest, playwright, aws-ec2, caddy

## Try it out

- Live demo: https://18-212-154-202.sslip.io
- Code: https://github.com/jdreben/healing-aura
