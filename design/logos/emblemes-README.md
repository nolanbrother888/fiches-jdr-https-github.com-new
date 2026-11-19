# Emblèmes RPG — SVG animés

Six fichiers SVG autonomes : combat, perso, journal, vue-du-mj, inventaire et carte.

## Utilisation
- Chaque fichier est un SVG vectoriel autonome (viewBox 256 × 256).
- Les animations CSS sont intégrées : léger flottement, respiration de l’anneau et scintillement.
- Les animations respectent `prefers-reduced-motion`.
- Les libellés sont prévus pour être affichés par l’interface, séparément des icônes.

## Intégration
Place les SVG dans les assets de ton application et utilise-les comme images ou composants SVG.
Pour désactiver les animations, supprime le bloc `@keyframes` et les déclarations `animation` dans la balise `<style>`.
Pour modifier les couleurs, change les variables `--accent` et `--deep` dans l’attribut `style` de la balise `<svg>`.

## À demander à Claude
« Intègre ces six SVG comme icônes des onglets COMBAT, PERSO, JOURNAL, VUE DU MJ, INVENTAIRE et CARTE. Conserve les SVG vectoriels. Ajoute un état actif plus lumineux, un état inactif plus discret, et déclenche une animation courte lors du changement d’onglet. Respecte prefers-reduced-motion. »
