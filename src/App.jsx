import QrStudio from "./components/QrStudio";

export default function App() {
  return (
    <div className="app-shell">
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />

      <main className="app-layout">
        <QrStudio />
      </main>
    </div>
  );
}
