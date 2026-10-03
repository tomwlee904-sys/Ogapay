import MoneyInCard from './wallet/MoneyInCard'
import { useAuth } from '../context/AuthContext'
import { kycOf } from '../lib/wallet'

// The account number to transfer to (Profile, the add-money pop-up). It is the
// Wallet's "Money in" card, so the number looks the same everywhere and reads in
// both themes. (It was a blue gradient from --accent, which is near-white in dark
// mode, with white text on it.)
export default function VirtualAccountCard({ flush = false }: { flush?: boolean }) {
  const { user } = useAuth()
  return (
    <div style={{ marginBottom: flush ? 0 : 24 }}>
      <MoneyInCard verified={kycOf(user).verified} embedded />
    </div>
  )
}
