# 🦷 Mon appareil dentaire — Chloé

Application web mobile pour le suivi quotidien de l'appareil dentaire de Chloé.

---

## Structure des fichiers

```
chloe-dental/
├── index.html          ← Page principale
├── manifest.json       ← Manifest PWA (installation sur mobile)
├── css/
│   └── style.css       ← Tous les styles
├── js/
│   └── app.js          ← Logique de l'application
└── icons/              ← À créer (voir section icônes)
    ├── icon-192.png
    └── icon-512.png
```

---

## Installation sur un hébergement web

1. Copier tous les fichiers sur votre hébergement (FTP, cPanel, Netlify, Verdi…)
2. Ouvrir l'URL sur le téléphone de Chloé
3. Sur iPhone : bouton Partager → « Sur l'écran d'accueil »
4. Sur Android : menu du navigateur → « Ajouter à l'écran d'accueil »

L'app s'installe comme une vraie application mobile, sans passer par un store !

---

## Système de points

| Tranche horaire          | Points / heure |
|--------------------------|---------------|
| Nuit (23h – 7h)          | 2 pts         |
| Matin actif (7h – 12h)   | 3 pts         |
| Déjeuner Chloé (12h–14h) | 0 pt          |
| Après-midi (14h – 19h)   | 3 pts         |
| Dîner Chloé (19h – 21h)  | 0 pt          |
| Soirée (21h – 23h)       | 1 pt          |

**Objectif journalier : 18 points**

---

## Gestion automatique de la cantine scolaire (Zone B)

En période scolaire (lundi au vendredi, hors vacances et jours fériés) :
- La tranche **12h–14h est automatiquement considérée comme "cantine"**
- L'appareil est réputé retiré pendant cette période → 0 point, sans action de Chloé
- Un bandeau s'affiche à l'écran entre 12h et 14h les jours d'école
- La session cantine apparaît en pointillés dans l'historique du jour
- **Si Chloé saisit quand même une session** couvrant 12h–14h (mercredi, vacances…), ses vraies données sont prioritaires sur l'automatisme

### Vacances Zone B intégrées (2025-2026)

| Période           | Du                  | Au                  |
|-------------------|---------------------|---------------------|
| Été 2025          | 5 juillet 2025      | 31 août 2025        |
| Toussaint 2025    | 18 octobre 2025     | 2 novembre 2025     |
| Noël 2025         | 20 décembre 2025    | 4 janvier 2026      |
| Hiver 2026        | 14 février 2026     | 1er mars 2026       |
| Printemps 2026    | 11 avril 2026       | 26 avril 2026       |
| Pont Ascension    | 13 mai 2026         | 17 mai 2026         |
| Été 2026          | 4 juillet 2026      | …                   |

Pour mettre à jour les dates (année suivante), modifier le tableau `schoolHolidaysZoneB` dans `js/app.js`.

---

## Couleurs du calendrier

| Couleur   | Score               |
|-----------|---------------------|
| 🔴 Rouge  | < 35 % de l'objectif |
| 🟠 Orange | 35 – 55 %           |
| 🟡 Jaune  | 55 – 70 %           |
| 🟢 Vert clair | 70 – 85 %       |
| 🟢 Vert   | 85 – 97 %           |
| 🌲 ⭐ Vert foncé | 97 – 100 % (Parfait) |

---

## Icônes (optionnel)

Pour une belle icône sur l'écran d'accueil, créer :
- `icons/icon-192.png` (192×192 px)
- `icons/icon-512.png` (512×512 px)

Suggestion : fond violet `#7F77DD` avec un emoji 🦷.
Outil gratuit : [favicon.io](https://favicon.io/emoji-favicons/tooth)

---

## Données

Tout est stocké **localement** dans le navigateur (localStorage).
Rien n'est envoyé sur Internet. Les données persistent après fermeture.

Pour réinitialiser (réservé aux parents) — console développeur du navigateur :
```javascript
localStorage.removeItem('chloe_dental_v1');
```

---

## Modifier la configuration

Dans `js/app.js`, section `CONFIG` :

```javascript
const CONFIG = {
  dailyGoalPts: 18,              // ← Objectif journalier
  slots: [ ... ],                // ← Tranches horaires et points
  schoolHolidaysZoneB: [ ... ],  // ← Dates de vacances à mettre à jour chaque année
  publicHolidays: [ ... ],       // ← Jours fériés
};
```
