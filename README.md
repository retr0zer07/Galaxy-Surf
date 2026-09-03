# Galaxy-Surf

Explorador interactivo de la Vía Láctea en **HTML + CSS + JavaScript vanilla** (sin build, sin npm). Three.js se carga por CDN mediante `importmap`.

## Ejecutar

Doble clic en `index.html`. Nada más.

El JavaScript va empaquetado dentro del propio HTML, así que funciona con `file://` sin servidor. Solo necesita conexión a internet la primera vez para descargar Three.js del CDN.

## Desarrollar

Las fuentes viven en `js/`. Tras editarlas hay que regenerar el HTML:

```powershell
node build.mjs
```

Si prefieres trabajar con los módulos sin empaquetar, sirve la carpeta y abre `http://localhost:8123`:

```powershell
python -m http.server 8123
```

## Qué incluye

**Vista galáctica** — 246 000 estrellas procedurales distribuidas en:
- 4 brazos espirales logarítmicos (Perseo, Escudo-Centauro, Sagitario-Carina, Norma)
- bulbo esferoidal + barra central inclinada
- halo con cúmulos globulares
- carriles de polvo con absorción real y nebulosas de emisión
- color estelar según población: azules en los brazos, rojizas en el núcleo

**Puntos de interés** — 7 marcadores navegables, dos de ellos explorables: el **Sistema Solar** y **Sagitario A***. El resto muestra ficha informativa.

**Vista del Sistema Solar**
- Sol con textura de granulación y corona
- 8 planetas con texturas procedurales, inclinación axial, rotación propia y órbitas keplerianas (excentricidad e inclinación reales)
- 15 satélites principales, anillos de Saturno y Urano, atmósfera terrestre
- cinturón de asteroides y cinturón de Kuiper
- fichas con datos físicos de cada cuerpo

**Vista de Sagitario A*** — trazado de geodésicas en tiempo real sobre una métrica de Schwarzschild (`js/blackhole.js`):
- lente gravitacional real: el disco se ve doblado por encima y por debajo del horizonte
- anillo de fotones y sombra del agujero negro
- disco de acreción turbulento con rotación kepleriana diferencial
- beaming Doppler relativista y corrimiento al rojo gravitacional
- campo estelar procedural que se distorsiona al pasar cerca del horizonte

## Controles

| Acción | Control |
|---|---|
| Orbitar | Arrastrar |
| Zoom | Rueda |
| Seleccionar | Clic en marcador, planeta o etiqueta |
| Volver | Botón *Volver a la galaxia* o `Esc` |
| Etiquetas | Botón *ETIQUETAS* o `L` |
| Velocidad temporal | Deslizador (días por segundo) |

## Estructura

```
index.html    incluye el bundle generado por build.mjs
build.mjs     empaqueta js/ dentro de index.html
css/style.css
js/
  main.js       escenas, cámara, transiciones, interacción
  galaxy.js     generación procedural de la galaxia
  solar.js      sistema solar
  blackhole.js  Sagitario A* por ray marching de geodésicas
  data.js       catálogo astronómico y escalas
  utils.js      ruido, PRNG y texturas de canvas
  ui.js         HUD, panel y etiquetas 2D
```

## Añadir un nuevo destino explorable

1. Añadir el POI en `js/data.js` con `explorable: true`.
2. Crear su escena siguiendo el patrón de `js/solar.js` o `js/blackhole.js`.
3. Registrar la entrada en `DESTINATIONS` de `js/main.js`.
4. Ejecutar `node build.mjs`.