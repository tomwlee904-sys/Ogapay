interface StatCardProps {
  number: string;
  label: string;
}

export default function StatCard({ number, label }: StatCardProps) {
  return (
    <div
      className="bg-white dark:bg-[#1a1a2e] 
      border border-gray-200 dark:border-[#2a2a3e] 
      rounded-xl p-4 md:p-6 text-center
      transition-all duration-200 hover:border-purple-400"
    >
      <p className="text-2xl md:text-3xl font-extrabold text-[#8b5cf6]">
        {number}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  );
}
