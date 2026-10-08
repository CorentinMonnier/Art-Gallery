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

  // Remplace "#" par l'adresse de tes comptes quand ils existent.
  socials: {
    instagram: "#",
    tiktok: "#",
    youtube: "#",
  },
};
