// ─────────────────────────────────────────────────────────────
// Le catalogue des œuvres.
//
// Pour l'instant, les œuvres sont dessinées par le code (à partir
// de leurs couleurs et d'un "seed"). Quand tu auras tes vraies
// images, mets le fichier dans le dossier /images et remplis le
// champ `image`, par exemple : image: "images/soleil-de-minuit.jpg"
// (format portrait 2:3 conseillé, au moins 2400 × 3600 px).
//
// `shopifyHandle` servira à relier chaque œuvre à son produit Shopify.
// ─────────────────────────────────────────────────────────────

export const ARTWORKS = [
  {
    id: "soleil-de-minuit",
    seed: 1043,
    title: { fr: "Soleil de minuit", en: "Midnight Sun" },
    text: {
      fr: "Un soleil qui refuse de se coucher, des formes qui dansent sur un ciel indigo. Pour un salon qui reste vivant tard le soir.",
      en: "A sun that refuses to set, shapes dancing across an indigo sky. For a living room that stays alive late into the night.",
    },
    ground: "#1B1446",
    colors: ["#FF5A36", "#FFC93C", "#FF8FC7", "#3DDC97", "#F4EDE4"],
    image: null,
    shopifyHandle: null,
  },
  {
    id: "fievre-tropicale",
    seed: 2207,
    title: { fr: "Fièvre tropicale", en: "Tropical Fever" },
    text: {
      fr: "Jaune soleil, rose vif et vert jungle : une bouffée de chaleur, même en plein mois de janvier.",
      en: "Sunny yellow, hot pink and jungle green: a wave of heat, even in the middle of January.",
    },
    ground: "#FFE45E",
    colors: ["#FF3E7F", "#1A936F", "#2D1E8F", "#FF8A00", "#7FDBFF"],
    image: null,
    shopifyHandle: null,
  },
  {
    id: "le-grand-saut",
    seed: 3391,
    title: { fr: "Le grand saut", en: "The Big Leap" },
    text: {
      fr: "Des primaires franches qui s'élancent dans le vide. Une œuvre pour les débuts et les décisions courageuses.",
      en: "Bold primaries leaping into the void. A piece for new beginnings and brave decisions.",
    },
    ground: "#EAF2FF",
    colors: ["#0047FF", "#FF2E2E", "#FFD000", "#111111", "#FF9EC4"],
    image: null,
    shopifyHandle: null,
  },
  {
    id: "maree-haute",
    seed: 4127,
    title: { fr: "Marée haute", en: "High Tide" },
    text: {
      fr: "Le bleu profond de la mer, éclairé d'ocre et de corail. Calme en surface, puissant en dessous.",
      en: "The deep blue of the sea, lit with ochre and coral. Calm on the surface, powerful beneath.",
    },
    ground: "#0E5E6F",
    colors: ["#F2C14E", "#F78154", "#B4E1D2", "#FAF3DD", "#4D9078"],
    image: null,
    shopifyHandle: null,
  },
  {
    id: "confettis-lents",
    seed: 5581,
    title: { fr: "Confettis lents", en: "Slow Confetti" },
    text: {
      fr: "Une fête qui retombe au ralenti sur un fond rose poudré. Joyeux sans être bruyant.",
      en: "A party falling back down in slow motion over a powder-pink ground. Joyful without being loud.",
    },
    ground: "#FFD6E8",
    colors: ["#7B2CBF", "#FF6F00", "#00A6A6", "#FFC300", "#C9184A"],
    image: null,
    shopifyHandle: null,
  },
  {
    id: "jardin-electrique",
    seed: 6619,
    title: { fr: "Jardin électrique", en: "Electric Garden" },
    text: {
      fr: "Un jardin la nuit, quand les plantes s'allument. Vert sapin, citron fluo et rose néon.",
      en: "A garden at night, when the plants light up. Forest green, neon lime and electric pink.",
    },
    ground: "#0B3D2E",
    colors: ["#C6FF00", "#FF4FD8", "#FF8C42", "#7AE7FF", "#FFF4D6"],
    image: null,
    shopifyHandle: null,
  },
  {
    id: "apres-l-orage",
    seed: 7753,
    title: { fr: "Après l'orage", en: "After the Storm" },
    text: {
      fr: "Le ciel gris-bleu se déchire et la lumière revient. Une palette douce, traversée d'éclats chauds.",
      en: "The blue-grey sky breaks open and the light returns. A soft palette crossed by warm flashes.",
    },
    ground: "#8EA8C3",
    colors: ["#23395B", "#FFB703", "#F25C54", "#EDF2F4", "#161925"],
    image: null,
    shopifyHandle: null,
  },
  {
    id: "neon-des-alpes",
    seed: 8861,
    title: { fr: "Néon des Alpes", en: "Alpine Neon" },
    text: {
      fr: "La montagne la nuit, vue à travers des lunettes de ski fluo. Violet, turquoise et jaune acide.",
      en: "The mountains at night, seen through neon ski goggles. Violet, turquoise and acid yellow.",
    },
    ground: "#2B0A3D",
    colors: ["#00F5D4", "#F15BB5", "#FEE440", "#9B5DE5", "#FFFFFF"],
    image: null,
    shopifyHandle: null,
  },
  {
    id: "cafe-noir-rose-vif",
    seed: 9973,
    title: { fr: "Café noir, rose vif", en: "Black Coffee, Hot Pink" },
    text: {
      fr: "Un fond expresso, des touches crème et un rose qui réveille. Parfait au-dessus d'un bureau.",
      en: "An espresso ground, touches of cream and a pink that wakes you up. Perfect above a desk.",
    },
    ground: "#1E1612",
    colors: ["#FF2D87", "#F3E3D3", "#C08552", "#FF7A59", "#3A86FF"],
    image: null,
    shopifyHandle: null,
  },
  {
    id: "dimanche-infini",
    seed: 1117,
    title: { fr: "Dimanche infini", en: "Endless Sunday" },
    text: {
      fr: "Orange abricot, indigo et vert menthe. La sensation d'un dimanche qui ne finit jamais.",
      en: "Apricot orange, indigo and mint green. The feeling of a Sunday that never ends.",
    },
    ground: "#FF7A3D",
    colors: ["#FFF1D0", "#3A0CA3", "#06D6A0", "#FFD23F", "#EF476F"],
    image: null,
    shopifyHandle: null,
  },
];

export function getArtwork(id) {
  return ARTWORKS.find((a) => a.id === id) || null;
}
