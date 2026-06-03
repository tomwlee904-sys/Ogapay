import { useState } from "react";
import { NGN_RATE } from "../lib/constants";

export function useExchangeRate() {
  const [rate, setRate] = useState(NGN_RATE);
  const [updatedAt, setUpdatedAt] = useState(new Date());
  const refresh = () => {
    const next = NGN_RATE + Math.round((Math.random() - 0.5) * 28);
    setRate(next);
    setUpdatedAt(new Date());
  };
  return { rate, updatedAt, refresh };
}
