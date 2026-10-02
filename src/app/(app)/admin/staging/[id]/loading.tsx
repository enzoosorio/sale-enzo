/** Wizard-shaped skeleton: no empty form, no red banner while the draft loads. */
export default function Loading() {
  return (
    <div className="fixed inset-0 z-40 flex min-w-0 flex-col bg-gray-50 md:static md:z-auto md:flex-1" aria-busy="true">
      <div className="border-b border-gray-200 bg-white px-5 py-3">
        <div className="mx-auto flex max-w-xl animate-pulse items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-200" />
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-gray-200" />
            <div className="h-4 w-40 rounded bg-gray-200" />
          </div>
        </div>
        <div className="mx-auto mt-4 flex max-w-xl animate-pulse gap-1.5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-1.5 flex-1 rounded-full bg-gray-200" />
          ))}
        </div>
      </div>
      <div className="mx-auto w-full max-w-xl animate-pulse space-y-6 px-5 pt-8">
        <div className="h-6 w-24 rounded bg-gray-200" />
        <div className="grid grid-cols-2 gap-4">
          <div className="aspect-4/5 rounded-2xl bg-gray-200" />
          <div className="aspect-4/5 rounded-2xl bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
