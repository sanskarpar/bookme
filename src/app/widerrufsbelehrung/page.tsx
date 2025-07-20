import React from "react";

export default function WiderrufsbelehrungPage() {
  return (
    <main className="min-h-screen bg-gray-50 font-sans px-4 py-8">
      <div className="max-w-xl mx-auto bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-[#5C6F68] mb-4">Widerrufsbelehrung</h1>
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Widerrufsrecht</h2>
          <p className="text-black text-sm">
            Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen.
          </p>
        </section>
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Widerrufsfrist</h2>
          <p className="text-black text-sm">
            Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.
          </p>
        </section>
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Folgen des Widerrufs</h2>
          <p className="text-black text-sm">
            Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf bei uns eingegangen ist.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2 text-gray-700">Ausschluss des Widerrufsrechts</h2>
          <p className="text-black text-sm">
            Das Widerrufsrecht besteht nicht bei Dienstleistungen, die bereits vollständig erbracht wurden oder bei denen die Ausführung bereits begonnen hat.
          </p>
        </section>
        <div className="mt-8 text-xs text-gray-500 text-center">
          Stand: {new Date().toLocaleDateString("de-DE")}
        </div>
      </div>
    </main>
  );
}
