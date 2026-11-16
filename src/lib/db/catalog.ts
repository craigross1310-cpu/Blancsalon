/**
 * BLANC treatment menu for the demo.
 *
 * Source: screenshots of @blanc_salon_21 supplied on 16 Nov 2026 —
 *  - "Facial Price List" post (left-hand column partly cut off in the screenshot)
 *  - "HIFU Body Pricelist" post (single-session original prices)
 *  - Black Friday offers post and lash / brow photos.
 *
 * Every item carries a review note telling the owner exactly what to confirm.
 * Durations and deposit settings are NOT published by BLANC — they are demo
 * values chosen to show the fixed / percentage / no-deposit options.
 */

export interface CatalogItem {
  category: string;
  name: string;
  summary: string;
  description: string;
  pricePence: number;
  priceNote?: string;
  durationMin: number;
  depositType: "fixed" | "percentage";
  depositFixedPence?: number;
  depositPercent?: number;
  preparation?: string;
  aftercare?: string;
  image?: string;
  onlineBooking?: boolean;
  featured?: boolean;
  review: string;
}

const DEMO = "Duration and deposit are demo values — BLANC to confirm.";
const DRAFT = "Description is draft copy — BLANC to approve or rewrite.";
const CUT = (seen: string) =>
  `Name partly cut off on the Instagram price list (seen: "${seen}") — BLANC to confirm the full name.`;
const TBC = "Price not visible in the supplied screenshots — add the price, then switch on online booking.";

const NEEDLING_AFTERCARE =
  "[PLACEHOLDER — BLANC to supply aftercare advice, e.g. SPF, avoiding make-up and heat for a set period]";

export const CATALOG: CatalogItem[] = [
  // ── Medical Microdermabrasion Facials ──
  {
    category: "Medical Microdermabrasion Facials",
    name: "Express Microdermabrasion",
    summary: "A quick resurfacing facial to refine texture and brighten.",
    description:
      "Medical-grade microdermabrasion gently exfoliates the outer layer of the skin to reveal a smoother, brighter complexion.",
    pricePence: 4500,
    durationMin: 45,
    depositType: "fixed",
    depositFixedPence: 1000,
    featured: true,
    review: `${CUT("…S MICRODERMABRASION £45")} ${DEMO} ${DRAFT}`,
  },
  {
    category: "Medical Microdermabrasion Facials",
    name: "Microdermabrasion Facial",
    summary: "The full microdermabrasion facial experience.",
    description:
      "A longer medical microdermabrasion treatment for deeper resurfacing, tailored to your skin on the day.",
    pricePence: 7000,
    durationMin: 60,
    depositType: "fixed",
    depositFixedPence: 1500,
    review: `${CUT("…E MICRODERMABRASION £70")} ${DEMO} ${DRAFT}`,
  },
  {
    category: "Medical Microdermabrasion Facials",
    name: "Medical Microdermabrasion",
    summary: "Targeted medical microdermabrasion.",
    description: "A focused microdermabrasion treatment to polish and refresh the skin.",
    pricePence: 3500,
    durationMin: 30,
    depositType: "fixed",
    depositFixedPence: 0,
    review: `${CUT("…EDICAL MICRODERMABRASION £35")} Set to NO deposit in the demo to show that option. ${DEMO} ${DRAFT}`,
  },
  // ── Let's Glow Facials ──
  {
    category: "Let's Glow Facials",
    name: "Express Let's Glow",
    summary: "An express facial for instant radiance.",
    description: "BLANC's signature glow facial in an express format — ideal before an event.",
    pricePence: 5500,
    durationMin: 45,
    depositType: "fixed",
    depositFixedPence: 1000,
    review: `${CUT("…SS LETS GLOW £55")} ${DEMO} ${DRAFT}`,
  },
  {
    category: "Let's Glow Facials",
    name: "Let's Glow Facial",
    summary: "The full glow facial.",
    description: "BLANC's signature glow facial, tailored to your skin's needs for a healthy, luminous finish.",
    pricePence: 8000,
    durationMin: 75,
    depositType: "percentage",
    depositPercent: 25,
    featured: true,
    review: `${CUT("…E LETS GLOW £80")} ${DEMO} ${DRAFT}`,
  },
  // ── Needling Facials ──
  {
    category: "Needling Facials",
    name: "Express Needling",
    summary: "Microneedling to support smoother, firmer-looking skin.",
    description: "An express microneedling treatment to help improve skin texture and tone.",
    pricePence: 6000,
    durationMin: 60,
    depositType: "fixed",
    depositFixedPence: 1500,
    aftercare: NEEDLING_AFTERCARE,
    review: `${CUT("…S NEEDLING £60")} ${DEMO} ${DRAFT}`,
  },
  {
    category: "Needling Facials",
    name: "Needling Facial",
    summary: "The full microneedling facial.",
    description: "A full microneedling facial to help refine texture, tone and the appearance of fine lines.",
    pricePence: 8500,
    durationMin: 75,
    depositType: "percentage",
    depositPercent: 25,
    aftercare: NEEDLING_AFTERCARE,
    review: `${CUT("… NEEDLING £85")} ${DEMO} ${DRAFT}`,
  },
  {
    category: "Needling Facials",
    name: "Needling, Dermaplaning & Light Peel",
    summary: "Three treatments in one for a fresh, smooth complexion.",
    description: "Microneedling combined with dermaplaning and a light peel.",
    pricePence: 10000,
    durationMin: 90,
    depositType: "percentage",
    depositPercent: 25,
    featured: true,
    aftercare: NEEDLING_AFTERCARE,
    review: `${DEMO} ${DRAFT}`,
  },
  {
    category: "Needling Facials",
    name: "Needling & Skin Booster",
    summary: "Microneedling paired with a skin booster.",
    description: "Microneedling combined with a facial skin booster.",
    pricePence: 13000,
    durationMin: 90,
    depositType: "percentage",
    depositPercent: 25,
    aftercare: NEEDLING_AFTERCARE,
    review: `${DEMO} ${DRAFT}`,
  },
  {
    category: "Needling Facials",
    name: "Needling & Under Eye Booster",
    summary: "Microneedling paired with an under-eye booster.",
    description: "Microneedling combined with an under-eye skin booster.",
    pricePence: 15000,
    durationMin: 90,
    depositType: "percentage",
    depositPercent: 25,
    aftercare: NEEDLING_AFTERCARE,
    review: `${DEMO} ${DRAFT}`,
  },
  // ── Dermaplaning ──
  {
    category: "Dermaplaning Facials",
    name: "Express Dermaplaning",
    summary: "Removes dead skin and fine facial hair for a smooth canvas.",
    description: "Express dermaplaning facial.",
    pricePence: 0,
    priceNote: "Price to be confirmed",
    durationMin: 30,
    depositType: "fixed",
    onlineBooking: false,
    review: `${TBC} ${DEMO} ${DRAFT}`,
  },
  {
    category: "Dermaplaning Facials",
    name: "Express Dermaplaning & Light Peel",
    summary: "Dermaplaning followed by a light peel.",
    description: "Express dermaplaning combined with a light peel.",
    pricePence: 0,
    priceNote: "Price to be confirmed",
    durationMin: 45,
    depositType: "fixed",
    onlineBooking: false,
    review: `${TBC} ${DEMO} ${DRAFT}`,
  },
  // ── Skin Boosters ──
  ...["Facial Skin Booster", "Under Eye Booster", "Face & Under Eye Booster"].map(
    (name): CatalogItem => ({
      category: "Skin Boosters",
      name,
      summary: "Skin booster treatment.",
      description: `${name}.`,
      pricePence: 0,
      priceNote: "Price to be confirmed",
      durationMin: 45,
      depositType: "percentage",
      depositPercent: 25,
      onlineBooking: false,
      review: `${TBC} ${DEMO} ${DRAFT}`,
    })
  ),
  // ── HIFU Face & Neck ──
  ...["HIFU Face & Neck", "HIFU Face Only", "HIFU Neck Only"].map(
    (name): CatalogItem => ({
      category: "HIFU Face & Neck",
      name,
      summary: "Non-surgical HIFU treatment.",
      description: `${name}. Black Friday 2026 offer seen on Instagram: course of 2 face & neck treatments for £500 (save £100).`,
      pricePence: 0,
      priceNote: "Price to be confirmed",
      durationMin: 60,
      depositType: "percentage",
      depositPercent: 25,
      onlineBooking: false,
      review: `${TBC} ${DEMO} ${DRAFT}`,
    })
  ),
  // ── Morpheus8 ──
  {
    category: "Morpheus8",
    name: "Morpheus8 Face & Neck",
    summary: "Radiofrequency microneedling for face and neck.",
    description:
      "Morpheus8 combines microneedling with radiofrequency energy. A course of treatments is recommended 4–6 weeks apart for maximum and long-lasting results.",
    pricePence: 15000,
    durationMin: 60,
    depositType: "percentage",
    depositPercent: 25,
    featured: true,
    review: `${CUT("…: NECK £150")} ${DEMO} ${DRAFT}`,
  },
  {
    category: "Morpheus8",
    name: "Morpheus8 Face Only",
    summary: "Morpheus8 for the face.",
    description: "Morpheus8 radiofrequency microneedling for the face.",
    pricePence: 9900,
    durationMin: 45,
    depositType: "percentage",
    depositPercent: 25,
    review: `${CUT("…ONLY £99 (one of two £99 lines)")} ${DEMO} ${DRAFT}`,
  },
  {
    category: "Morpheus8",
    name: "Morpheus8 Neck Only",
    summary: "Morpheus8 for the neck.",
    description: "Morpheus8 radiofrequency microneedling for the neck.",
    pricePence: 9900,
    durationMin: 45,
    depositType: "percentage",
    depositPercent: 25,
    review: `${CUT("…ONLY £99 (one of two £99 lines)")} ${DEMO} ${DRAFT}`,
  },
  {
    category: "Morpheus8",
    name: "Morpheus8 Face, Neck & Décolletage",
    summary: "Morpheus8 for face, neck and décolletage.",
    description: "Morpheus8 radiofrequency microneedling for the face, neck and décolletage.",
    pricePence: 20000,
    durationMin: 75,
    depositType: "percentage",
    depositPercent: 25,
    review: `${CUT("…NECK & DÉCOLLETAGE £200")} ${DEMO} ${DRAFT}`,
  },
  {
    category: "Morpheus8",
    name: "Morpheus8 Course of 3 — Face & Neck",
    summary: "A course of three treatments, booked 4–6 weeks apart.",
    description:
      "A course of three Morpheus8 face & neck treatments, recommended 4–6 weeks apart for maximum and long-lasting results. This booking is for your first session.",
    pricePence: 39000,
    durationMin: 60,
    depositType: "fixed",
    depositFixedPence: 5000,
    review: `${CUT("…OF 3 TREATMENTS £390")} How course bookings should work is for BLANC to decide. ${DEMO}`,
  },
  // ── HIFU Body (single session original prices from the HIFU Body Pricelist post) ──
  ...(
    [
      ["Chest", 12000, 30],
      ["Upper Arm", 15000, 45],
      ["Lower Arm", 13000, 30],
      ["Full Arm", 25000, 60],
      ["Lower Abdomen", 15000, 45],
      ["Upper Abdomen", 13000, 45],
      ["Full Abdomen", 25000, 60],
      ["Hips", 15000, 45],
      ['Back "Bra Area"', 13000, 45],
      ["Inner Thigh", 15000, 45],
      ["Outer Thigh", 15000, 45],
      ["Inner & Outer Thigh", 27000, 60],
      ["Knees", 12000, 30],
      ["Calves", 12000, 30],
      ['Buttocks "Bum Lift"', 16000, 45],
    ] as const
  ).map(
    ([area, price, mins], i): CatalogItem => ({
      category: "HIFU Body",
      name: `HIFU Body — ${area}`,
      summary: "Non-surgical body contouring. Single session.",
      description:
        "Pain-free, advanced HIFU technology for non-surgical body contouring: firmer, smoother skin, targets stubborn fat, tones and lifts. All body treatments require 3–6 sessions for maximum results depending on the individual client, with 4–6 weeks between each session. Any block of 6 sessions: you pay for 5, with the 6th session free.",
      pricePence: price,
      durationMin: mins,
      depositType: "percentage",
      depositPercent: 20,
      featured: i === 4,
      review: `Price is the single-session original price from the HIFU Body Pricelist post. Description uses BLANC's own wording from that post. ${DEMO}`,
    })
  ),
  // ── Wellbeing ──
  {
    category: "Wellbeing",
    name: "Pelvic Chair — Course of 6",
    summary: "A non-invasive, comfortable treatment for pelvic floor strength.",
    description:
      "Supports pelvic floor strength, improves bladder control and enhances intimate wellness — a non-invasive, comfortable treatment. Recommended as a course of 6.",
    pricePence: 0,
    priceNote: "Price to be confirmed",
    durationMin: 30,
    depositType: "percentage",
    depositPercent: 20,
    onlineBooking: false,
    review: `${TBC} Black Friday 2026 offer seen: course of 6 for £350 (save £100). Description uses BLANC's own wording. ${DEMO}`,
  },
  // ── Lashes & Brows (seen in photos only) ──
  {
    category: "Lashes & Brows",
    name: "Lash Extensions",
    summary: "Full, fluffy lash sets.",
    description: "Lash extension sets tailored to your eye shape.",
    pricePence: 0,
    priceNote: "Price to be confirmed",
    durationMin: 120,
    depositType: "fixed",
    depositFixedPence: 1000,
    image: "/gallery/lash-2.jpg",
    onlineBooking: false,
    review: `Treatment inferred from Instagram photos only — BLANC to confirm names, prices and durations. ${TBC}`,
  },
  {
    category: "Lashes & Brows",
    name: "Lash Lift & Tint",
    summary: "Lifted, defined natural lashes.",
    description: "A lift and tint for your natural lashes.",
    pricePence: 0,
    priceNote: "Price to be confirmed",
    durationMin: 60,
    depositType: "fixed",
    depositFixedPence: 1000,
    image: "/gallery/lash-1.jpg",
    onlineBooking: false,
    review: `Treatment inferred from Instagram photos only — BLANC to confirm. ${TBC}`,
  },
  {
    category: "Lashes & Brows",
    name: "Brow Lamination",
    summary: "Brushed-up, fuller-looking brows.",
    description: "Brow lamination to set brows in a fuller, defined shape.",
    pricePence: 0,
    priceNote: "Price to be confirmed",
    durationMin: 45,
    depositType: "fixed",
    depositFixedPence: 1000,
    image: "/gallery/brows-1.jpg",
    onlineBooking: false,
    review: `Treatment inferred from Instagram photos only — BLANC to confirm. ${TBC}`,
  },
];

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
