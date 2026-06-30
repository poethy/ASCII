import { useMemo, useState } from "react";
import { asciiToText } from "../lib/asciiConverter";

// Agrupa celdas consecutivas con el mismo color en un solo <span> para no
// generar decenas de miles de nodos cuando se renderiza en color.
function filaColoreada(row, y) {
  const spans = [];
  let buffer = "";
  let colorActual = null;

  const empuja = (key) => {
    if (buffer === "") return;
    spans.push(
      <span key={key} style={{ color: colorActual }}>
        {buffer}
      </span>
    );
    buffer = "";
  };

  for (let x = 0; x < row.length; x++) {
    const cell = row[x];
    const color = `rgb(${cell.r},${cell.g},${cell.b})`;
    if (color !== colorActual) {
      empuja(`${y}-${x}`);
      colorActual = color;
    }
    buffer += cell.char;
  }
  empuja(`${y}-fin`);
  return spans;
}

export default function AsciiOutput({ rows, colorMode }) {
  const texto = useMemo(() => (rows ? asciiToText(rows) : ""), [rows]);
  const [copiado, setCopiado] = useState(false);

  if (!rows) return null;

  const copiar = async () => {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
  };

  const descargar = () => {
    const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ascii-art.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="output">
      <div className="output__acciones">
        <button onClick={copiar}>{copiado ? "¡Copiado!" : "Copiar"}</button>
        <button onClick={descargar}>Descargar .txt</button>
      </div>

      <pre className="ascii">
        {colorMode
          ? rows.map((row, y) => <div key={y}>{filaColoreada(row, y)}</div>)
          : texto}
      </pre>
    </div>
  );
}
