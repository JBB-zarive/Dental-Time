[README.md](https://github.com/user-attachments/files/28926514/README.md)
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

1. Copier tous les fichiers sur votre hébergement (FTP, cPanel, Netlify, Vercel…)
2. Ouvrir l'URL sur le téléphone de Chloé
3. Sur iPhone : bouton Partager → « Sur l'écran d'accueil »
4. Sur Android : menu du navigateur → « Ajouter à l'écran d'accueil »

L'app s'installe comme une vraie application mobile, sans passer par un store !

---

## Système de points

| Tranche horaire         | Points / heure |
|-------------------------|---------------|
| Nuit (23h – 7h)         | 2 pts         |
| Matin actif (7h – 12h)  | 3 pts         |
| Déjeuner (12h – 14h)    | 0 pt          |
| Après-midi (14h – 19h)  | 3 pts         |
| Dîner Chloé (19h – 21h) | 0 pt          |
| Soirée (21h – 23h)      | 1 pt          |

**Objectif journalier : 18 points**

### Couleurs du calendrier
- 🔴 < 35 % de l'objectif
- 🟠 35 – 55 %
- 🟡 55 – 70 %
- 🟢 clair : 70 – 85 %
- 🟢 : 85 – 97 %
- 🌲 ⭐ Parfait : 97 – 100 %

---

## Icônes (optionnel)

Pour que l'app ait une belle icône sur l'écran d'accueil, créer deux images PNG :
- `icons/icon-192.png` (192×192 px)
- `icons/icon-512.png` (512×512 px)

Suggestion : fond violet `#7F77DD` avec un emoji 🦷 centré.  
Outil gratuit : [favicon.io](https://favicon.io/emoji-favicons/tooth)

---

## Données

Toutes les données sont stockées **localement** dans le navigateur (localStorage).  
Rien n'est envoyé sur Internet. Les données persistent même après fermeture du navigateur.

Pour réinitialiser (réservé aux parents) : vider le cache du navigateur, ou dans la console développeur :
```javascript
localStorage.removeItem('chloe_dental_v1');
```

---

## Modifier la configuration

Dans `js/app.js`, les premières lignes contiennent la configuration :

```javascript
const CONFIG = {
  storageKey:   'chloe_dental_v1',
  dailyGoalPts: 18,       // ← Objectif journalier en points
  slots: [ ... ]          // ← Tranches horaires et leurs points
};
```
