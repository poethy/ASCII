function formatear(s) {
  s = Math.max(0, s || 0);
  const m = Math.floor(s / 60);
  const seg = Math.floor(s % 60);
  return `${m}:${String(seg).padStart(2, "0")}`;
}

export default function VideoControls({
  playing,
  onTogglePlay,
  current,
  duration,
  onSeek,
  onExport,
  exportando,
  progreso,
}) {
  const ocupado = !!exportando;
  return (
    <div className="transport">
      <div className="transport__row">
        <button
          type="button"
          className="transport__play"
          onClick={onTogglePlay}
          disabled={ocupado}
        >
          {playing ? "⏸" : "▶"}
        </button>
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.05"
          value={current}
          disabled={ocupado}
          onChange={(e) => onSeek(Number(e.target.value))}
        />
        <span className="transport__time">
          {formatear(current)} / {formatear(duration)}
        </span>
      </div>

      <div className="transport__row">
        <button type="button" className="btn" onClick={() => onExport("gif")} disabled={ocupado}>
          Exportar GIF
        </button>
        <button type="button" className="btn" onClick={() => onExport("webm")} disabled={ocupado}>
          Exportar WebM
        </button>
        {ocupado && (
          <span className="transport__prog">
            Exportando {exportando.toUpperCase()}… {Math.round(progreso * 100)}%
          </span>
        )}
      </div>
    </div>
  );
}
