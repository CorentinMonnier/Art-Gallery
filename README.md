# Boutique d'art (prototype)

Site vitrine d'une marque d'art abstrait imaginé avec l'IA. Nom provisoire : **Vif**.

## Ce que fait le site

- **Accueil** : une toile en 3D (Three.js) qui se peint coup de pinceau par coup de pinceau, puis pivote pour passer à l'œuvre suivante. Le site prend les couleurs de l'œuvre en cours.
- **Collection** : les 10 œuvres, avec leurs cartels.
- **Fiche œuvre** (`oeuvre.html?id=...`) : la toile accrochée à l'échelle dans une pièce 3D (salon, chambre ou bureau), choix de la taille et prix.
- **Comment c'est fait**, **Aide** (FAQ, livraison, retours), **À propos**.
- Français et anglais (bouton FR / EN en haut à droite).
- Si la 3D n'est pas disponible sur un appareil, le site affiche automatiquement une version 2D.

## Où modifier quoi

| Je veux changer… | Fichier |
|---|---|
| Le nom de la marque, les prix, l'email, les réseaux | `js/config.js` |
| Les œuvres (titres, textes, couleurs, vraies images) | `js/data.js` |
| Les textes courts (boutons, titres) | `js/i18n.js` |
| Les longs textes (FAQ, À propos…) | directement dans les fichiers `.html` |
| Les couleurs générales, polices, mise en page | `css/style.css` |
| L'animation 3D de l'accueil | `js/hero.js` |
| La pièce 3D des fiches œuvres | `js/wall.js` |

### Ajouter tes vraies œuvres
1. Mets l'image dans un dossier `images/` (format portrait 2:3).
2. Dans `js/data.js`, remplis `image: "images/nom-de-l-oeuvre.jpg"`.
Le site l'utilise partout : vignettes, toile 3D, pièce 3D.

## Plus tard : brancher Shopify
Dans `js/config.js`, `shopOpen: false` garde le bouton « Ajouter au panier » inactif.
Chaque œuvre a un champ `shopifyHandle` dans `js/data.js` pour la relier à son produit Shopify.

## Tester sur ton ordinateur
Les pages utilisent des modules JavaScript : il faut un petit serveur local, pas un double-clic sur le fichier.
Dans un terminal, dans ce dossier : `npx serve .` puis ouvre l'adresse affichée.
(Ou simplement : pousse sur GitHub, Vercel met le site en ligne.)
