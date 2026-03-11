/**
 * Centreret loading-indikator.
 * Bruges mens data hentes fra API'et.
 */
export default function LoadingSpinner({ tekst = 'Henter data…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
      <p className="text-sm text-slate-500">{tekst}</p>
    </div>
  );
}
