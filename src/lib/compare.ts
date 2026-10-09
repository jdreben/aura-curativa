// Plan comparison data, plan year 2027. Update once a year; sources are listed per plan.
import type { Insurer, PatientPlanId } from "./estimate.ts";

export const PLAN_YEAR = 2027;

export type Metal = "bronce" | "plata" | "oro";
export const METAL_NAMES: Record<Metal, string> = {
  bronce: "Bronce",
  plata: "Plata",
  oro: "Oro",
};

type Source = { label: string; href: string };

export type ComparePlan = {
  id: PatientPlanId;
  insurer: Insurer;
  name: string;
  metal: Metal;
  network: string;
  // Monthly individual premium by age: index 0 is ages 0-20, then 21 through 64, then 65 and over.
  premiums: number[] | null;
  deductible: string;
  moop: string;
  hospital: string;
  emergency: string;
  sources: Source[];
};

const OCS_FM =
  "https://docs.pr.gov/files/OCS/Seguros_Salud/Planes%20en%20Cumplimiento/2027/Cubiertas%20Individuales/First%20Medical%20Health%20Plan,%20Inc/";
const FM_SOURCES = (folder: string): Source[] => [
  { label: "Tarifas 2027 (OCS)", href: `${OCS_FM}${folder}/Tarifas.pdf` },
  {
    label: "Cubierta de beneficios 2027 (OCS)",
    href: `${OCS_FM}${folder}/Descripcion%20de%20Beneficios.pdf`,
  },
];
const TS_SOURCES: Source[] = [
  {
    label: "Pólizas y resúmenes de beneficios 2027 (Triple-S)",
    href: "https://salud.grupotriples.com/",
  },
];
const MOOP = "$6,350 individual / $12,700 familiar";

// First Medical 2027 rates from the OCS rate filings; they match the "Tarifa Directo 2027" flyer.
const FM_RATES: Record<string, number[]> = {
  "fm-silver": [
    94.08, 148.16, 148.16, 148.16, 148.16, 148.75, 151.72, 155.27, 161.05,
    165.79, 168.16, 171.72, 175.28, 177.5, 179.87, 181.05, 182.24, 183.42,
    184.61, 186.98, 189.35, 192.91, 196.31, 201.06, 206.98, 213.95, 222.24,
    231.58, 242.24, 252.76, 264.62, 276.32, 289.21, 302.25, 316.33, 330.4,
    345.66, 361.07, 377.52, 385.67, 402.11, 416.33, 425.67, 437.37, 444.49,
    444.49,
  ],
  "fm-silver-plus": [
    98.82, 155.62, 155.62, 155.62, 155.62, 156.24, 159.35, 163.09, 169.16,
    174.14, 176.63, 180.36, 184.1, 186.43, 188.92, 190.17, 191.41, 192.66,
    193.9, 196.39, 198.88, 202.62, 206.2, 211.18, 217.4, 224.71, 233.43, 243.23,
    254.44, 265.49, 277.94, 290.23, 303.77, 317.46, 332.25, 347.03, 363.06,
    379.25, 396.52, 405.08, 422.35, 437.29, 447.1, 459.39, 466.86, 466.86,
  ],
  "fm-gold": [
    103.82, 163.5, 163.5, 163.5, 163.5, 164.15, 167.42, 171.35, 177.72, 182.96,
    185.57, 189.5, 193.42, 195.87, 198.49, 199.8, 201.1, 202.41, 203.72, 206.34,
    208.95, 212.88, 216.64, 221.87, 228.41, 236.09, 245.25, 255.55, 267.32,
    278.93, 292.01, 304.93, 319.15, 333.54, 349.07, 364.6, 381.44, 398.45,
    416.6, 425.59, 443.74, 459.43, 469.73, 482.65, 490.5, 490.5,
  ],
  "fm-gold-plus": [
    104.56, 164.66, 164.66, 164.66, 164.66, 165.32, 168.61, 172.56, 178.98,
    184.25, 186.89, 190.84, 194.79, 197.26, 199.89, 201.21, 202.53, 203.85,
    205.16, 207.8, 210.43, 214.38, 218.17, 223.44, 230.03, 237.76, 246.99,
    257.36, 269.21, 280.9, 294.08, 307.08, 321.41, 335.9, 351.54, 367.18,
    384.14, 401.27, 419.55, 428.6, 446.88, 462.69, 473.06, 486.07, 493.97,
    493.97,
  ],
};

export const COMPARE_PLANS: ComparePlan[] = [
  {
    id: "directo-bronce",
    insurer: "triple-s",
    name: "Triple-S Directo Bronce",
    metal: "bronce",
    network: "EPO (Blue Select)",
    premiums: null,
    deductible: "$75 individual / $150 familiar",
    moop: MOOP,
    hospital: "$500",
    emergency: "$50 accidente / $200 enfermedad",
    sources: TS_SOURCES,
  },
  {
    id: "directo-plata",
    insurer: "triple-s",
    name: "Triple-S Directo Plata",
    metal: "plata",
    network: "EPO (Blue Select)",
    premiums: null,
    deductible: "$0",
    moop: MOOP,
    hospital: "$350",
    emergency: "$50 accidente / $150 enfermedad",
    sources: TS_SOURCES,
  },
  {
    id: "pocket-plata",
    insurer: "triple-s",
    name: "Triple-S Pocket Plata",
    metal: "plata",
    network: "POS (Red Pocket + Blue Select)",
    premiums: null,
    deductible: "$0",
    moop: MOOP,
    hospital: "$300",
    emergency: "$50 accidente / $200 enfermedad",
    sources: TS_SOURCES,
  },
  {
    id: "uno-plata",
    insurer: "triple-s",
    name: "Triple-S Uno Plata",
    metal: "plata",
    network: "POS (Blue One + Blue Select)",
    premiums: null,
    deductible: "$0 en Blue One / $800 en Blue Select",
    moop: MOOP,
    hospital: "$150 en Blue One / $400",
    emergency: "$50 accidente / $200 enfermedad",
    sources: TS_SOURCES,
  },
  {
    id: "pocket-oro",
    insurer: "triple-s",
    name: "Triple-S Pocket Oro",
    metal: "oro",
    network: "POS (Red Pocket + Blue Select)",
    premiums: null,
    deductible: "$0",
    moop: MOOP,
    hospital: "$200",
    emergency: "$50 accidente / $200 enfermedad",
    sources: TS_SOURCES,
  },
  {
    id: "fm-silver",
    insurer: "first-medical",
    name: "First Medical Directo Silver",
    metal: "plata",
    network: "Libre selección (International Medical Card)",
    premiums: FM_RATES["fm-silver"],
    deductible: "$0",
    moop: MOOP,
    hospital: "$350 ($200 en Metro Pavía)",
    emergency: "$125 ($60 en Metro Pavía)",
    sources: FM_SOURCES("Pago%20Directo%20Plata%20PPO"),
  },
  {
    id: "fm-silver-plus",
    insurer: "first-medical",
    name: "First Medical Directo Silver Plus",
    metal: "plata",
    network: "Libre selección (International Medical Card)",
    premiums: FM_RATES["fm-silver-plus"],
    deductible: "$0",
    moop: MOOP,
    hospital: "$350 ($0 en Metro Pavía)",
    emergency: "$100 ($50 en Metro Pavía)",
    sources: FM_SOURCES("Pago%20Directo%20Plata%20Plus%20PPO"),
  },
  {
    id: "fm-gold",
    insurer: "first-medical",
    name: "First Medical Directo Gold",
    metal: "oro",
    network: "Libre selección (International Medical Card)",
    premiums: FM_RATES["fm-gold"],
    deductible: "$0",
    moop: MOOP,
    hospital: "$250 ($0 en Metro Pavía)",
    emergency: "$80 ($50 en Metro Pavía)",
    sources: FM_SOURCES("Pago%20Directo%20Oro%20PPO"),
  },
  {
    id: "fm-gold-plus",
    insurer: "first-medical",
    name: "First Medical Directo Gold Plus",
    metal: "oro",
    network: "Libre selección (International Medical Card)",
    premiums: FM_RATES["fm-gold-plus"],
    deductible: "$0",
    moop: MOOP,
    hospital: "$200 ($0 en Metro Pavía)",
    emergency: "$75 ($50 en Metro Pavía)",
    sources: FM_SOURCES("Pago%20Directo%20Oro%20Plus%20PPO"),
  },
];

export const comparePlan = (id: string) =>
  COMPARE_PLANS.find((p) => p.id === id);

export function premiumFor(plan: ComparePlan, age: number): number | null {
  if (!plan.premiums) return null;
  const i = age <= 20 ? 0 : age >= 65 ? plan.premiums.length - 1 : age - 20;
  return plan.premiums[i] ?? null;
}

const METAL_ORDER: Metal[] = ["bronce", "plata", "oro"];

// Same metal tier at the other insurers; if they sell none, the nearest tier, flagged as such.
export function comparables(selected: ComparePlan): {
  plans: ComparePlan[];
  nearest: Metal | null;
} {
  const others = COMPARE_PLANS.filter((p) => p.insurer !== selected.insurer);
  const same = others.filter((p) => p.metal === selected.metal);
  if (same.length) return { plans: same, nearest: null };
  const at = METAL_ORDER.indexOf(selected.metal);
  const byDistance = [...new Set(others.map((p) => p.metal))].sort(
    (a, b) =>
      Math.abs(METAL_ORDER.indexOf(a) - at) -
      Math.abs(METAL_ORDER.indexOf(b) - at),
  );
  const nearest = byDistance[0] ?? null;
  return { plans: others.filter((p) => p.metal === nearest), nearest };
}
