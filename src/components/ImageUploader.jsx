import { useRef, useState } from "react";

// Carga un archivo de imagen y devuelve un HTMLImageElement ya listo al padre.
function cargarImagen(file, onImage) {
  if (!file || !file.type.startsWith("image/")) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    onImage(img, file.name);
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

export default function ImageUploader({ onImage }) {
  const inputRef = useRef(null);
  const [arrastrando, setArrastrando] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastrando(false);
    cargarImagen(e.dataTransfer.files?.[0], onImage);
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
        accept="image/*"
        hidden
        onChange={(e) => cargarImagen(e.target.files?.[0], onImage)}
      />
      <p>
        <strong>Arrastra una imagen aquí</strong> o haz clic para elegir un archivo
      </p>
    </div>
  );
}
