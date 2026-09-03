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
 *  Solo "solar" es explorable por ahora.
 * ================================================================== */
function onArm(r, arm, offset = 0, y = 0) {
  const a = armAngle(r, arm) + offset;
  return { x: Math.cos(a) * r, y, z: Math.sin(a) * r };
}

export const POIS = [
  {
    id: 'solar',
    name: 'Sistema Solar',
    tag: 'SISTEMA PLANETARIO',
    sub: 'Brazo de Orión · 26 000 ly del centro galáctico',
    position: SUN_POSITION,
    color: '#ffcf7a',
    explorable: true,
    desc: 'Nuestro hogar: una enana amarilla de tipo G2V acompañada de ocho planetas, cinco planetas enanos reconocidos y cientos de miles de cuerpos menores. Orbita el centro galáctico a 230 km/s y completa una vuelta —un año galáctico— cada 225 millones de años.',
    facts: [
      ['Edad', '4 568 Ma'],
      ['Estrella', 'G2V · Sol'],
      ['Planetas', '8'],
      ['Diámetro', '~ 0.003 ly'],
      ['Velocidad orbital', '230 km/s'],
      ['Año galáctico', '225 Ma']
    ]
  },
  {
    id: 'sgra',
    name: 'Sagitario A*',
    tag: 'AGUJERO NEGRO SUPERMASIVO',
    sub: 'Centro galáctico · 26 000 ly del Sol',
    position: { x: 0, y: 0, z: 0 },
    color: '#ff7a9c',
    explorable: true,
    actionLabel: 'Aproximarse al horizonte',
    desc: 'El agujero negro supermasivo que ancla la rotación de toda la galaxia. Concentra 4,3 millones de masas solares en una región menor que la órbita de Mercurio. Su gravedad curva las trayectorias de la luz: lo que se ve alrededor del disco no es el disco, sino su propia imagen desviada por el espacio-tiempo.',
    facts: [
      ['Masa', '4.297×10⁶ M☉'],
      ['Horizonte', '12.7 M km'],
      ['Sombra', '~ 52 μas'],
      ['Distancia', '26 673 ly'],
      ['Descubierto', '1974'],
      ['Imagen EHT', '2022']
    ]
  },
  {
    id: 'orion',
    name: 'Nebulosa de Orión',
    tag: 'REGIÓN HII',
    sub: 'Brazo de Orión · 1 344 ly del Sol',
    position: onArm(25.0, 2, 0.30, 0.2),
    color: '#ff9bd0',
    explorable: false,
    desc: 'Vivero estelar donde nacen más de 700 estrellas jóvenes envueltas en discos protoplanetarios.',
    facts: [['Diámetro', '24 ly'], ['Edad', '~ 2 Ma'], ['Magnitud', '+4.0']]
  },
  {
    id: 'pleiades',
    name: 'Las Pléyades',
    tag: 'CÚMULO ABIERTO',
    sub: 'Brazo de Orión · 444 ly del Sol',
    position: onArm(26.8, 2, 0.38, 0.5),
    color: '#9fd8ff',
    explorable: false,
    desc: 'Cúmulo de estrellas azules calientes formadas hace apenas 100 millones de años, todavía envueltas en nebulosidad de reflexión.',
    facts: [['Estrellas', '~ 1 000'], ['Edad', '100 Ma'], ['Diámetro', '43 ly']]
  },
  {
    id: 'crab',
    name: 'Nebulosa del Cangrejo',
    tag: 'RESTO DE SUPERNOVA',
    sub: 'Brazo de Perseo · 6 500 ly del Sol',
    position: onArm(31.5, 0, -0.15, -0.4),
    color: '#8affc8',
    explorable: false,
    desc: 'Los restos en expansión de la supernova observada en el año 1054, con un púlsar girando 30 veces por segundo en su núcleo.',
    facts: [['Supernova', 'año 1054'], ['Expansión', '1 500 km/s'], ['Púlsar', '30 Hz']]
  },
  {
    id: 'eagle',
    name: 'Nebulosa del Águila',
    tag: 'REGIÓN HII',
    sub: 'Brazo de Sagitario · 7 000 ly del Sol',
    position: onArm(20.5, 3, 0.12, 0.3),
    color: '#c9a6ff',
    explorable: false,
    desc: 'Hogar de los Pilares de la Creación: columnas de gas y polvo de varios años luz esculpidas por la radiación de estrellas masivas.',
    facts: [['Pilares', '4-5 ly'], ['Edad', '5.5 Ma'], ['Distancia', '7 000 ly']]
  },
  {
    id: 'omega',
    name: 'Omega Centauri',
    tag: 'CÚMULO GLOBULAR',
    sub: 'Halo galáctico · 17 000 ly del Sol',
    position: { x: 16, y: -14, z: -22 },
    color: '#ffe6a8',
    explorable: false,
    desc: 'El cúmulo globular más brillante de la galaxia; posiblemente el núcleo superviviente de una galaxia enana devorada por la Vía Láctea.',
    facts: [['Estrellas', '10 millones'], ['Edad', '11 500 Ma'], ['Diámetro', '150 ly']]
  }
];

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
