import { useMemo, useState } from "react";
import ImageUploader from "./components/ImageUploader";
import Controls from "./components/Controls";
import AsciiOutput from "./components/AsciiOutput";
import { imageToAscii } from "./lib/asciiConverter";
import { charsets, charsetPorDefecto } from "./lib/charsets";
import "./styles.css";

export default function App() {
  const [image, setImage] = useState(null);
  const [nombre, setNombre] = useState("");
  const [opts, setOpts] = useState({
    width: 100,
    charsetKey: charsetPorDefecto,
    invert: false,
    colorMode: false,
    brightness: 0,
    contrast: 0,
    gamma: 1,
  });

  const actualizar = (cambios) => setOpts((prev) => ({ ...prev, ...cambios }));

  const rows = useMemo(() => {
    if (!image) return null;
    return imageToAscii(image, {
      width: opts.width,
      charset: charsets[opts.charsetKey],
      invert: opts.invert,
      brightness: opts.brightness,
      contrast: opts.contrast,
      gamma: opts.gamma,
    });
  }, [
    image,
    opts.width,
    opts.charsetKey,
    opts.invert,
    opts.brightness,
    opts.contrast,
    opts.gamma,
  ]);

  return (
    <main className="app">
      <header>
        <h1>Conversor de Imágenes a ASCII</h1>
        {nombre && <p className="archivo">{nombre}</p>}
      </header>

      <ImageUploader
        onImage={(img, name) => {
          setImage(img);
          setNombre(name);
        }}
      />

      <Controls {...opts} onChange={actualizar} disabled={!image} />

      <AsciiOutput rows={rows} colorMode={opts.colorMode} />
    </main>
  );
}
