// Display-only French labels for the HeyGen language names returned by
// /api/heygen/video-translation?info=languages. The raw name is always the value
// sent back to the API; unknown names fall back to the original text.

const BASE_FR = {
  Afrikaans: 'Afrikaans', Albanian: 'Albanais', Amharic: 'Amharique', Arabic: 'Arabe', Armenian: 'Arménien',
  Azerbaijani: 'Azerbaïdjanais', Bangla: 'Bengali', Bengali: 'Bengali', Basque: 'Basque', Belarusian: 'Biélorusse',
  Bosnian: 'Bosniaque', Bulgarian: 'Bulgare', Burmese: 'Birman', Catalan: 'Catalan', Chinese: 'Chinois',
  Mandarin: 'Chinois', Croatian: 'Croate', Czech: 'Tchèque', Danish: 'Danois', Dutch: 'Néerlandais',
  English: 'Anglais', Estonian: 'Estonien', Filipino: 'Filipino', Finnish: 'Finnois', French: 'Français',
  Galician: 'Galicien', Georgian: 'Géorgien', German: 'Allemand', Greek: 'Grec', Gujarati: 'Gujarati',
  'Haitian Creole': 'Créole haïtien', Hebrew: 'Hébreu', Hindi: 'Hindi', Hungarian: 'Hongrois', Icelandic: 'Islandais',
  Indonesian: 'Indonésien', Irish: 'Irlandais', Italian: 'Italien', Japanese: 'Japonais', Javanese: 'Javanais',
  Kannada: 'Kannada', Kazakh: 'Kazakh', Khmer: 'Khmer', Konkani: 'Konkani', Korean: 'Coréen', Lao: 'Lao',
  Latin: 'Latin', Latvian: 'Letton', Lithuanian: 'Lituanien', Luxembourgish: 'Luxembourgeois', Macedonian: 'Macédonien',
  Maithili: 'Maïthili', Malagasy: 'Malgache', Malay: 'Malais', Malayalam: 'Malayalam', Maltese: 'Maltais',
  Marathi: 'Marathi', Mongolian: 'Mongol', Nepali: 'Népalais', 'Norwegian Bokmål': 'Norvégien',
  'Norwegian Nynorsk': 'Norvégien', Odia: 'Odia', Pashto: 'Pachto', Persian: 'Persan', Polish: 'Polonais',
  Portuguese: 'Portugais', Punjabi: 'Pendjabi', Romanian: 'Roumain', Russian: 'Russe', Serbian: 'Serbe',
  Sindhi: 'Sindhi', Sinhala: 'Cingalais', Slovak: 'Slovaque', Slovenian: 'Slovène', Somali: 'Somali',
  Spanish: 'Espagnol', Sundanese: 'Soundanais', Swahili: 'Swahili', Swedish: 'Suédois', Tamil: 'Tamoul',
  Telugu: 'Télougou', Thai: 'Thaï', Turkish: 'Turc', Ukrainian: 'Ukrainien', Urdu: 'Ourdou', Uzbek: 'Ouzbek',
  Vietnamese: 'Vietnamien', Welsh: 'Gallois', Zulu: 'Zoulou',
}

// Implicit variant carried by the base name itself (e.g. "Mandarin", "Norwegian Bokmål").
const BASE_VARIANT = { Mandarin: 'Mandarin', 'Norwegian Bokmål': 'Bokmål', 'Norwegian Nynorsk': 'Nynorsk', Bangla: 'Bangla' }

const PART_FR = {
  'South Africa': 'Afrique du Sud', Albania: 'Albanie', Ethiopia: 'Éthiopie', Algeria: 'Algérie', Bahrain: 'Bahreïn',
  Egypt: 'Égypte', Iraq: 'Irak', Jordan: 'Jordanie', Kuwait: 'Koweït', Lebanon: 'Liban', Libya: 'Libye',
  Morocco: 'Maroc', Oman: 'Oman', Qatar: 'Qatar', 'Saudi Arabia': 'Arabie saoudite', Syria: 'Syrie',
  Tunisia: 'Tunisie', 'United Arab Emirates': 'Émirats arabes unis', World: 'International', Yemen: 'Yémen',
  Armenia: 'Arménie', Azerbaijan: 'Azerbaïdjan', Bangladesh: 'Bangladesh', Belarus: 'Biélorussie', India: 'Inde',
  'Bosnia and Herzegovina': 'Bosnie-Herzégovine', Bulgaria: 'Bulgarie', Myanmar: 'Myanmar', Croatia: 'Croatie',
  Czechia: 'Tchéquie', Denmark: 'Danemark', Belgium: 'Belgique', Netherlands: 'Pays-Bas', Australia: 'Australie',
  Canada: 'Canada', 'Hong Kong SAR': 'Hong Kong', Ireland: 'Irlande', Kenya: 'Kenya', 'New Zealand': 'Nouvelle-Zélande',
  Nigeria: 'Nigeria', Philippines: 'Philippines', Singapore: 'Singapour', Tanzania: 'Tanzanie', UK: 'Royaume-Uni',
  'United Kingdom': 'Royaume-Uni', 'United States': 'États-Unis', Estonia: 'Estonie', Cebuano: 'Cebuano',
  Finland: 'Finlande', France: 'France', Switzerland: 'Suisse', Georgia: 'Géorgie', Austria: 'Autriche',
  Germany: 'Allemagne', Greece: 'Grèce', Haiti: 'Haïti', Israel: 'Israël', Hungary: 'Hongrie', Iceland: 'Islande',
  Indonesia: 'Indonésie', Italy: 'Italie', Japan: 'Japon', Kazakhstan: 'Kazakhstan', Cambodia: 'Cambodge',
  Korea: 'Corée', Laos: 'Laos', 'Vatican City': 'Vatican', Latvia: 'Lettonie', Lithuania: 'Lituanie',
  Luxembourg: 'Luxembourg', 'North Macedonia': 'Macédoine du Nord', Madagascar: 'Madagascar', Malaysia: 'Malaisie',
  Malta: 'Malte', Mongolia: 'Mongolie', Nepal: 'Népal', Norway: 'Norvège', Afghanistan: 'Afghanistan', Iran: 'Iran',
  Poland: 'Pologne', Brazil: 'Brésil', Portugal: 'Portugal', Romania: 'Roumanie', Russia: 'Russie', Serbia: 'Serbie',
  'Sri Lanka': 'Sri Lanka', Slovakia: 'Slovaquie', Slovenia: 'Slovénie', Somalia: 'Somalie', Argentina: 'Argentine',
  Bolivia: 'Bolivie', Chile: 'Chili', Colombia: 'Colombie', 'Costa Rica': 'Costa Rica', Cuba: 'Cuba',
  'Dominican Republic': 'République dominicaine', Ecuador: 'Équateur', 'El Salvador': 'Salvador',
  'Equatorial Guinea': 'Guinée équatoriale', Guatemala: 'Guatemala', Honduras: 'Honduras',
  'Latin America': 'Amérique latine', Mexico: 'Mexique', Nicaragua: 'Nicaragua', Panama: 'Panama',
  Paraguay: 'Paraguay', Peru: 'Pérou', 'Puerto Rico': 'Porto Rico', Spain: 'Espagne', Uruguay: 'Uruguay',
  Venezuela: 'Venezuela', Sweden: 'Suède', Thailand: 'Thaïlande', Türkiye: 'Turquie', Ukraine: 'Ukraine',
  Pakistan: 'Pakistan', Uzbekistan: 'Ouzbékistan', Vietnam: 'Vietnam',
  Latin: 'alphabet latin', Traditional: 'traditionnel', Simplified: 'simplifié', Cantonese: 'Cantonais',
  Mandarin: 'Mandarin', 'Jilu Mandarin': 'Mandarin Jilu', 'Northeastern Mandarin': 'Mandarin du Nord-Est',
  'Southwestern Mandarin': 'Mandarin du Sud-Ouest', 'Taiwanese Mandarin': 'Mandarin taïwanais', Wu: 'Wu',
  'Zhongyuan Mandarin Henan': 'Mandarin Zhongyuan (Henan)', 'Zhongyuan Mandarin Shaanxi': 'Mandarin Zhongyuan (Shaanxi)',
}

export const STANDARD_VARIANT = 'Standard'

export const POPULAR_LANGUAGE_IDS = [
  'French', 'English', 'Spanish', 'Arabic', 'Portuguese (Brazil)', 'German', 'Italian',
  'Chinese (Mandarin, Simplified)', 'Hindi', 'Japanese', 'Russian', 'Korean',
]

export const normalizeText = (value) =>
  String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

export function describeLanguage(id) {
  const match = /^(.*?)\s*\((.*)\)\s*$/.exec(id)
  const base = (match ? match[1] : id).trim()
  const parts = match ? match[2].split(',').map((p) => p.trim()).filter(Boolean) : []
  const implicit = BASE_VARIANT[base]
  const variantParts = [...(implicit ? [implicit] : []), ...parts.map((p) => PART_FR[p] || p)]
  const variant = variantParts.length ? variantParts.join(', ') : STANDARD_VARIANT
  const language = BASE_FR[base] || base
  return {
    id,
    language,
    variant,
    label: variant === STANDARD_VARIANT ? language : `${language} · ${variant}`,
    searchText: normalizeText(`${language} ${variant} ${id}`),
  }
}

// Groups backend names under their French language label, sorted A–Z (fr).
export function groupLanguages(ids) {
  const groups = new Map()
  for (const id of ids) {
    const item = describeLanguage(id)
    if (!groups.has(item.language)) groups.set(item.language, [])
    groups.get(item.language).push(item)
  }
  return [...groups.entries()]
    .map(([language, items]) => ({
      language,
      letter: normalizeText(language).charAt(0).toUpperCase(),
      items: items.sort((a, b) =>
        a.variant === STANDARD_VARIANT ? -1 : b.variant === STANDARD_VARIANT ? 1 : a.variant.localeCompare(b.variant, 'fr')),
    }))
    .sort((a, b) => a.language.localeCompare(b.language, 'fr'))
}
