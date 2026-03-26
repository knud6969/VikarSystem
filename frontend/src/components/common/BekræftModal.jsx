/**
 * BekræftModal — en simpel bekræftelsesdialog.
 * Props:
 *   tittel      — overskrift
 *   besked      — beskrivende tekst
 *   bekræftTekst — tekst på bekræft-knappen (default: "Bekræft")
 *   variant     — "danger" | "primary" (default: "primary")
 *   onBekræft   — kaldes når brugeren bekræfter
 *   onAnnuller  — kaldes når brugeren annullerer
 */
export default function BekræftModal({
  tittel,
  besked,
  bekræftTekst = 'Bekræft',
  variant = 'primary',
  onBekræft,
  onAnnuller,
}) {
  const bekræftKlasser =
    variant === 'danger'
      ? 'bg-red-500 hover:bg-red-600 text-white'
      : 'bg-blue-600 hover:bg-blue-700 text-white';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onAnnuller} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100">
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-base font-semibold text-slate-900">{tittel}</h2>
          {besked && <p className="mt-2 text-sm text-slate-500">{besked}</p>}
        </div>
        <div className="px-6 py-5 flex gap-2">
          <button
            onClick={onAnnuller}
            className="flex-1 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Annuller
          </button>
          <button
            onClick={onBekræft}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${bekræftKlasser}`}
          >
            {bekræftTekst}
          </button>
        </div>
      </div>
    </div>
  );
}
