/**
 * Placeholder-sider til admin og vikar.
 * Erstattes med rigtige implementationer efterhånden.
 */

export function AdminFravaerPage() {
  return <PlaceholderPage titel="Fravær" beskrivelse="Registrer og administrer lærerfravær" />;
}

export function AdminTildelingerPage() {
  return <PlaceholderPage titel="Tildelinger" beskrivelse="Tildel vikarer til udækkede lektioner" />;
}

export function AdminLektionerPage() {
  return <PlaceholderPage titel="Lektioner" beskrivelse="Oversigt over alle lektioner og deres status" />;
}

export function AdminLaererePage() {
  return <PlaceholderPage titel="Lærere" beskrivelse="Opret, rediger og slet lærere" />;
}

export function AdminVikarePage() {
  return <PlaceholderPage titel="Vikarer" beskrivelse="Oversigt over alle registrerede vikarer" />;
}

export function VikarLektionerPage() {
  return <PlaceholderPage titel="Mine lektioner" beskrivelse="Lektioner du er tildelt som vikar" />;
}

export function VikarTilgaengelighedPage() {
  return <PlaceholderPage titel="Min tilgængelighed" beskrivelse="Angiv hvornår du er ledig til vikartimer" />;
}

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

function PlaceholderPage({ titel, beskrivelse }) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900 mb-1">{titel}</h1>
      <p className="text-sm text-slate-500 mb-6">{beskrivelse}</p>
      <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
        <p className="text-slate-400 text-sm">Denne side er under udarbejdelse</p>
      </div>
    </div>
  );
}
