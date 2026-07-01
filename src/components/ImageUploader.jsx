import { useRef, useState } from "react";
import { useT } from "../lib/i18n";

// Carga el archivo elegido y lo enruta según su tipo:
// - audio -> onAudio(file)
// - vídeo -> onVideo(file)
// - imagen -> carga un HTMLImageElement y onImage(img, nombre)
function cargar(file, onImage, onVideo, onAudio) {
  if (!file) return;
  if (file.type.startsWith("audio/")) {
    onAudio(file);
    return;
  }
  if (file.type.startsWith("video/")) {
    onVideo(file);
    return;
  }
  if (!file.type.startsWith("image/")) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    onImage(img, file.name);
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

export default function ImageUploader({ onImage, onVideo, onAudio }) {
  const t = useT();
  const inputRef = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastrando(false);
    cargar(e.dataTransfer.files?.[0], onImage, onVideo, onAudio);
  };

  return (
    <div
      className={`uploader ${arrastrando ? "uploader--activo" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setArrastrando(true);
      }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        hidden
        onChange={(e) => cargar(e.target.files?.[0], onImage, onVideo, onAudio)}
      />
      <div className="uploader__icon">&#9679;</div>
      <div>
        <div className="uploader__title">
          {arrastrando ? t.dropHere : t.loadBay}
        </div>
        <div className="uploader__sub">{arrastrando ? "" : t.loadSub}</div>
      </div>
    </div>
  );
}
