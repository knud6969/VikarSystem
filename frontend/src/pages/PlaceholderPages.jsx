/**
 * PlaceholderPages.jsx
 * Indeholder hjælpekomponenter der bruges på tværs af appen.
 */

export function UautorisPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-4xl font-bold text-slate-300 mb-2">403</p>
        <p className="text-slate-600">Du har ikke adgang til denne side.</p>
      </div>
    </div>
  );
}