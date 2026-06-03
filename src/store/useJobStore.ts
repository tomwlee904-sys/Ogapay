import { create } from "zustand";
import type { JobCategory, PaymentCurrency } from "../lib/types";

export interface JobFilters {
  search: string;
  category: JobCategory | "All";
  platform: string;
  payment: PaymentCurrency | "All";
  minPrice: number;
  maxPrice: number;
  sort: "newest" | "highest pay" | "ending soon" | "most popular";
}

interface JobState {
  filters: JobFilters;
  selectedJobId?: string;
  setFilter: <K extends keyof JobFilters>(key: K, value: JobFilters[K]) => void;
  selectJob: (id: string) => void;
  resetFilters: () => void;
}

const defaults: JobFilters = {
  search: "",
  category: "All",
  platform: "All",
  payment: "All",
  minPrice: 0,
  maxPrice: 20000,
  sort: "newest"
};

export const useJobStore = create<JobState>((set) => ({
  filters: defaults,
  setFilter: (key, value) => set((state) => ({ filters: { ...state.filters, [key]: value } })),
  selectJob: (id) => set({ selectedJobId: id }),
  resetFilters: () => set({ filters: defaults })
}));
