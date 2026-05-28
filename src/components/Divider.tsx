export default function Divider({ className = "" }: { className?: string }) {
  return (
    <div
      className={`border-t border-gray-100 dark:border-[#2a2a3e] my-8 ${className}`}
    />
  );
}
