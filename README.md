# Boutique d'art (prototype)

Site vitrine d'une marque d'art abstrait imaginé avec l'IA. Nom provisoire : **Vif**.

## Ce que fait le site

- **Accueil** : une toile en 3D (Three.js) qui se peint coup de pinceau par coup de pinceau, puis pivote pour passer à l'œuvre suivante. Le site prend les couleurs de l'œuvre en cours.
- **Collection** : les 10 œuvres, avec leurs cartels.
- **Fiche œuvre** (`oeuvre.html?id=...`) : la toile accrochée à l'échelle dans une pièce 3D (salon, chambre ou bureau), choix de la taille et prix.
- **Comment c'est fait**, **Aide** (FAQ, livraison, retours), **À propos**.
- Français et anglais (bouton FR / EN en haut à droite).
- Si la 3D n'est pas disponible sur un appareil, le site affiche automatiquement une version 2D.

## Les pages
- `index.html` : accueil avec le manège 3D, le drop des éditions limitées, l'aperçu « chez vous ».
- `collection.html` : toutes les œuvres.
- `oeuvre.html?id=...` : fiche œuvre, avec 3 vues (Photo, 3D, Chez moi), la réalité augmentée et le lien « Composer un mur ».
- `galerie.html` : la galerie virtuelle en 3D.
- `mur.html` : composer un mur de 2 ou 3 œuvres, avec réduction d'ensemble.
- `comment.html`, `faq.html`, `apropos.html` : pages d'information.

## Où modifier quoi

| Je veux changer… | Fichier |
|---|---|
| Le nom de la marque, les prix, l'email, les réseaux | `js/config.js` |
| La réduction des ensembles, les éditions limitées, la date du drop, la liste d'attente | `js/config.js` |
| Quelles œuvres sont en édition limitée (`limited: true`) | `js/data.js` |
| Les œuvres (titres, textes, couleurs, vraies images) | `js/data.js` |
| Les textes courts (boutons, titres) | `js/i18n.js` |
| Les longs textes (FAQ, À propos…) | directement dans les fichiers `.html` |
| Les couleurs générales, polices, mise en page | `css/style.css` |
| L'animation 3D de l'accueil | `js/hero.js` |
| Les pièces (photos, 3D, « Chez moi ») des fiches œuvres | `js/wall.js` |
| La galerie virtuelle | `js/gallery.js` |
| La réalité augmentée | `js/ar.js` |
| La toile qui vole entre les pages | `js/fly.js` |
| Le compte à rebours et la liste d'attente | `js/drop.js` |

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

## Photos des pièces (vue « Photo » des fiches œuvres)
Place 3 photos d'intérieur dans `images/rooms/` : `salon.jpg`, `chambre.jpg`, `bureau.jpg`
(paysage, vue de face, mur vide au centre). Tant qu'une photo manque, la fiche affiche la vue 3D.
Le placement de la toile se règle dans `js/wall.js`, objet `ROOMS` :
- `x`, `y` : centre de la toile dans la photo (0 à 1) ;
- `meter` : largeur d'1 mètre de mur en fraction de la largeur de la photo
  (largeur du canapé en pixels ÷ largeur de la photo ÷ 2,2) ;
- `light` : -1 si la lumière vient de la gauche, 1 si elle vient de la droite.
