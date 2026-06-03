import { useMemo, useState } from "react";

export function useWithdraw(rate: number) {
  const [amountUsdc, setAmountUsdc] = useState(50);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const amountNgn = amountUsdc * rate;
  const feeNgn = Math.min(amountNgn * 0.01, 1500);
  const receivableNgn = amountNgn - feeNgn;

  const canVerify = useMemo(() => /^\d{10}$/.test(accountNumber), [accountNumber]);
  const verify = () => {
    if (canVerify) setAccountName("ADA CHINEDU OKAFOR");
  };

  return { amountUsdc, setAmountUsdc, accountNumber, setAccountNumber, accountName, verify, canVerify, amountNgn, feeNgn, receivableNgn };
}
