import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <button className="button-secondary px-3 py-2" onClick={onCopy} title="Copy">
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}
