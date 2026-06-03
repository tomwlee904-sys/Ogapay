import { AtSign, Camera, MessageCircle, Music, Play, Radio, Send } from "lucide-react";

export function PlatformIcon({ platform, size = 18 }: { platform: string; size?: number }) {
  const Icon = platform.includes("Twitter") ? AtSign : platform === "Instagram" ? Camera : platform === "YouTube" ? Play : platform === "Telegram" ? Send : platform === "Discord" ? MessageCircle : platform === "TikTok" ? Music : Radio;
  return <Icon size={size} />;
}
