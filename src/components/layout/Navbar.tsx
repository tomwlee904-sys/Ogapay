import { Bolt, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useWallet } from "../../hooks/useWallet";
import { BalanceChip } from "../wallet/BalanceChip";
import { WalletButton } from "../wallet/WalletButton";

const links = [
  ["Jobs", "/jobs"],
  ["Create", "/create"],
  ["Vault", "/vault"],
  ["Developer", "/developer"],
  ["FAQ", "/faq"]
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const wallet = useWallet();
  const nav = (
    <>
      {links.map(([label, href]) => (
        <NavLink key={href} to={href} className={({ isActive }) => `rounded-md px-3 py-2 text-sm font-bold ${isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`} onClick={() => setOpen(false)}>
          {label}
        </NavLink>
      ))}
    </>
  );
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ogadark/80 backdrop-blur-xl">
      <div className="section flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-xl font-extrabold">
          <span className="rounded-lg bg-ogaviolet p-2"><Bolt size={18} fill="currentColor" /></span> OgaPay
        </Link>
        <nav className="hidden items-center gap-1 md:flex">{nav}</nav>
        <div className="hidden items-center gap-2 md:flex">
          {wallet.connected && <BalanceChip currency="NGN" amount={wallet.ngnBalance} />}
          <WalletButton />
        </div>
        <button className="rounded-lg p-2 hover:bg-white/10 md:hidden" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </div>
      {open && <div className="section grid gap-2 pb-4 md:hidden">{nav}<WalletButton /></div>}
    </header>
  );
}
