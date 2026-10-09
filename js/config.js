// ─────────────────────────────────────────────────────────────
// Réglages généraux de la boutique.
// C'est ici que tu changes le nom de la marque, les prix, l'email
// et les liens vers tes réseaux. Tout le site se met à jour seul.
// ─────────────────────────────────────────────────────────────

export const CONFIG = {
  // Nom provisoire de la marque (à remplacer quand tu l'auras choisi)
  brand: "Vif",

  currency: "CHF",

  // Formats de toile proposés (cm) et prix provisoires.
  // Vérifie les coûts réels chez Gelato avant de fixer les prix définitifs.
  formats: [
    { id: "30x40", w: 30, h: 40, price: 59 },
    { id: "40x60", w: 40, h: 60, price: 89 },
    { id: "60x90", w: 60, h: 90, price: 149 },
  ],

  // Tant que c'est false, le bouton « Ajouter au panier » reste inactif.
  // On le passera à true quand Shopify sera branché.
  shopOpen: false,

  email: "contact@exemple.ch",

  // Composer son mur : réduction selon le nombre d'œuvres de l'ensemble.
  sets: { 2: 0.10, 3: 0.15 },

  // Éditions limitées : nombre d'exemplaires numérotés et supplément de prix (CHF).
  // Les œuvres concernées ont `limited: true` dans data.js.
  limited: { edition: 50, surcharge: 40 },

  // Le drop : date de sortie des éditions limitées (heure de Suisse).
  drop: { date: "2026-11-01T18:00:00+01:00" },

  // Liste d'attente : adresse du service d'emailing qui recevra les inscriptions
  // (Shopify Email, Mailchimp, Formspree…). Tant que c'est null, le formulaire
  // explique que l'inscription ouvrira avec la boutique.
  waitlistEndpoint: null,

  // Remplace "#" par l'adresse de tes comptes quand ils existent.
  socials: {
    instagram: "#",
    tiktok: "#",
    youtube: "#",
  },
};
