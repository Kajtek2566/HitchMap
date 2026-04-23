import { latToTileY, lonToTileX } from "@/lib/mapUtils";

export type OfflineMapPack = {
  code: string;
  label: string;
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  zoomMin: number;
  zoomMax: number;
};

export type OfflineMapPackEstimate = OfflineMapPack & {
  estimatedTileCount: number;
  estimatedSizeMb: number;
  estimatedSizeLabel: string;
  isLargeDownload: boolean;
};

export type CountryCount = { country: string | null; count: number };

const ESTIMATED_TILE_SIZE_BYTES = 18 * 1024;

export const OFFLINE_MAP_PACKS: OfflineMapPack[] = [
  { code: "AD", label: "Andora", bounds: { minLat: 42.4, maxLat: 42.7, minLon: 1.4, maxLon: 1.8 }, zoomMin: 6, zoomMax: 8 },
  { code: "AL", label: "Albania", bounds: { minLat: 39.6, maxLat: 42.7, minLon: 19.0, maxLon: 21.1 }, zoomMin: 5, zoomMax: 7 },
  { code: "AT", label: "Austria", bounds: { minLat: 46.3, maxLat: 49.1, minLon: 9.4, maxLon: 17.2 }, zoomMin: 5, zoomMax: 7 },
  { code: "BA", label: "Bosnia i Hercegowina", bounds: { minLat: 42.5, maxLat: 45.3, minLon: 15.7, maxLon: 19.7 }, zoomMin: 5, zoomMax: 7 },
  { code: "BE", label: "Belgia", bounds: { minLat: 49.4, maxLat: 51.6, minLon: 2.4, maxLon: 6.4 }, zoomMin: 5, zoomMax: 7 },
  { code: "BG", label: "Bulgaria", bounds: { minLat: 41.2, maxLat: 44.3, minLon: 22.3, maxLon: 28.7 }, zoomMin: 5, zoomMax: 7 },
  { code: "BY", label: "Bialorus", bounds: { minLat: 51.3, maxLat: 56.2, minLon: 23.1, maxLon: 32.8 }, zoomMin: 5, zoomMax: 6 },
  { code: "CH", label: "Szwajcaria", bounds: { minLat: 45.8, maxLat: 47.9, minLon: 5.9, maxLon: 10.6 }, zoomMin: 5, zoomMax: 7 },
  { code: "CY", label: "Cypr", bounds: { minLat: 34.5, maxLat: 35.8, minLon: 32.1, maxLon: 34.7 }, zoomMin: 6, zoomMax: 8 },
  { code: "PL", label: "Polska", bounds: { minLat: 49.0, maxLat: 54.9, minLon: 14.1, maxLon: 24.2 }, zoomMin: 5, zoomMax: 7 },
  { code: "CZ", label: "Czechy", bounds: { minLat: 48.5, maxLat: 51.1, minLon: 12.0, maxLon: 18.9 }, zoomMin: 5, zoomMax: 7 },
  { code: "DE", label: "Niemcy", bounds: { minLat: 47.1, maxLat: 55.1, minLon: 5.8, maxLon: 15.1 }, zoomMin: 5, zoomMax: 7 },
  { code: "DK", label: "Dania", bounds: { minLat: 54.5, maxLat: 57.8, minLon: 8.0, maxLon: 12.7 }, zoomMin: 5, zoomMax: 7 },
  { code: "EE", label: "Estonia", bounds: { minLat: 57.5, maxLat: 59.9, minLon: 21.5, maxLon: 28.2 }, zoomMin: 5, zoomMax: 7 },
  { code: "ES", label: "Hiszpania", bounds: { minLat: 36.0, maxLat: 43.9, minLon: -9.5, maxLon: 3.4 }, zoomMin: 5, zoomMax: 6 },
  { code: "FI", label: "Finlandia", bounds: { minLat: 59.7, maxLat: 70.2, minLon: 20.5, maxLon: 31.6 }, zoomMin: 5, zoomMax: 6 },
  { code: "FR", label: "Francja", bounds: { minLat: 41.2, maxLat: 51.2, minLon: -5.6, maxLon: 9.8 }, zoomMin: 5, zoomMax: 6 },
  { code: "GB", label: "Wielka Brytania", bounds: { minLat: 49.8, maxLat: 58.7, minLon: -8.7, maxLon: 1.8 }, zoomMin: 5, zoomMax: 6 },
  { code: "GR", label: "Grecja", bounds: { minLat: 34.5, maxLat: 41.8, minLon: 19.3, maxLon: 29.7 }, zoomMin: 5, zoomMax: 7 },
  { code: "HR", label: "Chorwacja", bounds: { minLat: 42.3, maxLat: 46.6, minLon: 13.4, maxLon: 19.5 }, zoomMin: 5, zoomMax: 7 },
  { code: "HU", label: "Wegry", bounds: { minLat: 45.7, maxLat: 48.6, minLon: 16.1, maxLon: 22.9 }, zoomMin: 5, zoomMax: 7 },
  { code: "IE", label: "Irlandia", bounds: { minLat: 51.4, maxLat: 55.5, minLon: -10.8, maxLon: -5.4 }, zoomMin: 5, zoomMax: 7 },
  { code: "IS", label: "Islandia", bounds: { minLat: 63.2, maxLat: 66.6, minLon: -24.8, maxLon: -13.0 }, zoomMin: 5, zoomMax: 6 },
  { code: "IT", label: "Wlochy", bounds: { minLat: 36.5, maxLat: 47.2, minLon: 6.6, maxLon: 18.8 }, zoomMin: 5, zoomMax: 6 },
  { code: "LI", label: "Liechtenstein", bounds: { minLat: 47.0, maxLat: 47.3, minLon: 9.5, maxLon: 9.7 }, zoomMin: 7, zoomMax: 9 },
  { code: "LT", label: "Litwa", bounds: { minLat: 53.8, maxLat: 56.5, minLon: 20.9, maxLon: 26.9 }, zoomMin: 5, zoomMax: 7 },
  { code: "LU", label: "Luksemburg", bounds: { minLat: 49.4, maxLat: 50.2, minLon: 5.7, maxLon: 6.5 }, zoomMin: 6, zoomMax: 8 },
  { code: "LV", label: "Lotwa", bounds: { minLat: 55.6, maxLat: 58.1, minLon: 20.9, maxLon: 28.3 }, zoomMin: 5, zoomMax: 7 },
  { code: "MC", label: "Monako", bounds: { minLat: 43.7, maxLat: 43.8, minLon: 7.4, maxLon: 7.5 }, zoomMin: 8, zoomMax: 10 },
  { code: "MD", label: "Moldawia", bounds: { minLat: 45.4, maxLat: 48.5, minLon: 26.5, maxLon: 30.2 }, zoomMin: 5, zoomMax: 7 },
  { code: "ME", label: "Czarnogora", bounds: { minLat: 41.8, maxLat: 43.6, minLon: 18.4, maxLon: 20.4 }, zoomMin: 5, zoomMax: 7 },
  { code: "MK", label: "Macedonia Polnocna", bounds: { minLat: 40.8, maxLat: 42.4, minLon: 20.4, maxLon: 23.0 }, zoomMin: 5, zoomMax: 7 },
  { code: "MT", label: "Malta", bounds: { minLat: 35.8, maxLat: 36.1, minLon: 14.2, maxLon: 14.7 }, zoomMin: 7, zoomMax: 9 },
  { code: "NL", label: "Holandia", bounds: { minLat: 50.7, maxLat: 53.7, minLon: 3.3, maxLon: 7.2 }, zoomMin: 5, zoomMax: 7 },
  { code: "NO", label: "Norwegia", bounds: { minLat: 57.8, maxLat: 71.3, minLon: 4.5, maxLon: 31.5 }, zoomMin: 5, zoomMax: 6 },
  { code: "PT", label: "Portugalia", bounds: { minLat: 36.8, maxLat: 42.2, minLon: -9.6, maxLon: -6.2 }, zoomMin: 5, zoomMax: 7 },
  { code: "RO", label: "Rumunia", bounds: { minLat: 43.5, maxLat: 48.3, minLon: 20.2, maxLon: 29.8 }, zoomMin: 5, zoomMax: 7 },
  { code: "RS", label: "Serbia", bounds: { minLat: 42.2, maxLat: 46.2, minLon: 18.8, maxLon: 23.1 }, zoomMin: 5, zoomMax: 7 },
  { code: "RU", label: "Rosja", bounds: { minLat: 41.2, maxLat: 69.5, minLon: 19.6, maxLon: 60.0 }, zoomMin: 4, zoomMax: 5 },
  { code: "SE", label: "Szwecja", bounds: { minLat: 55.2, maxLat: 69.1, minLon: 11.0, maxLon: 24.2 }, zoomMin: 5, zoomMax: 6 },
  { code: "SI", label: "Slowenia", bounds: { minLat: 45.4, maxLat: 46.9, minLon: 13.4, maxLon: 16.6 }, zoomMin: 5, zoomMax: 7 },
  { code: "SK", label: "Slowacja", bounds: { minLat: 47.7, maxLat: 49.7, minLon: 16.8, maxLon: 22.6 }, zoomMin: 5, zoomMax: 7 },
  { code: "SM", label: "San Marino", bounds: { minLat: 43.9, maxLat: 44.1, minLon: 12.4, maxLon: 12.6 }, zoomMin: 7, zoomMax: 9 },
  { code: "UA", label: "Ukraina", bounds: { minLat: 44.3, maxLat: 52.4, minLon: 22.1, maxLon: 40.3 }, zoomMin: 5, zoomMax: 6 },
  { code: "VA", label: "Watykan", bounds: { minLat: 41.8, maxLat: 42.0, minLon: 12.4, maxLon: 12.5 }, zoomMin: 8, zoomMax: 10 },
];

const COUNTRY_LABELS = Object.fromEntries(
  OFFLINE_MAP_PACKS.map((pack) => [pack.code, pack.label]),
) as Record<string, string>;

const ISO_COUNTRY_LABELS: Record<string, string> = {
  AD: "Andora",
  AE: "Zjednoczone Emiraty Arabskie",
  AF: "Afganistan",
  AG: "Antigua i Barbuda",
  AL: "Albania",
  AM: "Armenia",
  AO: "Angola",
  AR: "Argentyna",
  AT: "Austria",
  AU: "Australia",
  AZ: "Azerbejdzan",
  BA: "Bosnia i Hercegowina",
  BB: "Barbados",
  BD: "Bangladesz",
  BE: "Belgia",
  BF: "Burkina Faso",
  BG: "Bulgaria",
  BH: "Bahrajn",
  BI: "Burundi",
  BJ: "Benin",
  BN: "Brunei",
  BO: "Boliwia",
  BR: "Brazylia",
  BS: "Bahamy",
  BT: "Bhutan",
  BW: "Botswana",
  BY: "Bialorus",
  BZ: "Belize",
  CA: "Kanada",
  CD: "Demokratyczna Republika Konga",
  CF: "Republika Srodkowoafrykanska",
  CG: "Kongo",
  CH: "Szwajcaria",
  CI: "Wybrzeze Kosci Sloniowej",
  CL: "Chile",
  CM: "Kamerun",
  CN: "Chiny",
  CO: "Kolumbia",
  CR: "Kostaryka",
  CU: "Kuba",
  CV: "Republika Zielonego Przyladka",
  CY: "Cypr",
  CZ: "Czechy",
  DE: "Niemcy",
  DJ: "Dzbibuti",
  DK: "Dania",
  DM: "Dominika",
  DO: "Dominikana",
  DZ: "Algieria",
  EC: "Ekwador",
  EE: "Estonia",
  EG: "Egipt",
  ER: "Erytrea",
  ES: "Hiszpania",
  ET: "Etiopia",
  FI: "Finlandia",
  FJ: "Fidzi",
  FM: "Mikronezja",
  FR: "Francja",
  GA: "Gabon",
  GB: "Wielka Brytania",
  GD: "Grenada",
  GE: "Gruzja",
  GH: "Ghana",
  GM: "Gambia",
  GN: "Gwinea",
  GQ: "Gwinea Rownikowa",
  GR: "Grecja",
  GT: "Gwatemala",
  GW: "Gwinea Bissau",
  GY: "Gujana",
  HN: "Honduras",
  HR: "Chorwacja",
  HT: "Haiti",
  HU: "Wegry",
  ID: "Indonezja",
  IE: "Irlandia",
  IL: "Izrael",
  IN: "Indie",
  IQ: "Irak",
  IR: "Iran",
  IS: "Islandia",
  IT: "Wlochy",
  JM: "Jamajka",
  JO: "Jordania",
  JP: "Japonia",
  KE: "Kenia",
  KG: "Kirgistan",
  KH: "Kambodza",
  KI: "Kiribati",
  KM: "Komory",
  KN: "Saint Kitts i Nevis",
  KP: "Korea Polnocna",
  KR: "Korea Poludniowa",
  KW: "Kuwejt",
  KZ: "Kazachstan",
  LA: "Laos",
  LB: "Liban",
  LC: "Saint Lucia",
  LI: "Liechtenstein",
  LK: "Sri Lanka",
  LR: "Liberia",
  LS: "Lesotho",
  LT: "Litwa",
  LU: "Luksemburg",
  LV: "Lotwa",
  LY: "Libia",
  MA: "Maroko",
  MC: "Monako",
  MD: "Moldawia",
  ME: "Czarnogora",
  MG: "Madagaskar",
  MH: "Wyspy Marshalla",
  MK: "Macedonia Polnocna",
  ML: "Mali",
  MM: "Mjanma",
  MN: "Mongolia",
  MR: "Mauretania",
  MT: "Malta",
  MU: "Mauritius",
  MV: "Malediwy",
  MW: "Malawi",
  MX: "Meksyk",
  MY: "Malezja",
  MZ: "Mozambik",
  NA: "Namibia",
  NE: "Niger",
  NG: "Nigeria",
  NI: "Nikaragua",
  NL: "Holandia",
  NO: "Norwegia",
  NP: "Nepal",
  NR: "Nauru",
  NZ: "Nowa Zelandia",
  OM: "Oman",
  PA: "Panama",
  PE: "Peru",
  PG: "Papua Nowa Gwinea",
  PH: "Filipiny",
  PK: "Pakistan",
  PL: "Polska",
  PT: "Portugalia",
  PW: "Palau",
  PY: "Paragwaj",
  QA: "Katar",
  RO: "Rumunia",
  RS: "Serbia",
  RU: "Rosja",
  RW: "Rwanda",
  SA: "Arabia Saudyjska",
  SB: "Wyspy Salomona",
  SC: "Seszele",
  SD: "Sudan",
  SE: "Szwecja",
  SG: "Singapur",
  SI: "Slowenia",
  SK: "Slowacja",
  SL: "Sierra Leone",
  SM: "San Marino",
  SN: "Senegal",
  SO: "Somalia",
  SR: "Surinam",
  SS: "Sudan Poludniowy",
  ST: "Wyspy Swietego Tomasza i Ksiecia",
  SV: "Salwador",
  SY: "Syria",
  SZ: "Eswatini",
  TD: "Czad",
  TG: "Togo",
  TH: "Tajlandia",
  TJ: "Tadzykistan",
  TL: "Timor Wschodni",
  TM: "Turkmenistan",
  TN: "Tunezja",
  TO: "Tonga",
  TR: "Turcja",
  TT: "Trynidad i Tobago",
  TV: "Tuvalu",
  TW: "Tajwan",
  TZ: "Tanzania",
  UA: "Ukraina",
  UG: "Uganda",
  US: "Stany Zjednoczone",
  UY: "Urugwaj",
  UZ: "Uzbekistan",
  VA: "Watykan",
  VC: "Saint Vincent i Grenadyny",
  VE: "Wenezuela",
  VN: "Wietnam",
  VU: "Vanuatu",
  WS: "Samoa",
  YE: "Jemen",
  ZA: "Republika Poludniowej Afryki",
  ZM: "Zambia",
  ZW: "Zimbabwe",
};

export const stripPolishDiacritics = (value: string) =>
  value
    .replaceAll("ą", "a")
    .replaceAll("ć", "c")
    .replaceAll("ę", "e")
    .replaceAll("ł", "l")
    .replaceAll("ń", "n")
    .replaceAll("ó", "o")
    .replaceAll("ś", "s")
    .replaceAll("ż", "z")
    .replaceAll("ź", "z")
    .replaceAll("Ą", "A")
    .replaceAll("Ć", "C")
    .replaceAll("Ę", "E")
    .replaceAll("Ł", "L")
    .replaceAll("Ń", "N")
    .replaceAll("Ó", "O")
    .replaceAll("Ś", "S")
    .replaceAll("Ż", "Z")
    .replaceAll("Ź", "Z");

export const getCountrySelectionKey = (country: string | null) => country ?? "__NO_COUNTRY__";
export const getCountryCode = (country: string | null) => (country ? country.trim().toUpperCase() : null);

export const getCountryDisplayLabel = (country: string | null) => {
  if (!country) return "Brak kraju";
  const normalizedCountry = country.trim().toUpperCase();
  if (COUNTRY_LABELS[normalizedCountry]) return COUNTRY_LABELS[normalizedCountry];
  if (ISO_COUNTRY_LABELS[normalizedCountry]) return ISO_COUNTRY_LABELS[normalizedCountry];

  try {
    const DisplayNamesCtor = Intl?.DisplayNames;
    if (typeof DisplayNamesCtor !== "function") return normalizedCountry;
    const formatter = new DisplayNamesCtor(["pl-PL"], { type: "region" });
    return formatter.of(normalizedCountry) ?? normalizedCountry;
  } catch {
    return normalizedCountry;
  }
};

export const filterOfflineMapPacks = (packs: OfflineMapPack[], query: string) => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];

  const normalizedQuery = stripPolishDiacritics(trimmedQuery).toLowerCase();
  return packs.filter((pack) => {
    const normalizedLabel = stripPolishDiacritics(pack.label).toLowerCase();
    const normalizedCode = pack.code.toLowerCase();
    return normalizedLabel.includes(normalizedQuery) || normalizedCode.includes(normalizedQuery);
  });
};

export const filterCountryStats = (countryStats: CountryCount[], query: string) => {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return countryStats;

  const normalizedQuery = stripPolishDiacritics(trimmedQuery).toLowerCase();
  return countryStats.filter((item) =>
    stripPolishDiacritics(getCountryDisplayLabel(item.country)).toLowerCase().includes(normalizedQuery),
  );
};

export const estimateOfflinePackTileCount = (pack: OfflineMapPack) => {
  let totalTiles = 0;

  for (let zoom = pack.zoomMin; zoom <= pack.zoomMax; zoom += 1) {
    const minX = lonToTileX(pack.bounds.minLon, zoom);
    const maxX = lonToTileX(pack.bounds.maxLon, zoom);
    const minY = latToTileY(pack.bounds.maxLat, zoom);
    const maxY = latToTileY(pack.bounds.minLat, zoom);

    totalTiles += (maxX - minX + 1) * (maxY - minY + 1);
  }

  return totalTiles;
};

export const enrichOfflineMapPack = (pack: OfflineMapPack): OfflineMapPackEstimate => {
  const estimatedTileCount = estimateOfflinePackTileCount(pack);
  const estimatedSizeMb = Math.max(0.1, Math.round((estimatedTileCount * ESTIMATED_TILE_SIZE_BYTES) / 1024 / 1024 * 10) / 10);

  return {
    ...pack,
    estimatedTileCount,
    estimatedSizeMb,
    estimatedSizeLabel: `${estimatedSizeMb.toFixed(1)} MB`,
    isLargeDownload: estimatedTileCount >= 1800,
  };
};
