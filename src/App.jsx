import { Suspense, lazy, useState } from "react";

const QrStudio = lazy(() => import("./components/QrStudio"));
const PdfToolkit = lazy(() => import("./components/PdfToolkit"));

const tabs = [
  {
    id: "qr",
    label: "QR Studio",
    summary: "Prepare a polished payment card from an image or PDF page.",
  },
  {
    id: "pdf",
    label: "PDF Toolkit",
    summary: "Reorder, rotate, split, and export page sets in the browser.",
  },
];

const highlights = [
  {
    value: "100%",
    label: "Client-side",
    text: "Files stay in the browser while you work.",
  },
  {
    value: "2",
    label: "Focused tools",
    text: "One project space for QR prep and PDF cleanup.",
  },
  {
    value: "Netlify",
    label: "Ready",
    text: "Configured for a straightforward static deployment.",
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("qr");

  return (
    <div className="app-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <main className="app-layout">
        <section className="hero panel">
          <div className="hero-copy">
            <p className="eyebrow">Netlify-ready browser workspace</p>
            <h1>AI Support Studio</h1>
            <p className="hero-text">
              Prepare branded QR layouts and manage PDF page exports in one
              deployable React app.
            </p>
          </div>

          <div className="hero-highlights">
            {highlights.map((item) => (
              <article className="highlight-card" key={item.label}>
                <div className="highlight-value">{item.value}</div>
                <div className="highlight-label">{item.label}</div>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="tab-bar" aria-label="Tool navigation" role="tablist">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                className={`tab-button${isActive ? " is-active" : ""}`}
                aria-selected={isActive}
                role="tab"
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.label}</span>
                <small>{tab.summary}</small>
              </button>
            );
          })}
        </section>

        <Suspense fallback={<section className="panel loading-panel">Loading workspace...</section>}>
          {activeTab === "qr" ? <QrStudio /> : <PdfToolkit />}
        </Suspense>
      </main>
    </div>
  );
}
