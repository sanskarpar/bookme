import React from "react";

export default function AgbPage() {
  return (
    <main className="min-h-screen bg-gray-50 font-sans px-4 py-8">
      <div className="max-w-xl mx-auto bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-[#5C6F68] mb-4">Allgemeine Geschäftsbedingungen (AGB)</h1>
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">1. Geltungsbereich</h2>
          <p className="text-black text-sm">
            Diese Allgemeinen Geschäftsbedingungen gelten für alle Buchungen und Dienstleistungen, die über die Plattform bookme angeboten werden.
          </p>
        </section>
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">2. Vertragspartner</h2>
          <p className="text-black text-sm">
            Vertragspartner sind die jeweiligen Salons und die Kunden, die über bookme buchen. Bookme tritt als Vermittler auf.
          </p>
        </section>
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">3. Buchung und Zahlung</h2>
          <p className="text-black text-sm">
            Die Buchung erfolgt verbindlich über die Plattform. Die Zahlung kann online oder vor Ort im Salon erfolgen, je nach Angebot des Salons.
          </p>
        </section>
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">4. Stornierung und Widerruf</h2>
          <p className="text-black text-sm">
            Stornierungen sind gemäß den jeweiligen Salonbedingungen möglich. Ein Widerrufsrecht besteht nach den gesetzlichen Vorgaben.
          </p>
        </section>
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">5. Haftung</h2>
          <p className="text-black text-sm">
            Bookme haftet nicht für die Durchführung der Dienstleistungen durch die Salons. Ansprüche sind direkt an den Salon zu richten.
          </p>
        </section>
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">6. Datenschutz</h2>
          <p className="text-black text-sm">
            Informationen zum Datenschutz finden Sie in unserer <a href="/datenschutz" className="text-[#5C6F68] underline">Datenschutzerklärung</a>.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2 text-gray-700">7. Schlussbestimmungen</h2>
          <p className="text-black text-sm">
            Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist der Sitz von bookme.
          </p>
        </section>
        <div className="mt-8 text-xs text-gray-500 text-center">
          Stand: {new Date().toLocaleDateString("de-DE")}
        </div>
      </div>
    </main>
  );
}
