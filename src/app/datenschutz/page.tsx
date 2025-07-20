import React from "react";

export default function DatenschutzPage() {
  return (
    <main className="min-h-screen bg-gray-50 font-sans px-4 py-8">
      <div className="max-w-xl mx-auto bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-[#5C6F68] mb-4">Datenschutzerklärung</h1>
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">1. Allgemeine Hinweise</h2>
          <p className="text-black text-sm">
            Der Schutz Ihrer persönlichen Daten ist uns sehr wichtig. Nachfolgend informieren wir Sie über die Erhebung, Verarbeitung und Nutzung Ihrer Daten im Rahmen der Nutzung von bookme.
          </p>
        </section>
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">2. Verantwortliche Stelle</h2>
          <p className="text-black text-sm">
            Verantwortlich für die Datenverarbeitung ist bookme, E-Mail: hello@bookme.com.
          </p>
        </section>
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">3. Erhebung und Verarbeitung personenbezogener Daten</h2>
          <p className="text-black text-sm">
            Wir erheben personenbezogene Daten, wenn Sie ein Konto erstellen, eine Buchung vornehmen oder uns kontaktieren. Die Daten werden ausschließlich zur Vertragsabwicklung und zur Verbesserung unseres Angebots verwendet.
          </p>
        </section>
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">4. Weitergabe von Daten</h2>
          <p className="text-black text-sm">
            Eine Weitergabe Ihrer Daten erfolgt nur an die jeweiligen Salons zur Durchführung der Buchung oder wenn gesetzliche Vorgaben dies erfordern.
          </p>
        </section>
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">5. Ihre Rechte</h2>
          <p className="text-black text-sm">
            Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung Ihrer Daten sowie das Recht auf Datenübertragbarkeit. Kontaktieren Sie uns hierzu unter hello@bookme.com.
          </p>
        </section>
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">6. Cookies und Tracking</h2>
          <p className="text-black text-sm">
            Unsere Plattform verwendet Cookies, um die Nutzung zu analysieren und die Benutzerfreundlichkeit zu verbessern. Sie können die Speicherung von Cookies in Ihrem Browser deaktivieren.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2 text-gray-700">7. Änderungen</h2>
          <p className="text-black text-sm">
            Wir behalten uns vor, diese Datenschutzerklärung zu ändern. Die jeweils aktuelle Version ist auf unserer Website verfügbar.
          </p>
        </section>
        <div className="mt-8 text-xs text-gray-500 text-center">
          Stand: {new Date().toLocaleDateString("de-DE")}
        </div>
      </div>
    </main>
  );
}
