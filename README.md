# Conversor de Imágenes a ASCII

App web para convertir imágenes en arte ASCII. Hecha con **Vite + React**.

## Features

- Subida de imagen o **vídeo (.mp4, .webm…)** por botón/arrastrar, **o webcam en tiempo real**.
- Reproductor de vídeo con play/pausa y barra de progreso.
- Exportar el vídeo ASCII como **GIF** o **WebM**.
- Slider de ancho/resolución (20–240 caracteres).
- Varios sets de caracteres (`detallada`, `estandar`, `simple`, `bloques`) + opción de invertir.
- Ajustes de imagen: brillo, contraste y gamma (con botón para restablecer).
- Modo **detección de bordes (Sobel)**: line-art con caracteres direccionales (`| - / \`) y umbral ajustable.
- Modo color: cada carácter toma el color del píxel original.
- Copiar al portapapeles y descargar como `.txt` o `.png` (respeta el color).

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build de producción
```

## Estructura

```
src/
  lib/
    charsets.js        # rampas de caracteres (oscuro -> claro)
    asciiConverter.js  # lógica pura imagen -> celdas ASCII (+ Sobel, render a canvas)
    convertir.js       # mapeo opciones de la app -> imageToAscii (compartido)
    videoExport.js     # exportación a GIF (gifenc) y WebM (MediaRecorder)
    descargar.js       # utilidad para descargar un Blob
  components/
    ImageUploader.jsx  # input + drag & drop (imagen o vídeo)
    Controls.jsx       # ancho, charset, invertir, color, ajustes, bordes
    VideoControls.jsx  # play/pausa, barra de progreso y exportación
    AsciiOutput.jsx    # render (texto/color) + copiar/descargar
  hooks/
    useWebcam.js       # cámara + bucle de animación para el modo en vivo
  App.jsx              # estado y composición
```

La lógica de conversión (`src/lib/`) es pura y no depende de React, para poder
crecer con nuevas features (export a PNG, brillo/contraste, video, etc.).
