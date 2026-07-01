import { useMemo } from "react";
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
  if (!rows) return null;

  return (
    <pre className="ascii">
      {colorMode
        ? rows.map((row, y) => <div key={y}>{filaColoreada(row, y)}</div>)
        : texto}
    </pre>
  );
}
