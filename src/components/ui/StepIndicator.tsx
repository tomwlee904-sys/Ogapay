export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {steps.map((step, index) => (
        <div key={step} className={`rounded-lg border p-3 ${index <= current ? "border-ogaviolet/60 bg-ogaviolet/15" : "border-white/10 bg-white/5"}`}>
          <div className="text-xs font-bold uppercase text-white/50">Step {index + 1}</div>
          <div className="mt-1 text-sm font-bold">{step}</div>
        </div>
      ))}
    </div>
  );
}
