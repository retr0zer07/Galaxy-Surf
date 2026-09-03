/* ==================================================================
 *  Constantes de escala
 * ================================================================== */
export const GALAXY = {
  radius: 52,            // 52 u  ≈ 52 000 años luz (radio del disco)
  coreRadius: 8,         // bulbo central
  barLength: 14,         // barra estelar
  armCount: 4,
  pitch: 0.312,          // ángulo de inclinación de la espiral logarítmica
  seedRadius: 4.6,       // radio inicial de la espiral
  diskStars: 168000,
  bulgeStars: 52000,
  haloStars: 26000,
  dustClouds: 900,
  nebulae: 130
};

/** Posición angular de la espiral logarítmica de un brazo a radio r */
export function armAngle(r, armIndex) {
  return Math.log(r / GALAXY.seedRadius) / GALAXY.pitch
       + (armIndex / GALAXY.armCount) * Math.PI * 2;
}

/** Punto (x, z) sobre el eje de un brazo */
export function armPoint(r, armIndex) {
  const a = armAngle(r, armIndex);
  return { x: Math.cos(a) * r, z: Math.sin(a) * r };
}

/* Brazos principales de la Vía Láctea (índice → identidad) */
export const ARMS = [
  { index: 0, name: 'Brazo de Perseo',           color: '#9fc9ff' },
  { index: 1, name: 'Brazo Escudo-Centauro',     color: '#bad6ff' },
  { index: 2, name: 'Brazo de Sagitario-Carina', color: '#a8ceff' },
  { index: 3, name: 'Brazo de Norma',            color: '#c2ddff' }
];

/* El Sol vive en el Brazo de Orión, un espolón entre Perseo y Sagitario,
   a ~26 000 ly del centro galáctico. */
const solR = 26.2;
const solA = armAngle(solR, 2) + 0.34;
export const SUN_POSITION = {
  x: Math.cos(solA) * solR,
  y: 0.32,
  z: Math.sin(solA) * solR
};

/* ==================================================================
 *  Puntos de interés galácticos
 *
 *  Cada destino se sitúa con sus coordenadas galácticas reales:
 *  l = longitud (0° hacia el centro), b = latitud, ly = distancia al Sol.
 * ================================================================== */

/** Convierte coordenadas galácticas heliocéntricas a la escena (1 u = 1000 ly) */
function fromSun(ly, l, b) {
  const d = ly / 1000;
  const lr = (l * Math.PI) / 180;
  const br = (b * Math.PI) / 180;

  // Base local: eX apunta al centro galáctico, eR a l = 90°
  const n = Math.hypot(SUN_POSITION.x, SUN_POSITION.z);
  const eX = -SUN_POSITION.x / n, eZ = -SUN_POSITION.z / n;
  const rX = -eZ, rZ = eX;

  const cb = Math.cos(br);
  const along = d * cb * Math.cos(lr);
  const side = d * cb * Math.sin(lr);

  return {
    x: SUN_POSITION.x + along * eX + side * rX,
    y: SUN_POSITION.y + d * Math.sin(br),
    z: SUN_POSITION.z + along * eZ + side * rZ
  };
}

export const CATEGORIES = [
  { id: 'all', name: 'Todos', color: '#5fe6ff' },
  { id: 'sistema', name: 'Sistemas', color: '#ffcf7a' },
  { id: 'nebulosa', name: 'Nebulosas', color: '#ff9bd0' },
  { id: 'cumulo', name: 'Cúmulos', color: '#9fd8ff' },
  { id: 'remanente', name: 'Remanentes', color: '#8affc8' },
  { id: 'exotico', name: 'Exóticos', color: '#ff7a9c' },
  { id: 'estructura', name: 'Estructuras', color: '#c9a6ff' }
];

const CATEGORY_COLOR = Object.fromEntries(CATEGORIES.map(c => [c.id, c.color]));

export const POIS = [
  /* ---------------- Explorables ---------------- */
  {
    id: 'solar', name: 'Sistema Solar', tag: 'SISTEMA PLANETARIO',
    category: 'sistema', ly: 0, l: 0, b: 0,
    position: SUN_POSITION, color: '#ffcf7a', explorable: true,
    sub: 'Brazo de Orión · 26 000 ly del centro galáctico',
    desc: 'Nuestro hogar: una enana amarilla de tipo G2V acompañada de ocho planetas, cinco planetas enanos reconocidos y cientos de miles de cuerpos menores. Orbita el centro galáctico a 230 km/s y completa una vuelta —un año galáctico— cada 225 millones de años.',
    facts: [
      ['Edad', '4 568 Ma'], ['Estrella', 'G2V · Sol'], ['Planetas', '8'],
      ['Diámetro', '~ 0.003 ly'], ['Velocidad orbital', '230 km/s'], ['Año galáctico', '225 Ma']
    ]
  },
  {
    id: 'sgra', name: 'Sagitario A*', tag: 'AGUJERO NEGRO SUPERMASIVO',
    category: 'exotico', ly: 26673, l: 0, b: 0,
    position: { x: 0, y: 0, z: 0 }, color: '#ff7a9c', explorable: true,
    actionLabel: 'Aproximarse al horizonte',
    sub: 'Centro galáctico · 26 673 ly del Sol',
    desc: 'El agujero negro supermasivo que ancla la rotación de toda la galaxia. Concentra 4,3 millones de masas solares en una región menor que la órbita de Mercurio. Su gravedad curva las trayectorias de la luz: lo que se ve alrededor del disco no es el disco, sino su propia imagen desviada por el espacio-tiempo.',
    facts: [
      ['Masa', '4.297×10⁶ M☉'], ['Horizonte', '12.7 M km'], ['Sombra', '~ 52 μas'],
      ['Distancia', '26 673 ly'], ['Descubierto', '1974'], ['Imagen EHT', '2022']
    ]
  },

  /* ---------------- Sistemas estelares ---------------- */
  {
    id: 'alphacen', name: 'Alfa Centauri', tag: 'SISTEMA TRIPLE',
    category: 'sistema', ly: 4.37, visualDistanceLy: 1800, l: 315.73, b: -0.68,
    explorable: true, actionLabel: 'Explorar sistema triple',
    desc: 'El sistema estelar más cercano al Sol. Dos estrellas similares al Sol orbitan entre sí cada 80 años, acompañadas a lo lejos por Próxima Centauri, una enana roja con un planeta rocoso en zona habitable.',
    facts: [['Estrellas', '3'], ['Tipo', 'G2V + K1V + M5.5Ve'], ['Exoplanetas', '2 confirmados'], ['Periodo A-B', '79.9 años'], ['Próxima b', '1.07 M⊕']]
  },
  {
    id: 'sirius', name: 'Sirio', tag: 'BINARIA CON ENANA BLANCA',
    category: 'sistema', ly: 8.6, l: 227.23, b: -8.89,
    desc: 'La estrella más brillante del cielo nocturno. Sirio A es el doble de masiva que el Sol; su compañera, Sirio B, es una enana blanca del tamaño de la Tierra con la masa del Sol: una cucharada de su materia pesaría toneladas.',
    facts: [['Magnitud', '−1.46'], ['Tipo', 'A1V + DA2'], ['Periodo', '50.1 años'], ['Sirio B', '0.0084 R☉'], ['Edad', '242 Ma']]
  },
  {
    id: 'trappist', name: 'TRAPPIST-1', tag: 'SISTEMA DE 7 PLANETAS',
    category: 'sistema', ly: 40.7, l: 69.4, b: -47.1,
    desc: 'Una enana roja ultrafría con siete planetas del tamaño de la Tierra, tres de ellos en la zona habitable. Todo el sistema cabría dentro de la órbita de Mercurio, y sus planetas están en resonancia orbital.',
    facts: [['Planetas', '7'], ['Tipo', 'M8V'], ['Radio estelar', '0.12 R☉'], ['Zona habitable', '3 planetas'], ['Descubierto', '2016']]
  },
  {
    id: 'betelgeuse', name: 'Betelgeuse', tag: 'SUPERGIGANTE ROJA',
    category: 'sistema', ly: 548, l: 199.79, b: -8.96,
    desc: 'Si ocupara el lugar del Sol, su superficie engulliría la órbita de Júpiter. Es una supergigante en fase terminal: explotará como supernova en los próximos 100 000 años y brillará como la Luna llena.',
    facts: [['Radio', '~ 764 R☉'], ['Masa', '16.5 M☉'], ['Tipo', 'M1-2 Ia-ab'], ['Temperatura', '3 600 K'], ['Supernova', '< 100 000 años']]
  },
  {
    id: 'barnard', name: 'Estrella de Barnard', tag: 'ENANA ROJA',
    category: 'sistema', ly: 5.96, l: 31.0, b: 14.1,
    desc: 'La estrella individual más cercana después del Sol y el sistema de Alfa Centauri. Se desplaza por el cielo más rápido que cualquier otra estrella conocida: recorrería el diámetro aparente de la Luna en apenas 180 años.',
    facts: [['Tipo', 'M4.0V'], ['Masa', '0.16 M☉'], ['Movimiento propio', '10.3″ / año'], ['Edad', '7-12 Ga'], ['Planeta candidato', 'Barnard b']]
  },
  {
    id: 'wolf359', name: 'Wolf 359', tag: 'ENANA ROJA',
    category: 'sistema', ly: 7.86, l: 244.0, b: 56.2,
    desc: 'Una de las estrellas más débiles y cercanas: emite solo una cienmilésima parte de la luz visible del Sol. Aun así, posee al menos dos planetas candidatos detectados por velocidad radial.',
    facts: [['Tipo', 'M6V'], ['Masa', '0.09 M☉'], ['Luminosidad', '0.0009 L☉'], ['Planetas', '2 candidatos'], ['Magnitud', '+13.5']]
  },
  {
    id: 'vega', name: 'Vega', tag: 'ESTRELLA CON DISCO DE POLVO',
    category: 'sistema', ly: 25.04, l: 67.45, b: 19.24,
    desc: 'Durante siglos fue la estrella polar y volverá a serlo en unos 12 000 años. Rota tan rápido que está achatada: su ecuador gira a 274 km/s. Un disco de polvo frío a su alrededor revela restos de formación planetaria.',
    facts: [['Tipo', 'A0V'], ['Masa', '2.14 M☉'], ['Rotación', '274 km/s'], ['Disco', 'infrarrojo'], ['Magnitud', '+0.03']]
  },
  {
    id: 'polaris', name: 'Polaris', tag: 'CEFEIDA · SISTEMA TRIPLE',
    category: 'sistema', ly: 433, l: 123.3, b: 26.5,
    desc: 'La actual estrella polar es una cefeida cuya pulsación de 3,97 días permite medir distancias cósmicas. El sistema incluye una compañera cercana y otra mucho más distante, visible con telescopio.',
    facts: [['Tipo', 'F7 Ib'], ['Estrellas', '3'], ['Pulsación', '3.97 días'], ['Masa', '5.4 M☉'], ['Magnitud', '+1.98']]
  },

  /* ---------------- Nebulosas ---------------- */
  {
    id: 'orion', name: 'Nebulosa de Orión', tag: 'REGIÓN HII',
    category: 'nebulosa', ly: 1344, l: 209.01, b: -19.38,
    explorable: true, actionLabel: 'Entrar en la nebulosa',
    desc: 'El vivero estelar más cercano y estudiado. Más de 700 estrellas jóvenes se forman dentro, muchas rodeadas de discos protoplanetarios donde ahora mismo nacen sistemas solares.',
    facts: [['Diámetro', '24 ly'], ['Edad', '~ 2 Ma'], ['Magnitud', '+4.0'], ['Masa', '2 000 M☉'], ['Trapecio', '4 estrellas O/B']]
  },
  {
    id: 'horsehead', name: 'Cabeza de Caballo', tag: 'NEBULOSA OSCURA',
    category: 'nebulosa', ly: 1375, l: 206.86, b: -16.53,
    desc: 'Una columna de polvo frío recortada contra el resplandor rojo del hidrógeno ionizado. No emite luz: se ve porque bloquea la que hay detrás. Se disgregará en unos 5 millones de años.',
    facts: [['Tamaño', '3.5 ly'], ['Catálogo', 'Barnard 33'], ['Descubierta', '1888'], ['Constelación', 'Orión']]
  },
  {
    id: 'eagle', name: 'Nebulosa del Águila', tag: 'REGIÓN HII',
    category: 'nebulosa', ly: 7000, l: 16.95, b: 0.79,
    desc: 'Hogar de los Pilares de la Creación: columnas de gas y polvo de varios años luz esculpidas por la radiación de estrellas masivas cercanas, con nuevas estrellas condensándose en sus puntas.',
    facts: [['Pilares', '4-5 ly'], ['Edad', '5.5 Ma'], ['Catálogo', 'M16'], ['Estrellas', '~ 8 100']]
  },
  {
    id: 'lagoon', name: 'Nebulosa de la Laguna', tag: 'REGIÓN HII',
    category: 'nebulosa', ly: 4100, l: 5.97, b: -1.17,
    desc: 'Una de las dos únicas nebulosas de formación estelar visibles a simple vista desde latitudes medias. Contiene glóbulos de Bok, capullos oscuros de gas en colapso gravitatorio.',
    facts: [['Tamaño', '110 × 50 ly'], ['Catálogo', 'M8'], ['Magnitud', '+6.0'], ['Descubierta', '1654']]
  },
  {
    id: 'carina', name: 'Nebulosa de Carina', tag: 'REGIÓN HII GIGANTE',
    category: 'nebulosa', ly: 8500, l: 287.6, b: -0.63,
    desc: 'Cuatro veces mayor que la de Orión y mucho más violenta. Alberga a Eta Carinae, una hipergigante de 100 masas solares que en 1843 protagonizó una falsa supernova y hoy sigue al borde del colapso.',
    facts: [['Tamaño', '~ 460 ly'], ['Eta Carinae', '~ 100 M☉'], ['Luminosidad', '5×10⁶ L☉'], ['Catálogo', 'NGC 3372']]
  },
  {
    id: 'ring', name: 'Nebulosa del Anillo', tag: 'NEBULOSA PLANETARIA',
    category: 'nebulosa', ly: 2300, l: 63.62, b: 13.0,
    desc: 'El cadáver de una estrella parecida al Sol: sus capas exteriores expulsadas forman un anillo en expansión iluminado por la enana blanca central. Así terminará el Sol dentro de 5 000 millones de años.',
    facts: [['Diámetro', '2.6 ly'], ['Catálogo', 'M57'], ['Expansión', '20-30 km/s'], ['Edad', '~ 7 000 años']]
  },
  {
    id: 'helix', name: 'Nebulosa Hélice', tag: 'NEBULOSA PLANETARIA',
    category: 'nebulosa', ly: 655, l: 36.16, b: -57.12,
    desc: 'Apodada "el Ojo de Dios". La nebulosa planetaria más cercana, vista casi de frente: miles de nudos cometarios del tamaño del Sistema Solar apuntan hacia la enana blanca central.',
    facts: [['Diámetro', '2.9 ly'], ['Catálogo', 'NGC 7293'], ['Nudos', '~ 40 000'], ['Edad', '10 600 años']]
  },

  /* ---------------- Cúmulos ---------------- */
  {
    id: 'pleiades', name: 'Las Pléyades', tag: 'CÚMULO ABIERTO',
    category: 'cumulo', ly: 444, l: 166.57, b: -23.52,
    desc: 'Estrellas azules calientes formadas hace apenas 100 millones de años, atravesando ahora una nube de polvo que refleja su luz. Visibles a simple vista desde la prehistoria y presentes en casi todas las culturas.',
    facts: [['Estrellas', '~ 1 000'], ['Edad', '100 Ma'], ['Diámetro', '43 ly'], ['Catálogo', 'M45'], ['Magnitud', '+1.6']]
  },
  {
    id: 'hyades', name: 'Las Híades', tag: 'CÚMULO ABIERTO',
    category: 'cumulo', ly: 153, l: 180.0, b: -22.3,
    desc: 'El cúmulo abierto más cercano al Sol. Sus estrellas comparten un mismo movimiento por el espacio, prueba de que nacieron juntas de la misma nube hace 625 millones de años.',
    facts: [['Estrellas', '~ 300'], ['Edad', '625 Ma'], ['Diámetro', '~ 60 ly'], ['Constelación', 'Tauro']]
  },
  {
    id: 'beehive', name: 'El Pesebre', tag: 'CÚMULO ABIERTO',
    category: 'cumulo', ly: 577, l: 205.92, b: 32.48,
    desc: 'Conocido desde la Antigüedad como una nube difusa, Galileo fue el primero en resolverlo en estrellas con su telescopio en 1609. Alberga varios exoplanetas confirmados.',
    facts: [['Estrellas', '~ 1 000'], ['Edad', '600 Ma'], ['Catálogo', 'M44'], ['Exoplanetas', '2 confirmados']]
  },
  {
    id: 'perseus2', name: 'Cúmulo Doble', tag: 'CÚMULO ABIERTO DOBLE',
    category: 'cumulo', ly: 7500, l: 135.0, b: -3.8,
    desc: 'Dos cúmulos jóvenes y masivos separados por apenas cientos de años luz, ambos en el Brazo de Perseo. Contienen decenas de supergigantes rojas y azules destinadas a explotar como supernovas.',
    facts: [['Catálogo', 'NGC 869 / 884'], ['Edad', '12.8 Ma'], ['Estrellas', '> 600'], ['Supergigantes', '~ 5']]
  },
  {
    id: 'm13', name: 'Cúmulo de Hércules', tag: 'CÚMULO GLOBULAR',
    category: 'cumulo', ly: 22200, l: 59.01, b: 40.91,
    desc: 'Una esfera de varios cientos de miles de estrellas antiguas orbitando el halo galáctico. En 1974 se le envió el mensaje de Arecibo, la primera transmisión deliberada de la humanidad hacia otro sistema.',
    facts: [['Estrellas', '~ 300 000'], ['Edad', '11 650 Ma'], ['Diámetro', '145 ly'], ['Catálogo', 'M13']]
  },
  {
    id: 'omega', name: 'Omega Centauri', tag: 'CÚMULO GLOBULAR',
    category: 'cumulo', ly: 15800, l: 309.1, b: 14.97,
    desc: 'El cúmulo globular más brillante y masivo de la galaxia. Sus estrellas tienen edades y composiciones distintas, lo que sugiere que es el núcleo superviviente de una galaxia enana devorada por la Vía Láctea.',
    facts: [['Estrellas', '10 millones'], ['Edad', '11 500 Ma'], ['Diámetro', '150 ly'], ['Masa', '4×10⁶ M☉']]
  },

  /* ---------------- Remanentes ---------------- */
  {
    id: 'crab', name: 'Nebulosa del Cangrejo', tag: 'RESTO DE SUPERNOVA',
    category: 'remanente', ly: 6500, l: 184.56, b: -5.78,
    desc: 'Los restos en expansión de la supernova que astrónomos chinos vieron brillar de día durante 23 jornadas en el año 1054. En su centro, un púlsar del tamaño de una ciudad gira 30 veces por segundo.',
    facts: [['Supernova', 'año 1054'], ['Expansión', '1 500 km/s'], ['Púlsar', '30.2 Hz'], ['Diámetro', '11 ly'], ['Catálogo', 'M1']]
  },
  {
    id: 'vela', name: 'Púlsar de Vela', tag: 'RESTO DE SUPERNOVA',
    category: 'remanente', ly: 815, l: 263.55, b: -2.79,
    desc: 'El resto de supernova más cercano y brillante en rayos gamma. Su púlsar dispara un chorro de partículas a la mitad de la velocidad de la luz y sufre "glitches": reajustes bruscos de su rotación.',
    facts: [['Supernova', 'hace 11 000 años'], ['Púlsar', '11.2 Hz'], ['Diámetro', '~ 100 ly'], ['Chorro', '0.5 c']]
  },
  {
    id: 'casa', name: 'Casiopea A', tag: 'RESTO DE SUPERNOVA',
    category: 'remanente', ly: 11000, l: 111.73, b: -2.13,
    desc: 'La fuente de radio más brillante del cielo fuera del Sistema Solar. Su luz llegó a la Tierra hacia 1690 casi sin ser vista, oculta tras el polvo interestelar. Sigue expandiéndose a 6 000 km/s.',
    facts: [['Supernova', '~ 1690'], ['Expansión', '6 000 km/s'], ['Diámetro', '10 ly'], ['Remanente', 'estrella de neutrones']]
  },
  {
    id: 'sn1987a', name: 'SN 1987A', tag: 'SUPERNOVA OBSERVADA',
    category: 'remanente', ly: 168000, l: 279.7, b: -31.9,
    desc: 'La supernova más cercana observada desde 1604. Explosión de una supergigante azul en la Gran Nube de Magallanes; sus neutrinos llegaron a la Tierra tres horas antes que la luz y confirmaron cómo colapsan los núcleos estelares.',
    facts: [['Explosión', '23 feb 1987'], ['Galaxia', 'Gran Nube de Magallanes'], ['Progenitora', 'Sanduleak −69° 202'], ['Neutrinos', '24 detectados'], ['Anillo', 'iluminándose']]
  },

  /* ---------------- Exóticos ---------------- */
  {
    id: 'cygx1', name: 'Cygnus X-1', tag: 'AGUJERO NEGRO ESTELAR',
    category: 'exotico', ly: 7200, l: 71.33, b: 3.07,
    desc: 'El primer objeto reconocido como agujero negro. Devora material de una supergigante azul compañera, formando un disco de acreción a millones de grados que lo delata en rayos X. Objeto de una famosa apuesta entre Hawking y Thorne.',
    facts: [['Masa', '21.2 M☉'], ['Compañera', 'O9.7 Iab'], ['Periodo', '5.6 días'], ['Descubierto', '1964'], ['Rotación', '> 95 % del límite']]
  },
  {
    id: 'magnetar', name: 'SGR 1806-20', tag: 'MAGNETAR',
    category: 'exotico', ly: 42000, l: 10.0, b: -0.24,
    desc: 'La estrella de neutrones con el campo magnético más intenso conocido: mil billones de veces el terrestre. En 2004 emitió un destello que en 0,2 segundos liberó más energía que el Sol en 150 000 años y alteró la ionosfera terrestre.',
    facts: [['Campo magnético', '2×10¹¹ T'], ['Rotación', '7.5 s'], ['Destello', '27 dic 2004'], ['Diámetro', '~ 20 km']]
  },
  {
    id: 'm87star', name: 'M87*', tag: 'AGUJERO NEGRO SUPERMASIVO',
    category: 'exotico', ly: 53500000, l: 283.8, b: 74.5,
    desc: 'El primer agujero negro fotografiado por la humanidad. Tiene una masa de 6 500 millones de soles y lanza un chorro relativista de partículas que se extiende miles de años luz desde la galaxia elíptica M87.',
    facts: [['Masa', '6.5×10⁹ M☉'], ['Distancia', '53.5 Mly'], ['Imagen EHT', '2019'], ['Chorro', '~ 5 000 ly'], ['Galaxia', 'M87']]
  },
  {
    id: 'westerlund1', name: 'Westerlund 1', tag: 'SUPERCÚMULO ESTELAR',
    category: 'exotico', ly: 13000, l: 339.55, b: -0.4,
    desc: 'El cúmulo estelar joven más masivo de la Vía Láctea. En un volumen de apenas seis años luz reúne cientos de estrellas masivas, varias de ellas supergigantes amarillas, rojas y azules que terminarán como supernovas.',
    facts: [['Masa', '~ 50 000 M☉'], ['Edad', '3.5-5 Ma'], ['Diámetro', '~ 6 ly'], ['Estrellas masivas', '> 100'], ['Tipo', 'supercúmulo']]
  },

  /* ---------------- Estructuras ---------------- */
  {
    id: 'orionarm', name: 'Brazo de Orión', tag: 'ESPOLÓN GALÁCTICO',
    category: 'estructura', ly: 1500, l: 80.0, b: 0,
    desc: 'El espolón menor donde vive el Sol, encajado entre los brazos de Perseo y Sagitario. Mide unos 3 500 años luz de ancho y 20 000 de largo: una estructura secundaria que durante décadas se creyó insignificante.',
    facts: [['Anchura', '3 500 ly'], ['Longitud', '20 000 ly'], ['Tipo', 'espolón'], ['Contiene', 'el Sistema Solar']]
  },
  {
    id: 'localbubble', name: 'Burbuja Local', tag: 'CAVIDAD INTERESTELAR',
    category: 'estructura', ly: 300, l: 250.0, b: 20.0,
    desc: 'Una cavidad de 1 000 años luz de gas enrarecido y caliente en la que el Sistema Solar lleva viajando millones de años. La excavaron entre 10 y 20 supernovas; en su superficie se están formando ahora nuevas estrellas.',
    facts: [['Diámetro', '~ 1 000 ly'], ['Densidad', '0.05 át/cm³'], ['Temperatura', '10⁶ K'], ['Origen', '10-20 supernovas']]
  },
  {
    id: 'taurus', name: 'Nube de Tauro', tag: 'NUBE MOLECULAR',
    category: 'estructura', ly: 430, l: 172.5, b: -15.5,
    desc: 'La región de formación estelar masiva más cercana. Un laboratorio natural donde se estudian las primeras fases de las estrellas de tipo solar: filamentos oscuros y fríos donde el gas colapsa en protoestrellas.',
    facts: [['Masa', '~ 30 000 M☉'], ['Temperatura', '10 K'], ['Protoestrellas', '> 400'], ['Extensión', '~ 100 ly']]
  },
  {
    id: 'fermi', name: 'Burbujas de Fermi', tag: 'ESTRUCTURA GAMMA',
    category: 'estructura', position: { x: 0, y: 12, z: 0 }, ly: 26673, l: 0, b: 90,
    desc: 'Dos lóbulos gigantes de gas caliente que emergen del centro galáctico y se extienden 25 000 años luz por encima y por debajo del disco. Son la cicatriz de una erupción de Sagitario A* hace unos 6 millones de años.',
    facts: [['Altura', '25 000 ly'], ['Energía', '10⁵⁵ erg'], ['Edad', '~ 6 Ma'], ['Descubiertas', '2010']]
  },
  {
    id: 'lmc', name: 'Gran Nube de Magallanes', tag: 'GALAXIA SATÉLITE',
    category: 'estructura', ly: 163000, l: 280.47, b: -32.89,
    desc: 'Una galaxia enana irregular en órbita alrededor de la Vía Láctea, deformada por su marea gravitatoria. Alberga la Nebulosa de la Tarántula, la región de formación estelar más activa del Grupo Local.',
    facts: [['Diámetro', '32 000 ly'], ['Masa', '10¹⁰ M☉'], ['Estrellas', '~ 30 000 M'], ['SN 1987A', 'observada en 1987']]
  }
];

/* Completa posición, color, forma y subtítulo a partir de las coordenadas galácticas */
const DEFAULT_SIZE = {
  sistema: 0.30, nebulosa: 0.95, cumulo: 0.75,
  remanente: 0.85, exotico: 0.45, estructura: 1.7
};

/* Representación visual de cada destino en la vista galáctica */
const SHAPES = {
  alphacen: { shape: 'multi', size: 0.26, stars: ['#fff4e0', '#ffd9a0', '#ff8a6a'] },
  barnard: { shape: 'multi', size: 0.23, stars: ['#ff7650'] },
  wolf359: { shape: 'multi', size: 0.2, stars: ['#e94f35'] },
  sirius: { shape: 'multi', size: 0.24, stars: ['#dbe6ff', '#ffffff'] },
  trappist: { shape: 'multi', size: 0.18, stars: ['#ff7a52'] },
  betelgeuse: { shape: 'supergiant', size: 0.42, stars: ['#ff6a3a'] },
  vega: { shape: 'multi', size: 0.28, stars: ['#dce8ff'] },
  polaris: { shape: 'multi', size: 0.28, stars: ['#fff1cc', '#dce8ff'] },

  orion: { shape: 'nebula', size: 1.0, tint: ['#ff6fae', '#ff9ad4', '#6fa8ff'] },
  horsehead: { shape: 'dark', size: 0.7, tint: ['#c8434f', '#7a2230'] },
  eagle: { shape: 'nebula', size: 1.1, tint: ['#b98cff', '#6fd0ff', '#ffa8e0'] },
  lagoon: { shape: 'nebula', size: 1.0, tint: ['#ff7a7a', '#ffb0c8', '#8ab6ff'] },
  carina: { shape: 'nebula', size: 1.6, tint: ['#ff9a5a', '#ff6f9a', '#8ac6ff'] },
  ring: { shape: 'planetary', size: 0.55, tint: ['#7affd0', '#ff8ab0'] },
  helix: { shape: 'planetary', size: 0.6, tint: ['#6fd8ff', '#ff9a7a'] },

  pleiades: { shape: 'open', size: 0.8, tint: ['#a8ccff'], veil: '#5f9dff' },
  hyades: { shape: 'open', size: 0.85, tint: ['#ffd9a0'] },
  beehive: { shape: 'open', size: 0.75, tint: ['#e8f0ff'] },
  perseus2: { shape: 'double', size: 0.9, tint: ['#bcd8ff', '#ffd0a0'] },
  m13: { shape: 'globular', size: 1.05, tint: ['#ffd9a0'] },
  omega: { shape: 'globular', size: 1.2, tint: ['#ffe6b8'] },

  crab: { shape: 'snr', size: 0.9, tint: ['#8affc8', '#6fb0ff'], pulsar: true },
  vela: { shape: 'snr', size: 1.0, tint: ['#7affd8', '#a8f0ff'], pulsar: true },
  casa: { shape: 'snr', size: 0.85, tint: ['#ffb06f', '#8affc8'] },
  sn1987a: { shape: 'snr', size: 0.92, tint: ['#8ac6ff', '#ffb0d0'], pulsar: true },

  cygx1: { shape: 'blackhole', size: 0.5, tint: ['#ff9a4a', '#dbe6ff'] },
  magnetar: { shape: 'magnetar', size: 0.35, tint: ['#ff7a9c'] },
  m87star: { shape: 'blackhole', size: 0.7, tint: ['#ffb05a', '#dbe6ff'] },
  westerlund1: { shape: 'globular', size: 1.05, tint: ['#c5dcff'] },

  orionarm: { shape: 'arm', size: 3.2, tint: ['#9fc9ff'] },
  localbubble: { shape: 'bubble', size: 2.2, tint: ['#6fd0ff'] },
  taurus: { shape: 'cloud', size: 1.5, tint: ['#6a4a3a', '#3a2a26'] },
  fermi: { shape: 'lobes', size: 7.0, tint: ['#c9a6ff', '#8f6fff'] },
  lmc: { shape: 'galaxy', size: 4.5, tint: ['#cfe0ff', '#ffb0d0'] }
};

for (const p of POIS) {
  if (!p.position) p.position = fromSun(p.visualDistanceLy || p.ly, p.l, p.b);
  if (!p.color) p.color = CATEGORY_COLOR[p.category];
  if (!p.sub) {
    const label = p.tag.charAt(0) + p.tag.slice(1).toLowerCase();
    p.sub = `${label} · ${p.ly.toLocaleString('es-ES')} ly del Sol`;
  }
  Object.assign(p, SHAPES[p.id] || {});
  if (!p.size) p.size = DEFAULT_SIZE[p.category] || 0.8;
  p.size *= 0.6;
  if (!p.tint) p.tint = [p.color];
}

/**
 * Los tamaños visuales están exagerados varios órdenes de magnitud, así que
 * objetos vecinos se solaparían. Se separan lo justo para poder visitarlos,
 * conservando la dirección real en la que se encuentran.
 */
(function relaxPositions(iterations = 90) {
  const movable = POIS.filter(p => !p.explorable && p.category !== 'estructura');
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < movable.length; i++) {
      for (let j = i + 1; j < movable.length; j++) {
        const a = movable[i].position, b = movable[j].position;
        const min = (movable[i].size + movable[j].size) * 1.6;
        let dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        let d = Math.hypot(dx, dy, dz);
        if (d >= min) continue;
        if (d < 1e-5) { dx = 1; dy = 0; dz = 0; d = 1; }
        const push = ((min - d) / d) * 0.5;
        a.x -= dx * push; a.y -= dy * push; a.z -= dz * push;
        b.x += dx * push; b.y += dy * push; b.z += dz * push;
      }
    }
  }
})();

/* ==================================================================
 *  Galaxias de fondo
 *  Decorativas: no aparecen en el navegador ni se pueden seleccionar.
 * ================================================================== */
export const BACKGROUND_GALAXIES = [
  { id: 'm31', name: 'Andrómeda · M31', ly: 2540000, l: 121.17, b: -21.57, size: 250, color: '#b9d2ff', type: 'espiral' },
  { id: 'm33', name: 'Triángulo · M33', ly: 2730000, l: 133.61, b: -31.33, size: 142, color: '#9cc7ff', type: 'espiral' },
  { id: 'smc', name: 'Pequeña Nube de Magallanes', ly: 200000, l: 302.80, b: -44.33, size: 42, color: '#b4d8ff', type: 'irregular' },
  { id: 'sgrd', name: 'Enana de Sagitario', ly: 70000, l: 5.57, b: -14.17, size: 20, color: '#d6c8b0', type: 'esferoidal' },
  { id: 'fornax', name: 'Enana de Fornax', ly: 490000, l: 237.10, b: -65.65, size: 28, color: '#e8d9bb', type: 'esferoidal' },
  { id: 'sculptor', name: 'Enana del Escultor', ly: 290000, l: 287.54, b: -83.16, size: 22, color: '#d8e2ff', type: 'esferoidal' },
  { id: 'draco', name: 'Enana de Draco', ly: 260000, l: 86.37, b: 34.72, size: 20, color: '#c9d5ff', type: 'esferoidal' },
  { id: 'ursa-minor', name: 'Enana de Osa Menor', ly: 225000, l: 104.97, b: 44.80, size: 18, color: '#e0d9c8', type: 'esferoidal' },
  { id: 'ngc6822', name: 'Galaxia de Barnard · NGC 6822', ly: 1630000, l: 25.34, b: -18.39, size: 58, color: '#89b7ff', type: 'irregular' },
  { id: 'ic1613', name: 'IC 1613', ly: 2400000, l: 129.74, b: -60.56, size: 48, color: '#b6d7ff', type: 'irregular' }
].map(galaxy => ({ ...galaxy, position: fromSun(galaxy.ly, galaxy.l, galaxy.b) }));

/* ==================================================================
 *  Sistema Solar
 *  visualR / visualD son unidades de escena (escala comprimida)
 * ================================================================== */
const rScale = km => Math.max(0.34, Math.pow(km / 6371, 0.42) * 1.62);
const dScale = au => 14 + Math.pow(au, 0.62) * 26;

export const SUN = {
  id: 'sun',
  name: 'Sol',
  tag: 'ESTRELLA · G2V',
  visualR: 6,
  color: '#ffb24d',
  desc: 'Una enana amarilla que concentra el 99,86 % de la masa del sistema. En su núcleo, 600 millones de toneladas de hidrógeno se fusionan en helio cada segundo a 15 millones de grados.',
  facts: [
    ['Radio', '696 340 km'],
    ['Masa', '1.989×10³⁰ kg'],
    ['Superficie', '5 500 °C'],
    ['Núcleo', '15 000 000 °C'],
    ['Edad', '4 600 Ma'],
    ['Tipo', 'G2V']
  ]
};

export const PLANETS = [
  {
    id: 'mercury', name: 'Mercurio', tag: 'PLANETA ROCOSO',
    radiusKm: 2439, au: 0.387, periodDays: 87.97, rotationDays: 58.6,
    tilt: 0.03, ecc: 0.206, inc: 7.0,
    style: 'rocky', craters: 260, palette: ['#4a423c', '#7d7168', '#a9998c', '#c4b6a6'],
    color: '#9c8e80',
    desc: 'El planeta más pequeño y veloz. Sin atmósfera que amortigüe, su superficie oscila entre 430 °C de día y −180 °C de noche, y conserva cicatrices de impactos de hace 4 000 millones de años.',
    facts: [['Diámetro', '4 879 km'], ['Día solar', '176 días'], ['Año', '88 días'], ['Temp.', '−180 / 430 °C'], ['Gravedad', '3.7 m/s²'], ['Lunas', '0']],
    moons: []
  },
  {
    id: 'venus', name: 'Venus', tag: 'PLANETA ROCOSO',
    radiusKm: 6051, au: 0.723, periodDays: 224.7, rotationDays: -243,
    tilt: 177.4, ecc: 0.007, inc: 3.39,
    style: 'gas', bands: 7, palette: ['#8a6134', '#c9995a', '#e8c48d', '#fbe6bd'],
    color: '#e8c48d',
    desc: 'Envuelto en una atmósfera de CO₂ 90 veces más densa que la terrestre y nubes de ácido sulfúrico. El efecto invernadero desbocado lo mantiene a 464 °C: el mundo más caliente del sistema.',
    facts: [['Diámetro', '12 104 km'], ['Día solar', '117 días'], ['Año', '225 días'], ['Temp.', '464 °C'], ['Presión', '92 atm'], ['Lunas', '0']],
    moons: []
  },
  {
    id: 'earth', name: 'Tierra', tag: 'PLANETA ROCOSO · HABITADO',
    radiusKm: 6371, au: 1.0, periodDays: 365.26, rotationDays: 0.997,
    tilt: 23.44, ecc: 0.017, inc: 0,
    style: 'earth', polar: 0.16, clouds: true, atmosphere: '#5aa8ff',
    palette: ['#08234a', '#0d3f7a', '#1a6b8f', '#2f7d4a', '#6d8f45', '#b9a37a'],
    color: '#3d8fd6',
    desc: 'El único mundo conocido con agua líquida estable en superficie, tectónica de placas activa y biosfera. Su campo magnético desvía el viento solar y su Luna estabiliza la inclinación axial.',
    facts: [['Diámetro', '12 742 km'], ['Día', '23h 56m'], ['Año', '365.26 días'], ['Temp. media', '15 °C'], ['Atmósfera', 'N₂ 78 % · O₂ 21 %'], ['Lunas', '1']],
    moons: [
      { name: 'Luna', radiusKm: 1737, dist: 3.1, periodDays: 27.3, color: '#b8b4ac', craters: 200, note: '384 400 km' }
    ]
  },
  {
    id: 'mars', name: 'Marte', tag: 'PLANETA ROCOSO',
    radiusKm: 3389, au: 1.524, periodDays: 686.98, rotationDays: 1.026,
    tilt: 25.19, ecc: 0.093, inc: 1.85,
    style: 'rocky', craters: 150, polar: 0.12,
    palette: ['#5c2316', '#8f4526', '#c46b3d', '#e0996b'],
    color: '#c1502e',
    desc: 'El planeta rojo debe su color al óxido de hierro. Alberga el Monte Olimpo —el mayor volcán del sistema, de 22 km— y el Valles Marineris, un cañón de 4 000 km. Bajo sus polos hay agua helada.',
    facts: [['Diámetro', '6 779 km'], ['Día', '24h 37m'], ['Año', '687 días'], ['Temp.', '−63 °C'], ['Gravedad', '3.7 m/s²'], ['Lunas', '2']],
    moons: [
      { name: 'Fobos', radiusKm: 11, dist: 2.2, periodDays: 0.32, color: '#8a7f72', craters: 90, note: '9 376 km' },
      { name: 'Deimos', radiusKm: 6, dist: 3.2, periodDays: 1.26, color: '#9a8f80', craters: 60, note: '23 463 km' }
    ]
  },
  {
    id: 'jupiter', name: 'Júpiter', tag: 'GIGANTE GASEOSO',
    radiusKm: 69911, au: 5.203, periodDays: 4332.6, rotationDays: 0.414,
    tilt: 3.13, ecc: 0.048, inc: 1.3,
    style: 'gas', bands: 16,
    palette: ['#6b452c', '#9c6b3f', '#c99a63', '#e6cfa8', '#f4e6cd'],
    storm: { x: 0.32, y: 0.62, rx: 0.075, ry: 0.038, color: 'rgba(190,80,50,0.85)' },
    color: '#c99a63',
    desc: 'Más masivo que todos los demás planetas juntos. Sus bandas son corrientes en chorro a 600 km/h y la Gran Mancha Roja es un anticiclón que lleva al menos 190 años activo. Actúa como escudo gravitatorio del sistema interior.',
    facts: [['Diámetro', '139 820 km'], ['Día', '9h 56m'], ['Año', '11.86 años'], ['Temp.', '−145 °C'], ['Masa', '318 Tierras'], ['Lunas', '95']],
    moons: [
      { name: 'Ío', radiusKm: 1821, dist: 2.4, periodDays: 1.77, color: '#e8d26a', note: 'Volcánica' },
      { name: 'Europa', radiusKm: 1560, dist: 3.1, periodDays: 3.55, color: '#d8cbb4', note: 'Océano bajo hielo' },
      { name: 'Ganímedes', radiusKm: 2634, dist: 4.0, periodDays: 7.15, color: '#a89b8c', craters: 120, note: 'La mayor luna' },
      { name: 'Calisto', radiusKm: 2410, dist: 5.1, periodDays: 16.69, color: '#7a7066', craters: 180, note: 'Muy craterizada' }
    ]
  },
  {
    id: 'saturn', name: 'Saturno', tag: 'GIGANTE GASEOSO',
    radiusKm: 58232, au: 9.537, periodDays: 10759, rotationDays: 0.444,
    tilt: 26.73, ecc: 0.054, inc: 2.49,
    style: 'gas', bands: 11,
    palette: ['#8a6a3c', '#b99a63', '#dcc593', '#f2e3c0'],
    rings: { inner: 1.35, outer: 2.42 },
    color: '#dcc593',
    desc: 'Su densidad media es menor que la del agua. El sistema de anillos se extiende 280 000 km pero apenas tiene decenas de metros de espesor: miles de millones de fragmentos de hielo en órbita.',
    facts: [['Diámetro', '116 460 km'], ['Día', '10h 33m'], ['Año', '29.5 años'], ['Temp.', '−178 °C'], ['Anillos', '280 000 km'], ['Lunas', '146']],
    moons: [
      { name: 'Titán', radiusKm: 2574, dist: 3.6, periodDays: 15.95, color: '#d9a955', note: 'Atmósfera densa' },
      { name: 'Encélado', radiusKm: 252, dist: 2.9, periodDays: 1.37, color: '#f0f4f7', note: 'Géiseres de agua' },
      { name: 'Rea', radiusKm: 763, dist: 4.5, periodDays: 4.52, color: '#c3bdb4', craters: 100, note: 'Hielo y roca' }
    ]
  },
  {
    id: 'uranus', name: 'Urano', tag: 'GIGANTE HELADO',
    radiusKm: 25362, au: 19.19, periodDays: 30687, rotationDays: -0.718,
    tilt: 97.77, ecc: 0.047, inc: 0.77,
    style: 'ice', bands: 5,
    palette: ['#3f8f9c', '#68b8bd', '#a6dee0', '#d9f2f2'],
    rings: { inner: 1.6, outer: 2.0, faint: true },
    color: '#8fd6dc',
    desc: 'Rueda de lado: su eje está inclinado 98°, probablemente por una colisión titánica. El metano atmosférico absorbe el rojo y le da su tono cian. Sus estaciones duran 21 años terrestres.',
    facts: [['Diámetro', '50 724 km'], ['Día', '17h 14m'], ['Año', '84 años'], ['Temp.', '−224 °C'], ['Inclinación', '97.8°'], ['Lunas', '28']],
    moons: [
      { name: 'Titania', radiusKm: 788, dist: 3.0, periodDays: 8.7, color: '#a89e94', craters: 80, note: 'Cañones profundos' },
      { name: 'Miranda', radiusKm: 235, dist: 2.2, periodDays: 1.41, color: '#bdb6ac', craters: 60, note: 'Relieve caótico' }
    ]
  },
  {
    id: 'neptune', name: 'Neptuno', tag: 'GIGANTE HELADO',
    radiusKm: 24622, au: 30.07, periodDays: 60190, rotationDays: 0.671,
    tilt: 28.32, ecc: 0.009, inc: 1.77,
    style: 'ice', bands: 6,
    palette: ['#17357f', '#2a56b8', '#4f83dd', '#9dc2f0'],
    storm: { x: 0.6, y: 0.6, rx: 0.06, ry: 0.033, color: 'rgba(12,26,70,0.85)' },
    color: '#3f6fd8',
    desc: 'El mundo más ventoso conocido: sus tormentas superan los 2 100 km/h. Fue el primer planeta descubierto por cálculo matemático antes que por observación, en 1846.',
    facts: [['Diámetro', '49 244 km'], ['Día', '16h 6m'], ['Año', '165 años'], ['Temp.', '−214 °C'], ['Vientos', '2 100 km/h'], ['Lunas', '16']],
    moons: [
      { name: 'Tritón', radiusKm: 1353, dist: 3.2, periodDays: -5.88, color: '#cbc3bb', note: 'Órbita retrógrada' }
    ]
  }
];

/* Cinturones */
export const ASTEROID_BELT = { inner: dScale(2.1), outer: dScale(3.4), count: 3800 };
export const KUIPER_BELT = { inner: dScale(31), outer: dScale(49), count: 4200 };

/* Aplica la escala visual a todo el catálogo */
export function buildVisualScale() {
  for (const p of PLANETS) {
    p.visualR = rScale(p.radiusKm);
    p.visualD = dScale(p.au);
    for (const m of p.moons) {
      m.visualR = Math.max(0.12, Math.pow(m.radiusKm / 6371, 0.4) * 0.9);
      m.visualD = p.visualR * m.dist + m.visualR * 1.5;
    }
  }
}
buildVisualScale();
