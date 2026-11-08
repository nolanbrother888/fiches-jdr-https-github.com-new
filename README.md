# Fiches JDR

Appli Android de fiches de personnages partagées pour notre table de JDR (D&D 5e + règles maison).
Construite avec Capacitor, données partagées dans Firebase (Firestore + Authentication).

## Télécharger l'appli
Dernière version : onglet **Releases** du dépôt, fichier `fiches-jdr.apk`.

## Mettre à jour
Chaque modification envoyée sur `main` reconstruit l'APK automatiquement (onglet **Actions**).
Installer la nouvelle version par-dessus l'ancienne : les données restent dans Firebase.

## Configuration Firebase
- `src/firebase-config.js` : bloc `firebaseConfig` du projet.
- `firestore.rules` : à coller dans Firestore > Règles.
- Document `config/acces` avec un champ `code` (texte) : code à donner aux joueurs pour rejoindre le groupe.
