import React from "react";

export default function ImpressumPage() {
  return (
    <main className="min-h-screen bg-gray-50 font-sans px-4 py-8">
      <div className="max-w-xl mx-auto bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-[#5C6F68] mb-4">Impressum</h1>
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Angaben gemäß § 5 TMG</h2>
          <p className="text-black text-sm">
            bookme<br />
            Musterstraße 1<br />
            12345 Musterstadt<br />
            Deutschland
          </p>
        </section>
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Vertreten durch</h2>
          <p className="text-black text-sm">
            Max Mustermann
          </p>
        </section>
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Kontakt</h2>
          <p className="text-black text-sm">
            E-Mail: <a href="mailto:hello@bookme.com" className="text-[#5C6F68] underline">hello@bookme.com</a>
          </p>
        </section>
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Umsatzsteuer-ID</h2>
          <p className="text-black text-sm">
            Umsatzsteuer-Identifikationsnummer gemäß §27 a Umsatzsteuergesetz: DE123456789
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Haftung für Inhalte</h2>
          <p className="text-black text-sm">
            Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
          </p>
        </section>
        <div className="mt-8 text-xs text-gray-500 text-center">
          Stand: {new Date().toLocaleDateString("de-DE")}
        </div>
      </div>
    </main>
  );
}
