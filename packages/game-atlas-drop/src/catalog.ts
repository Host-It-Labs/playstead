import type { AtlasTargetKind } from '@playstead/shared';

export type AtlasTarget = {
  id: string;
  name: string;
  prompt: string;
  kind: AtlasTargetKind;
  lat: number;
  lng: number;
  story: string;
};

// Original Playstead clues and descriptions, backed only by ordinary geographic facts.
export const ATLAS_TARGETS: readonly AtlasTarget[] = [
  {
    id: 'reykjavik',
    name: 'Reykjavík',
    kind: 'city',
    lat: 64.1466,
    lng: -21.9426,
    prompt: 'Find the northern capital where colorful roofs face a cold Atlantic bay.',
    story:
      'Reykjavík grew from a small Icelandic settlement into a capital heated largely by geothermal energy.',
  },
  {
    id: 'lisbon',
    name: 'Lisbon',
    kind: 'city',
    lat: 38.7223,
    lng: -9.1393,
    prompt: 'Drop near the tiled hills where a broad river meets the Atlantic.',
    story: 'Lisbon rises over the Tagus estuary, with steep streets long served by yellow trams.',
  },
  {
    id: 'edinburgh-castle',
    name: 'Edinburgh Castle',
    kind: 'landmark',
    lat: 55.9486,
    lng: -3.1999,
    prompt: 'Find the fortress sitting on an ancient volcanic plug above a festival city.',
    story:
      'Edinburgh Castle occupies Castle Rock, a volcanic landmark shaped by glaciers and centuries of history.',
  },
  {
    id: 'mont-saint-michel',
    name: 'Mont-Saint-Michel',
    kind: 'landmark',
    lat: 48.6361,
    lng: -1.5115,
    prompt: 'Pin the tidal island crowned by a medieval abbey off the French coast.',
    story:
      'A narrow causeway reaches this Normandy abbey, while some of Europe’s strongest tides transform its bay.',
  },
  {
    id: 'matterhorn',
    name: 'Matterhorn',
    kind: 'nature',
    lat: 45.9763,
    lng: 7.6586,
    prompt: 'Find the sharply pyramidal Alpine peak overlooking Zermatt.',
    story:
      'The Matterhorn stands on the Swiss-Italian border and became one of mountaineering’s most recognizable silhouettes.',
  },
  {
    id: 'santorini',
    name: 'Santorini',
    kind: 'nature',
    lat: 36.3932,
    lng: 25.4615,
    prompt: 'Drop into the Aegean caldera ringed by white villages and dark volcanic cliffs.',
    story:
      'Santorini’s crescent records a huge ancient eruption; villages now perch along the flooded caldera rim.',
  },
  {
    id: 'istanbul',
    name: 'Istanbul',
    kind: 'city',
    lat: 41.0082,
    lng: 28.9784,
    prompt: 'Find the metropolis that spans Europe and Asia beside the Bosporus.',
    story:
      'Istanbul has connected seas, continents, and empires from its strategic position around the Bosporus.',
  },
  {
    id: 'petra',
    name: 'Petra',
    kind: 'landmark',
    lat: 30.3285,
    lng: 35.4444,
    prompt: 'Place a pin by the rose-colored city carved into desert sandstone.',
    story:
      'Nabataean builders cut façades and water channels into Petra’s cliffs, creating a desert trading center.',
  },
  {
    id: 'kilimanjaro',
    name: 'Mount Kilimanjaro',
    kind: 'nature',
    lat: -3.0674,
    lng: 37.3556,
    prompt: 'Find Africa’s free-standing giant rising above the plains of Tanzania.',
    story:
      'Kilimanjaro is a dormant volcanic massif whose three cones rise dramatically near the Kenyan border.',
  },
  {
    id: 'serengeti',
    name: 'Serengeti National Park',
    kind: 'nature',
    lat: -2.3333,
    lng: 34.8333,
    prompt: 'Drop on the East African grasslands crossed by immense herds each year.',
    story:
      'The Serengeti ecosystem supports a vast seasonal migration of wildebeest, zebra, and gazelles.',
  },
  {
    id: 'victoria-falls',
    name: 'Victoria Falls',
    kind: 'nature',
    lat: -17.9243,
    lng: 25.8572,
    prompt: 'Find the broad curtain of spray on the Zambezi between two countries.',
    story: 'Here the Zambezi plunges into a narrow gorge along the border of Zambia and Zimbabwe.',
  },
  {
    id: 'table-mountain',
    name: 'Table Mountain',
    kind: 'nature',
    lat: -33.9628,
    lng: 18.4098,
    prompt: 'Pin the flat-topped mountain standing behind Cape Town.',
    story:
      'Table Mountain’s sandstone plateau overlooks Cape Town and shelters unusually rich plant life.',
  },
  {
    id: 'timbuktu',
    name: 'Timbuktu',
    kind: 'city',
    lat: 16.7666,
    lng: -3.0026,
    prompt: 'Find the historic Saharan center of manuscripts and trans-Saharan trade.',
    story:
      'Timbuktu flourished beside Niger River trade routes as a celebrated center of scholarship.',
  },
  {
    id: 'lalibela',
    name: 'Lalibela',
    kind: 'landmark',
    lat: 12.0317,
    lng: 39.0476,
    prompt: 'Drop near the Ethiopian churches carved downward from solid rock.',
    story:
      'Lalibela’s medieval churches were excavated from volcanic rock and linked by trenches and passages.',
  },
  {
    id: 'marrakesh',
    name: 'Marrakesh',
    kind: 'city',
    lat: 31.6295,
    lng: -7.9811,
    prompt: 'Find the red-walled city set between Atlantic plains and the Atlas Mountains.',
    story:
      'Marrakesh grew around a lively medina, gardens, and trading routes near Morocco’s mountain foothills.',
  },
  {
    id: 'new-york',
    name: 'New York City',
    kind: 'city',
    lat: 40.7128,
    lng: -74.006,
    prompt: 'Pin the harbor city spread across five boroughs at the mouth of the Hudson.',
    story:
      'New York’s natural harbor helped it become a global center shaped by generations of migration.',
  },
  {
    id: 'grand-canyon',
    name: 'Grand Canyon',
    kind: 'nature',
    lat: 36.1069,
    lng: -112.1129,
    prompt: 'Find the immense layered gorge cut by the Colorado River.',
    story:
      'The Colorado River exposed rock layers spanning an extraordinary stretch of Earth’s history.',
  },
  {
    id: 'chichen-itza',
    name: 'Chichén Itzá',
    kind: 'landmark',
    lat: 20.6843,
    lng: -88.5678,
    prompt: 'Drop by the stepped Maya pyramid on Mexico’s Yucatán Peninsula.',
    story:
      'Chichén Itzá joined Maya architecture, astronomy, ceremony, and regional exchange on the Yucatán plain.',
  },
  {
    id: 'havana',
    name: 'Havana',
    kind: 'city',
    lat: 23.1136,
    lng: -82.3666,
    prompt: 'Find the Caribbean capital with a long seawall facing the Florida Straits.',
    story:
      'Havana’s sheltered harbor and fortified old city made it a key Atlantic port for centuries.',
  },
  {
    id: 'banff',
    name: 'Banff National Park',
    kind: 'nature',
    lat: 51.1784,
    lng: -115.5708,
    prompt: 'Pin the Canadian Rockies park known for turquoise glacial lakes.',
    story:
      'Canada’s oldest national park protects mountain valleys, icefields, forests, and headwaters in Alberta.',
  },
  {
    id: 'golden-gate',
    name: 'Golden Gate Bridge',
    kind: 'landmark',
    lat: 37.8199,
    lng: -122.4783,
    prompt: 'Find the orange suspension bridge guarding a foggy Pacific strait.',
    story:
      'The bridge crosses the Golden Gate, the narrow entrance between San Francisco Bay and the Pacific.',
  },
  {
    id: 'panama-canal',
    name: 'Panama Canal',
    kind: 'landmark',
    lat: 9.0801,
    lng: -79.6801,
    prompt: 'Drop on the lock waterway that shortcuts between two oceans.',
    story:
      'A system of locks lifts ships across the Isthmus of Panama between Atlantic and Pacific waters.',
  },
  {
    id: 'machu-picchu',
    name: 'Machu Picchu',
    kind: 'landmark',
    lat: -13.1631,
    lng: -72.545,
    prompt: 'Find the Inca stone terraces high in a cloud-forest saddle.',
    story:
      'Machu Picchu sits above Peru’s Urubamba valley, where precisely fitted stonework follows a mountain ridge.',
  },
  {
    id: 'uyuni',
    name: 'Salar de Uyuni',
    kind: 'nature',
    lat: -20.1338,
    lng: -67.4891,
    prompt: 'Pin the enormous salt flat that becomes a sky mirror after rain.',
    story: 'Bolivia’s Salar de Uyuni is the remnant of prehistoric lakes on the high Altiplano.',
  },
  {
    id: 'iguazu',
    name: 'Iguazú Falls',
    kind: 'nature',
    lat: -25.6953,
    lng: -54.4367,
    prompt: 'Find the subtropical waterfall system on the Argentina–Brazil border.',
    story:
      'Hundreds of cascades curve through rainforest where the Iguazú River drops over basalt ledges.',
  },
  {
    id: 'rio',
    name: 'Rio de Janeiro',
    kind: 'city',
    lat: -22.9068,
    lng: -43.1729,
    prompt: 'Drop by the Atlantic city tucked between granite peaks and famous beaches.',
    story:
      'Rio wraps around bays and mountains, with neighborhoods climbing between tropical forest and ocean.',
  },
  {
    id: 'easter-island',
    name: 'Rapa Nui',
    kind: 'landmark',
    lat: -27.1127,
    lng: -109.3497,
    prompt: 'Find the remote Pacific island watched over by monumental stone figures.',
    story:
      'Rapa Nui communities carved and moved hundreds of moai across one of the world’s most isolated inhabited islands.',
  },
  {
    id: 'patagonia-fitz-roy',
    name: 'Mount Fitz Roy',
    kind: 'nature',
    lat: -49.2712,
    lng: -73.0432,
    prompt: 'Pin the jagged Patagonian summit near the Southern Ice Field.',
    story:
      'Fitz Roy’s steep granite spires rise above glaciers and wind-shaped valleys on the Argentina–Chile frontier.',
  },
  {
    id: 'kyoto',
    name: 'Kyoto',
    kind: 'city',
    lat: 35.0116,
    lng: 135.7681,
    prompt: 'Find Japan’s former imperial capital among temple-covered hills.',
    story:
      'Kyoto preserves gardens, shrines, workshops, and districts shaped by more than a millennium of history.',
  },
  {
    id: 'great-wall',
    name: 'Great Wall at Mutianyu',
    kind: 'landmark',
    lat: 40.4319,
    lng: 116.5704,
    prompt: 'Drop on the fortified stone ridges north of Beijing.',
    story:
      'At Mutianyu, restored watchtowers trace a mountainous section of fortifications built across many eras.',
  },
  {
    id: 'angkor-wat',
    name: 'Angkor Wat',
    kind: 'landmark',
    lat: 13.4125,
    lng: 103.867,
    prompt: 'Find the vast temple complex rising from Cambodia’s forest plain.',
    story:
      'Angkor Wat began as a Khmer state temple and remains surrounded by a broad geometric moat.',
  },
  {
    id: 'ha-long-bay',
    name: 'Hạ Long Bay',
    kind: 'nature',
    lat: 20.9101,
    lng: 107.1839,
    prompt: 'Pin the bay filled with steep limestone towers off northern Vietnam.',
    story: 'Erosion shaped thousands of forested limestone islets and caves across Hạ Long Bay.',
  },
  {
    id: 'taj-mahal',
    name: 'Taj Mahal',
    kind: 'landmark',
    lat: 27.1751,
    lng: 78.0421,
    prompt: 'Find the white marble mausoleum beside the Yamuna River.',
    story:
      'The Taj Mahal’s marble, gardens, and near-perfect symmetry form a seventeenth-century memorial in Agra.',
  },
  {
    id: 'gobi',
    name: 'Gobi Desert',
    kind: 'nature',
    lat: 42.59,
    lng: 103.43,
    prompt: 'Drop in the broad cold desert spanning Mongolia and northern China.',
    story:
      'The Gobi includes rocky plains, dunes, and fossil-rich basins with extreme seasonal temperatures.',
  },
  {
    id: 'singapore',
    name: 'Singapore',
    kind: 'city',
    lat: 1.3521,
    lng: 103.8198,
    prompt: 'Find the island city-state beside one of the world’s busiest shipping straits.',
    story:
      'Singapore sits near the southern tip of the Malay Peninsula where major maritime routes converge.',
  },
  {
    id: 'jeju',
    name: 'Jeju Island',
    kind: 'nature',
    lat: 33.4996,
    lng: 126.5312,
    prompt: 'Pin the volcanic island south of the Korean Peninsula.',
    story:
      'Jeju formed through volcanic activity and is crowned by Hallasan, South Korea’s highest mountain.',
  },
  {
    id: 'sydney-opera',
    name: 'Sydney Opera House',
    kind: 'landmark',
    lat: -33.8568,
    lng: 151.2153,
    prompt: 'Find the harbor landmark with shell-like white roofs.',
    story:
      'The Opera House occupies Bennelong Point, its tiled roof forms echoing sails on Sydney Harbour.',
  },
  {
    id: 'uluru',
    name: 'Uluru',
    kind: 'nature',
    lat: -25.3444,
    lng: 131.0369,
    prompt: 'Drop by the immense sandstone monolith in Australia’s red center.',
    story:
      'Uluru rises from the Central Australian plain and holds deep cultural importance for Aṉangu people.',
  },
  {
    id: 'great-barrier-reef',
    name: 'Great Barrier Reef',
    kind: 'nature',
    lat: -18.2871,
    lng: 147.6992,
    prompt: 'Find the vast coral system tracing Australia’s northeast coast.',
    story: 'Thousands of reefs and islands form this living marine mosaic in the Coral Sea.',
  },
  {
    id: 'milford-sound',
    name: 'Milford Sound',
    kind: 'nature',
    lat: -44.6414,
    lng: 167.8974,
    prompt: 'Pin the rain-soaked fiord beneath steep New Zealand peaks.',
    story:
      'Glaciers carved Milford Sound’s sheer valleys, now filled by the Tasman Sea and fed by many waterfalls.',
  },
  {
    id: 'wellington',
    name: 'Wellington',
    kind: 'city',
    lat: -41.2866,
    lng: 174.7756,
    prompt: 'Find the compact, windy capital wrapped around a southern harbor.',
    story: 'Wellington occupies hills around a sheltered harbor near the narrow Cook Strait.',
  },
  {
    id: 'bora-bora',
    name: 'Bora Bora',
    kind: 'nature',
    lat: -16.5004,
    lng: -151.7415,
    prompt: 'Drop on the volcanic Pacific island encircled by a bright lagoon.',
    story:
      'A barrier reef surrounds Bora Bora’s lagoon while eroded volcanic peaks rise at its center.',
  },
  {
    id: 'antarctic-peninsula',
    name: 'Antarctic Peninsula',
    kind: 'nature',
    lat: -64.825,
    lng: -62.925,
    prompt: 'Find the long icy arm reaching toward South America.',
    story:
      'The Antarctic Peninsula extends north from the continent and hosts mountains, glaciers, and major seabird colonies.',
  },
] as const;
