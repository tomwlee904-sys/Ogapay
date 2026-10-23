import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";

/* Quick social jobs on X, priced per action (the server checks the same prices,
   see GET /tasks/social-prices). Each person is paid the price for their action;
   blue-tick versions can only be taken by X accounts with a blue tick and cost
   2.4x. Raid packs buy a set number of raiders (like + repost + comment). The
   10% platform fee is added on top. Prices are in naira. */

export type SocialAction = "FOLLOW" | "LIKE" | "REPOST" | "REPLY" | "BOOKMARK" | "QUOTE" | "VIEW" | "RAID";
export type RaidPack = "SMALL" | "MEDIUM" | "LARGE" | "MEGA";

export type SocialPrices = {
  blueTimes: number;
  actions: Record<string, { price: number; bluePrice: number }>;
  raidPacks: { pack: RaidPack; price: number; places: number; perRaider: number; bluePrice: number; bluePerRaider: number }[];
  holdMinutes: number;
  stagger: { from: number; everyMinutes: number; actions: string[] };
};

// Same as the server; replaced by the server's list once it loads
export const DEFAULT_PRICES: SocialPrices = {
  blueTimes: 2.4,
  actions: {
    FOLLOW: { price: 100, bluePrice: 240 },
    LIKE: { price: 50, bluePrice: 120 },
    REPOST: { price: 50, bluePrice: 120 },
    REPLY: { price: 50, bluePrice: 120 },
    BOOKMARK: { price: 50, bluePrice: 120 },
    QUOTE: { price: 50, bluePrice: 120 },
    VIEW: { price: 5, bluePrice: 12 },
  },
  raidPacks: [
    { pack: "SMALL", price: 1500, places: 10, perRaider: 150, bluePrice: 3600, bluePerRaider: 360 },
    { pack: "MEDIUM", price: 3000, places: 20, perRaider: 150, bluePrice: 7200, bluePerRaider: 360 },
    { pack: "LARGE", price: 7500, places: 50, perRaider: 150, bluePrice: 18000, bluePerRaider: 360 },
    { pack: "MEGA", price: 15000, places: 100, perRaider: 150, bluePrice: 36000, bluePerRaider: 360 },
  ],
  holdMinutes: 15,
  stagger: { from: 50, everyMinutes: 3, actions: ["REPOST", "RAID"] },
};

export const PACK_NAMES: Record<RaidPack, string> = { SMALL: "Small", MEDIUM: "Medium", LARGE: "Large", MEGA: "Mega" };

// The quick task form's labels -> the action the server prices
export const ACTION_OF: Record<string, SocialAction> = {
  Followers: "FOLLOW", Likes: "LIKE", Reposts: "REPOST", Comments: "REPLY", Bookmarks: "BOOKMARK", Quotes: "QUOTE", Views: "VIEW", Raid: "RAID",
};

let cached: SocialPrices | null = null;
export function useSocialPrices(): SocialPrices {
  const [prices, setPrices] = useState<SocialPrices>(cached || DEFAULT_PRICES);
  useEffect(() => {
    if (cached) return;
    apiRequest<any>("/tasks/social-prices", { auth: false } as any).then((d) => {
      if (!d?.actions?.length) return;
      cached = {
        blueTimes: Number(d.blueTimes) || 2.4,
        actions: Object.fromEntries(d.actions.map((a: any) => [a.action, { price: Number(a.price), bluePrice: Number(a.bluePrice) }])),
        raidPacks: d.raidPacks,
        holdMinutes: Number(d.holdMinutes) || 15,
        stagger: d.stagger || DEFAULT_PRICES.stagger,
      };
      setPrices(cached);
    }).catch(() => { /* the built-in list matches the server */ });
  }, []);
  return prices;
}

export function priceOf(p: SocialPrices, action: SocialAction, blue: boolean, pack?: RaidPack): number {
  if (action === "RAID") {
    const rp = p.raidPacks.find((r) => r.pack === pack) || p.raidPacks[0];
    return blue ? rp.bluePerRaider : rp.perRaider;
  }
  const a = p.actions[action];
  return a ? (blue ? a.bluePrice : a.price) : 0;
}

export function isStaggered(p: SocialPrices, action: SocialAction, places: number) {
  return p.stagger.actions.includes(action) && places >= p.stagger.from;
}

// A tenth of the places per batch, at least 10 (as the server works it out)
export const batchSizeFor = (places: number) => Math.max(10, Math.ceil(places / 10));

// An X post or profile link the server accepts as the job's target
export const X_TARGET = /^https:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/[A-Za-z0-9_]{1,15}(?:\/status\/\d{5,25})?\/?(?:\?.*)?$/i;
