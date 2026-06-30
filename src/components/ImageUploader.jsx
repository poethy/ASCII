import { useRef, useState } from "react";

// Carga el archivo elegido y lo enruta según su tipo:
// - vídeo -> onVideo(file)
// - imagen -> carga un HTMLImageElement y onImage(img, nombre)
function cargar(file, onImage, onVideo) {
  if (!file) return;
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

export default function ImageUploader({ onImage, onVideo }) {
  const inputRef = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastrando(false);
    cargar(e.dataTransfer.files?.[0], onImage, onVideo);
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
        accept="image/*,video/*"
        hidden
        onChange={(e) => cargar(e.target.files?.[0], onImage, onVideo)}
      />
      <p>
        <strong>Arrastra una imagen o vídeo aquí</strong> o haz clic para elegir un archivo
      </p>
    </div>
  );
}
