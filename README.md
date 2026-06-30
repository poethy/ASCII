# Conversor de Imágenes a ASCII

App web para convertir imágenes en arte ASCII. Hecha con **Vite + React**.

## Features

- Subida de imagen por botón o arrastrar/soltar.
- Slider de ancho/resolución (20–240 caracteres).
- Varios sets de caracteres (`detallada`, `estandar`, `simple`, `bloques`) + opción de invertir.
- Modo color: cada carácter toma el color del píxel original.
- Copiar al portapapeles y descargar como `.txt`.

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
    asciiConverter.js  # lógica pura imagen -> celdas ASCII
  components/
    ImageUploader.jsx  # input + drag & drop
    Controls.jsx       # ancho, charset, invertir, color
    AsciiOutput.jsx    # render (texto/color) + copiar/descargar
  App.jsx              # estado y composición
```

La lógica de conversión (`src/lib/`) es pura y no depende de React, para poder
crecer con nuevas features (export a PNG, brillo/contraste, video, etc.).
