// Pie de página — estilo terminal
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-outline-variant py-6 px-6 mt-16 font-mono">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-[12.5px] text-on-surface-variant">
          © {year} ai-hub — {`conocimiento práctico sobre IA generativa`}
        </p>
      </div>
    </footer>
  );
}
