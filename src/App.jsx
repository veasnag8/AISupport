import QrStudio from "./components/QrStudio";

const highlights = [
  {
    value: "QR",
    label: "Only",
    text: "This workspace is now focused on QR layout preparation only.",
  },
  {
    value: "PNG",
    label: "Export",
    text: "Download the final branded QR card directly from the browser.",
  },
  {
    value: "Netlify",
    label: "Ready",
    text: "Configured for a straightforward static deployment.",
  },
];

export default function App() {
  return (
    <div className="app-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <main className="app-layout">
        <section className="hero panel">
          <div className="hero-copy">
            <p className="eyebrow">Netlify-ready QR workspace</p>
            <h1>AI Support Studio</h1>
            <p className="hero-text">
              Prepare branded QR layouts in a simpler single-purpose tool that
              is ready to deploy on Netlify.
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

        <QrStudio />
      </main>
    </div>
  );
}
