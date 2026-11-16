import type { MediaType } from "@/lib/tmdb";

export interface TakedownEntry {
  mediaType: MediaType;
  /** TMDB id: the number right after /movie/ or /tv/ in the URL. */
  id: number;
  /** For humans reading this file only; it is never matched against. */
  title: string;
}

/**
 * Titles removed after a copyright notice. Add one line per title (a TV show covers all its seasons
 * and episodes). A listed title redirects to the home page everywhere and disappears from every list.
 */
export const TAKEDOWN_LIST: readonly TakedownEntry[] = [
  { mediaType: "movie", id: 1798903, title: "Killsave" },
  { mediaType: "movie", id: 1422041, title: "La bola negra" },
  { mediaType: "movie", id: 791523, title: "Wildwood" },
  { mediaType: "tv", id: 1396, title: "Breaking Bad" },
  { mediaType: "tv", id: 79, title: "Dora the Explorer" },
  { mediaType: "movie", id: 1458099, title: "The Only Living Pickpocket in New York" },
  { mediaType: "movie", id: 842354, title: "Animal" },
  { mediaType: "tv", id: 273207, title: "Neagley" },
  { mediaType: "movie", id: 1596275, title: "Drive - The Pretenders" },
  { mediaType: "movie", id: 1377237, title: "Runner" },
  { mediaType: "movie", id: 1263337, title: "Heart of the Beast" },
  { mediaType: "movie", id: 279, title: "Amadeus" },
  { mediaType: "movie", id: 1117898, title: "The Cat in the Hat" },
  { mediaType: "movie", id: 1400837, title: "Other Mommy" },
  { mediaType: "movie", id: 1402181, title: "Scene" },
  { mediaType: "tv", id: 81723, title: "The Gilded Age" },
  { mediaType: "movie", id: 1286656, title: "I Play Rocky" },
  { mediaType: "tv", id: 258989, title: "The Greatest" },
  { mediaType: "tv", id: 263236, title: "Protection" },
  { mediaType: "movie", id: 1393326, title: "Ghost in the Cell" },
  { mediaType: "movie", id: 843352, title: "Legend of the White Dragon" },
  { mediaType: "movie", id: 1649403, title: "George Michael: The Faith Tour" },
  { mediaType: "movie", id: 1244523, title: "Beware Boiuna" },
  { mediaType: "tv", id: 46648, title: "True Detective" },
  { mediaType: "movie", id: 848791, title: "The Stranger" },
  { mediaType: "movie", id: 142, title: "Brokeback Mountain" },
  { mediaType: "movie", id: 445, title: "Cache" },
  { mediaType: "movie", id: 340676, title: "Personal Shopper" },
  { mediaType: "movie", id: 21484, title: "Possession" },
  { mediaType: "tv", id: 239618, title: "American Hostage" },
  { mediaType: "movie", id: 1400940, title: "Clayface" },
  { mediaType: "movie", id: 1283515, title: "Verity" },
  { mediaType: "movie", id: 1165369, title: "La Bataille De Gaulle - Partie 2" },
  { mediaType: "tv", id: 259909, title: "Dexter: Resurrection" },
  { mediaType: "movie", id: 1159559, title: "Scream 7" },
  { mediaType: "movie", id: 1300968, title: "The Hunger Games: Sunrise on the Reaping" },
  { mediaType: "movie", id: 1288445, title: "Mutiny" },
  { mediaType: "movie", id: 1813355, title: "A Story of Derry" },
  { mediaType: "movie", id: 1433842, title: "Relationship Goals" },
  { mediaType: "movie", id: 530385, title: "Midsommar" },
  { mediaType: "movie", id: 852247, title: "Problemista" },
  { mediaType: "tv", id: 94954, title: "Hazbin Hotel" },
  { mediaType: "tv", id: 241882, title: "Ride or Die" },
  { mediaType: "movie", id: 264273, title: "Broken" },
  { mediaType: "movie", id: 828947, title: "Beavis and Butt-Head Do the Universe" },
  { mediaType: "tv", id: 256711, title: "The Rainmaker" },
  { mediaType: "movie", id: 1228834, title: "The Fix" },
  { mediaType: "movie", id: 445466, title: "Idiots" },
  { mediaType: "movie", id: 1038392, title: "The Conjuring: Last Rites" },
  { mediaType: "tv", id: 96237, title: "White House Plumbers" },
  { mediaType: "movie", id: 1101383, title: "The End of Oak Street" },
  { mediaType: "movie", id: 1425014, title: "Cypress Hill & London Symphony Orchestra: Black Sunday Live" },
  { mediaType: "movie", id: 1153576, title: "Street Fighter" },
  { mediaType: "tv", id: 254420, title: "Elle" },
  { mediaType: "tv", id: 273240, title: "Off Campus" },
  { mediaType: "tv", id: 289892, title: "Helluva Boss" },
  { mediaType: "tv", id: 84773, title: "The Lord of the Rings: The Rings of Power" },
  { mediaType: "movie", id: 323929, title: "Krisha" },
  { mediaType: "movie", id: 323929, title: "Krisha" },
  { mediaType: "movie", id: 1813355, title: "a story of derry" },
];
