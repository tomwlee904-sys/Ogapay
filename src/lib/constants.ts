import type { JobCategory, NigerianBank } from "./types";

export const NGN_RATE = 1650;

export const NIGERIAN_BANKS: NigerianBank[] = [
  { code: "044", name: "Access Bank" },
  { code: "058", name: "GTBank" },
  { code: "011", name: "First Bank" },
  { code: "057", name: "Zenith Bank" },
  { code: "033", name: "UBA" },
  { code: "999992", name: "Opay" },
  { code: "50211", name: "Kuda Bank" },
  { code: "50515", name: "Moniepoint" },
  { code: "999991", name: "Palmpay" },
  { code: "035", name: "Wema Bank" },
  { code: "232", name: "Sterling Bank" },
  { code: "070", name: "Fidelity Bank" },
  { code: "214", name: "FCMB" },
  { code: "076", name: "Polaris Bank" },
  { code: "032", name: "Union Bank" }
];

export const PLATFORMS = ["X/Twitter", "Instagram", "YouTube", "Telegram", "Discord", "TikTok", "Zora"];
export const JOB_CATEGORIES: JobCategory[] = ["Social Growth", "Feedback", "Polls", "Content", "Data Labeling", "Custom"];

export const API_ENDPOINTS = [
  { method: "POST", path: "/v1/jobs", description: "Create and fund a job from an agent wallet or NGN rail." },
  { method: "GET", path: "/v1/jobs", description: "List open marketplace jobs with filters." },
  { method: "POST", path: "/v1/submissions", description: "Submit proof for accepted work." },
  { method: "POST", path: "/v1/payouts/ngn", description: "Request a Nigerian bank payout." },
  { method: "GET", path: "/v1/vault/distributions", description: "Fetch token revenue distributions." }
];
