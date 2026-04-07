import { useState } from 'react';

/**
 * Wrapper der viser en kontakt-tooltip ved hover.
 * Brug: <KontaktTooltip navn="..." email="..." telefon="...">
 *         <span>initialer</span>
 *       </KontaktTooltip>
 */
export default function KontaktTooltip({ navn, email, telefon, children }) {
  const [vis, setVis] = useState(false);

  if (!navn) return children;

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVis(true)}
      onMouseLeave={() => setVis(false)}
    >
      {children}
      {vis && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 px-3 py-2.5 whitespace-nowrap text-left">
            <p className="text-xs font-semibold text-slate-900">{navn}</p>
            {email && (
              <p className="text-xs text-slate-500 mt-0.5">{email}</p>
            )}
            {telefon && (
              <p className="text-xs text-slate-500">{telefon}</p>
            )}
          </div>
          <div
            className="w-2 h-2 bg-white border-b border-r border-slate-200 rotate-45 mx-auto -mt-1"
          />
        </div>
      )}
    </div>
  );
}
