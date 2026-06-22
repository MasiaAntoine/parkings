# Parking — partage de places entre voisins

**Parking** est une webapp mobile-first qui permet aux résidents d'un même parking partagé de déclarer quand leur place est libre, de voir en un coup d'œil les places disponibles, et de signaler temporairement qu'ils s'y sont garés — le tout sans compte, avec un simple code d'accès commun.

L'objectif est le bon voisinage : partager les places de parking dans la résidence sans collecter de données sensibles.

---

## Contexte et périmètre


| Question                          | Décision                                                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Une ou plusieurs résidences ?     | **Une seule instance** — tous les immeubles partagent le même parking et le **même code à 6 chiffres** (dans `.env`) |
| Quelles données sont collectées ? | Numéro de place (3 chiffres max) + numéro d'appartement (format libre) + téléphone optionnel (chiffré)                 |
| Le numéro d'appartement est-il affiché ? | **Non, jamais** — il sert uniquement à confirmer l'accès à une place (voir section dédiée)                    |
| Nom de l'app                      | **Parking**                                                                                                          |
| Langue                            | Français                                                                                                             |
| Fuseau horaire                    | Europe/Paris, format 24 h                                                                                            |


---

## Règles métier

### Places de parking


| Question                                                            | Décision                                                                                                   |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Que signifie le numéro saisi au premier passage ?                   | C'est **sa place attitrée** — la personne en devient le référent                                           |
| Peut-on changer de numéro ?                                         | **Oui**, depuis l'écran « Ma place », tant que le nouveau numéro n'est pas déjà pris par quelqu'un d'autre |
| Les places jamais enregistrées existent-elles dans l'app ?          | **Non** — une place n'apparaît que si quelqu'un l'a enregistrée                                            |
| Que se passe-t-il si je saisis un numéro déjà enregistré ?          | Je suis considéré comme le référent de cette place ; l'app demande mon **numéro d'appartement pour confirmer** |
| Et si le numéro d'appartement ne correspond pas ?                   | **Accès refusé** — le numéro doit correspondre à celui enregistré (comparaison insensible à la casse)          |
| Peut-on modifier les horaires récurrents après la première config ? | **Oui**, à tout moment depuis l'onglet **Horaires**                                                        |


### Numéro d'appartement — confirmation d'authentification uniquement

Le numéro d'appartement n'est **pas** une donnée d'affichage. C'est un **second facteur d'accès** à une place, comparable au code à 6 chiffres pour l'app entière.

**Format** : libre (ex. `A01`, `B12`, `3G`) — pas de contrainte de format imposée côté app, seule une longueur max (30 caractères). La comparaison est insensible à la casse (`a01` = `A01`).

**Quand il est demandé** (écran de saisie uniquement, jamais en lecture) :

- Première inscription d'une place
- Reconnexion à une place déjà enregistrée (confirmation d'identité)

**Où il n'apparaît jamais** :

- Accueil (liste des places)
- Écran « Ma place »
- Actions « je suis garé » / « je ne suis plus garé »
- Messages système (ex. : « Le propriétaire de la place 042 est de retour » — jamais de numéro d'appartement)
- Réponses serveur consommées par le front

**Ce que l'utilisateur voit partout** : numéro de place + statut (+ téléphone du propriétaire si place libre, ou message d'occupation si place prise).

**Stockage** : hashé en base, mémorisé en localStorage pour la session — traité comme un secret d'accès, jamais réaffiché après saisie.

### Disponibilité d'une place


| Question                                  | Décision                                                                                       |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Quand une place est-elle « disponible » ? | Dans sa **plage horaire** (ou en mode déplacement) **ET** personne n'a cliqué « je suis garé » |
| Que voit-on sur l'accueil ?               | **Toutes les places enregistrées** avec leur statut                                            |


**Statuts possibles** :

- **Disponible** — dans la plage horaire ou en déplacement, et personne n'est garé
- **Occupée** — quelqu'un a cliqué « je suis garé »
- **Hors plage** — hors horaires habituels et hors période de déplacement

### Déplacement (« je pars en déplacement »)


| Question                                              | Décision                                                                                                                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Comment la place devient-elle disponible ?            | **24 h/24** sur la période déclarée                                                                                                                         |
| Précision des horaires                                | Premier jour : disponible à partir de l'**heure de départ** ; jour de retour : disponible jusqu'à l'**heure de retour**                                     |
| Combien de déplacements simultanés ?                  | **Plusieurs** — on peut planifier autant de déplacements futurs que nécessaire, chacun modifiable ou annulable indépendamment                              |
| Peut-on modifier un déplacement existant ?            | **Oui** — depuis l'onglet **Déplacement**, bouton « Modifier » sur chaque absence à venir                                                               |
| Peut-on annuler un déplacement avant la date prévue ? | **Oui** — la place redevient indisponible selon ses règles habituelles                                                                                      |
| Que deviennent les déplacements passés ?              | **Nettoyés automatiquement** à chaque ouverture de l'accueil (les `return_at < now()` sont marqués comme annulés)                                            |
| Et si quelqu'un est garé lors de l'annulation ?       | Un **bandeau visible** l'informe : « Le propriétaire de la place XXX est de retour » (sans numéro d'appartement), dismissible, visible 24 h ou jusqu'à fermeture manuelle |


### Téléphone

| Question                                      | Décision                                                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Obligatoire à l'inscription ?                 | **Non** — facultatif à l'onboarding et modifiable dans « Ma place »                                           |
| Obligatoire pour se garer ?                   | **Oui** — saisi dans la modale « Je me gare ici », chiffré en base                                            |
| Visible par qui (place libre) ?               | Tous les voisins authentifiés — pour contacter le propriétaire                                                  |
| Visible par qui (place occupée) ?             | **Uniquement le propriétaire** de la place — voit le numéro de la personne garée (`parked_contact_phone`)      |
| Stockage                                      | Chiffrement AES-256-GCM côté serveur (`phone_encrypted`)                                                      |

### Occupation (« je suis garé »)


| Question                                    | Décision                                                                          |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| Qui peut se garer sur une place ?           | **Toute personne authentifiée**, sur n'importe quelle place disponible            |
| Limite de places par personne ?             | **Aucune** — on peut être garé sur plusieurs places en même temps                 |
| Qui peut cliquer « je ne suis plus garé » ? | **N'importe qui** authentifié, sur n'importe quelle place                         |
| Oubli de libérer la place ?                 | **Pas de libération automatique** — action manuelle (ou intervention d'un voisin) |
| Deux personnes veulent la même place ?      | **Premier clic gagne** — pas de file d'attente                                    |


### Authentification et session


| Question                     | Décision                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Type de compte               | **Aucun** — pas de mot de passe, pas d'email, pas de compte utilisateur                                                   |
| Code d'accès                 | **6 chiffres** dans `.env`, saisi une fois, mémorisé **7 jours** en localStorage                                          |
| Que mémorise le navigateur ? | Date d'expiration du code + **numéro de place + numéro d'appartement** (session courante) + **`saved_profiles[]`** (numéro + appartement par profil connecté sur cet appareil) + préférence notifications |
| Multi-profils                | Plusieurs places peuvent être enregistrées sur le même appareil ; **switch instantané** si l'appartement est déjà mémorisé, sinon re-saisie de l'appartement |
| Diffusion du code            | Un bandeau d'avertissement rappelle à la connexion de **ne pas divulguer le code** d'accès commun                          |
| Protection brute force       | **5 tentatives** de code incorrectes par IP / **15 minutes**                                                              |


---

## Parcours utilisateur

```
Ouverture app
  → Code valide en local ?
      Non → Saisie code 6 chiffres (+ bandeau "Ne pas divulguer")
  → Place + appartement en local ?
      Oui → Accueil
      Non → Saisie numéro de place (3 chiffres)
          → Bouton de reconnexion rapide pour chaque profil déjà connecté
          → Place en base ?
              Non → Appartement → Téléphone (optionnel) → Config horaires → Intro déplacement → Notifications → Accueil
              Oui → Appartement pour confirmer
                  → Correspond ?
                      Non → Erreur, accès refusé
                      Oui → Horaires configurés ?
                          Non → Config horaires (avec rappel "horaires d'absence") → Intro déplacement → Notifications → Accueil
                          Oui → Accueil

Accueil → Filtrer (date/heure) / Voir détail d'une place / Garer (confirmation + téléphone) / Libérer / Onglets bas
Onglets bas → Accueil · Ma place · Horaires · Déplacement
Ma place → Statut / Téléphone / Notifications (activer ou désactiver) / Changer de numéro / Supprimer ma place
Déplacement → Liste des absences (ajouter / modifier / annuler) — déplacements liés si plusieurs places sur le même appareil
Bouton profil (header) → Déconnexion · Switch profil · Ajouter une place
```

### Écrans

1. **Connexion** — code 6 chiffres + avertissement de non-divulgation
2. **Onboarding place** — 3 champs chiffre par chiffre + raccourcis de reconnexion pour les profils déjà utilisés
3. **Onboarding appartement** — saisie ou confirmation si place existante (format libre, ex. A01)
4. **Onboarding téléphone** — facultatif, format français 10 chiffres, chiffré en base, visible par les voisins **lorsque la place est libre**
5. **Configuration horaires** — jours de la semaine + plages début/fin (inputs **toujours visibles**, grisés si jour décoché) ; possibilité d'**appliquer sur plusieurs places** si multi-profils
6. **Onboarding déplacement** — écran d'explication du concept (by-pass des horaires)
7. **Onboarding notifications** — proposition d'activer les alertes « retour anticipé »
8. **Accueil** — barre de filtre date/heure, **toutes les places enregistrées** (y compris hors plage, atténuées visuellement), cartes cliquables, dialog de confirmation avant de se garer, bandeaux d'alerte, **skeletons** de chargement
9. **Détail d'une place** — plages horaires détaillées par jour + déplacements à venir + téléphone
10. **Ma place** — statut, téléphone, **toggle notifications**, changement de numéro, **suppression définitive de la place**
11. **Déplacement** — liste des absences à venir (modifier/annuler), formulaire départ/retour ; déplacements **liés** si créés sur plusieurs places en une fois
12. **Téléphone** — modification ou suppression du numéro

---

## Données et modèle conceptuel

Aucune donnée confidentielle n'est demandée : le numéro d'appartement seul et le numéro de place ne constituent pas des données personnelles au sens RGPD, et le numéro d'appartement n'est jamais affiché.

```
spots
  id, number (001–999, unique), apartment_hash, phone_encrypted (optionnel), created_at

spot_schedules
  spot_id, day_of_week (0=lundi … 6=dimanche), start_time, end_time

spot_trips
  spot_id, depart_at, return_at, cancelled_at, link_group (UUID, optionnel)
  (plusieurs déplacements à venir possibles par place ; link_group synchronise modifier/annuler entre places liées)

active_parkings
  spot_id, parked_at, parked_by_spot_number, phone_encrypted
  (occupation anonyme — pas de numéro d'appartement ; téléphone du stationné visible par le propriétaire uniquement)

spot_alerts
  spot_id, message, created_at, dismissed_at

auth_attempts
  ip_address, attempted_at, success

localStorage (côté client)
  auth_expires_at         — expiration du code (7 jours)
  spot_number             — place de la session courante
  apartment               — secret, jamais affiché, effacé à la déconnexion
  saved_profiles[]        — { number, apartment } par profil connecté sur cet appareil
                          → reconnexion rapide et switch de profil
  notifications_enabled   — préférence utilisateur pour les alertes navigateur
  known_alert_ids[]       — ids déjà vus (évite les doublons de notification)
```

---

## Stack et structure du projet


| Composant        | Technologie                                          |
| ---------------- | ---------------------------------------------------- |
| Back             | PHP 8+ (services modulaires)                         |
| Base de données  | MySQL 8                                              |
| Front            | JavaScript vanilla, HTML, Tailwind CSS (CDN)         |
| PWA              | Service Worker (`sw.js`) + manifest                  |
| Conteneurisation | Docker (nginx + php-fpm + MySQL)                     |
| Design           | **Mobile-first**                                     |
| Architecture     | Monolithe — front JS modulaire et back PHP dans le même repo |


```
parking/
├── public/                    # Document root (nginx)
│   ├── index.php              # Shell HTML + chargement des scripts
│   ├── action.php             # API JSON (point d'entrée unique)
│   ├── bootstrap.php          # Résolution du chemin includes/
│   ├── sw.js                  # Service Worker (cache assets)
│   └── js/
│       ├── app.js             # Router + init (~140 lignes)
│       ├── backend.js         # Client API → action.php
│       ├── storage.js         # Session localStorage (7 jours)
│       ├── notifications.js   # API Notification + polling alertes
│       ├── core/              # config, state, utils, phone-ui, profile-manager
│       ├── components/        # toast, shell, tabbar, dialogs, filter-bar, …
│       └── screens/           # un fichier par écran (code, home, my-spot, …)
├── includes/
│   ├── config.php             # Env + autoload des services
│   ├── SpotService.php        # Façade API (délègue aux services)
│   ├── AuthService.php
│   ├── Database.php
│   ├── helpers/               # http, crypto, datetime, validation, status, presentation
│   └── services/              # SpotRepository, Schedule, Trip, Parking, Alert, SpotPresenter
├── database/
│   ├── schema.sql
│   └── migrations/            # 001_link_group, 002_parking_phone, …
└── docker/                    # nginx + PHP-FPM
```

**Backend** — `SpotService` expose l'API publique ; la logique est découpée en services spécialisés (`SpotRepository`, `TripService`, `ParkingService`, etc.). `action.php` route les requêtes via un `match` sur le paramètre `action`.

**Frontend** — scripts chargés dans l'ordre des dépendances depuis `index.php` (version cache-busting unifiée). Pas de bundler : chaque module est un fichier `<script>` global. `app.js` dispatch vers les `render*Screen()` selon `state.screen`.

**Migrations** — Docker n'applique `schema.sql` qu'au **premier** démarrage (volume vierge). Pour une base existante, appliquer manuellement les fichiers dans `database/migrations/`.

---

## Démarrage

**Docker (dev local)** — utilise `.env.docker.dev` (versionné) :

```bash
docker compose up -d --build
```

**Prod / Hostinger** — structure dans `public_html/` :

```
public_html/
  .env                 ← privé (DB Hostinger, ACCESS_CODE, ENCRYPTION_KEY)
  includes/            ← obligatoire (protégé par .htaccess)
  index.php            ← depuis public/
  action.php           ← depuis public/
  bootstrap.php        ← depuis public/
  js/, logo.svg, …     ← reste de public/
```

Importez `database/schema.sql` via phpMyAdmin (ou laissez Docker l'initialiser au premier démarrage). Pour une base **déjà existante**, appliquez les fichiers de `database/migrations/` dans l'ordre. Test : `GET /action.php?action=health` doit renvoyer `{"ok":true}`.

Copiez le template d'environnement :

```bash
cp .env.docker.dev .env
# éditez .env : DB_HOST=srvXXX.hstgr.io, identifiants MySQL Hostinger, etc.
```

Ouvrir [http://localhost:8080](http://localhost:8080)

Le code d'accès dev est `364728` (modifiable via `ACCESS_CODE` dans `.env.docker.dev` ou `.env`).

---

## Fonctionnalités étendues (post-MVP)

Au-delà du MVP, l'app a été enrichie avec les fonctionnalités suivantes, regroupées par thème.

### Recherche et navigation

| Fonctionnalité                            | Description                                                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Filtre par date/heure** sur l'accueil   | Barre de recherche en haut de la liste qui recalcule les statuts à la date/heure choisie ("quelles places seront dispo samedi 14h ?") |
| **Détail d'une place au clic**            | Chaque carte ouvre un écran avec ses **plages horaires détaillées** (jour par jour) et tous ses **déplacements à venir**             |
| **Barre d'onglets en bas**                | 4 onglets : `Accueil` · `Ma place` · `Horaires` · `Déplacement`                                                                    |
| **Bouton profil en haut à droite**        | Affiche le numéro de place courant ; sous-menu **Déconnexion**, **switch profil**, **Ajouter une place**                              |

### Stationnement et déplacements

| Fonctionnalité                                | Description                                                                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Dialog de confirmation « Je me gare ici »** | Modale rappelant la disponibilité + **saisie obligatoire du téléphone** (visible par le propriétaire uniquement)                   |
| **Plusieurs déplacements par place**          | Autant de déplacements futurs que nécessaire — listés dans l'onglet **Déplacement**                                                  |
| **Déplacements liés (multi-places)**          | Si plusieurs places sont connectées sur le même appareil, création/modification/annulation synchronisée via `link_group`             |
| **Modifier un déplacement**                   | Bouton « Modifier » sur chaque déplacement à venir, pré-remplit le formulaire                                                        |
| **Annuler un déplacement précis**             | Annulation indépendante de chaque déplacement (au lieu d'une annulation globale)                                                     |
| **Appliquer horaires / déplacements**         | Cases à cocher pour appliquer la même config sur plusieurs places possédées sur l'appareil                                           |
| **Nettoyage automatique**                     | À chaque chargement de l'accueil, les déplacements dont `return_at` est dépassé sont marqués `cancelled` côté serveur                |
| **Suppression définitive de la place**        | Bouton rouge dans « Ma place » + confirmation native ; supprime la place et toutes ses données associées (horaires, déplacements, parking actif, alertes) |

### Onboarding enrichi

| Fonctionnalité                              | Description                                                                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Étape « concept de déplacement »**        | Après la config des horaires, écran explicatif : « Un déplacement by-passe vos plages habituelles, votre place est libre 24h/24 »          |
| **Étape notifications**                     | Proposition d'activer les alertes navigateur « retour anticipé »                                                                             |
| **Horaires toujours affichés**              | Dans la config, les heures début/fin restent visibles même quand un jour est décoché (grisées et désactivées) — plus lisible pour comparer |
| **Re-onboarding horaires**                  | À la reconnexion d'une place existante **sans horaires**, l'app redirige vers l'écran d'horaires avec un message : « Ces horaires correspondent à vos absences habituelles (ex. travail). Ils permettent à vos voisins de savoir quand votre place est disponible. » |
| **Message de non-divulgation du code**      | Bandeau d'avertissement sur l'écran de saisie du code commun                                                                               |

### Multi-profils (sans risque pour l'appartement)

| Fonctionnalité                          | Description                                                                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mémorisation des profils**            | À chaque connexion réussie, `{ number, apartment }` rejoint `saved_profiles[]` (appartement **jamais affiché**, utilisé pour le switch)   |
| **Reconnexion rapide**                  | Boutons sur l'écran de saisie du numéro de place ; **connexion instantanée** si l'appartement est déjà mémorisé                          |
| **Switch de profil**                    | Menu profil (header) : bascule vers une autre place ; re-saisie de l'appartement si inconnu sur cet appareil                               |
| **Ajouter une place**                   | Depuis le menu profil, enregistrer une place supplémentaire sans perdre le profil courant                                                  |
| **Déconnexion partielle**               | Efface l'auth + la session courante, **conserve** `saved_profiles[]`                                                                       |

### Notifications et UX

| Fonctionnalité                         | Description                                                                                                                       |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Notifications navigateur**           | Alertes « retour anticipé » via l'API Notification + Service Worker ; polling toutes les 60 s tant que l'app est ouverte (pas de push serveur) |
| **Toggle dans « Ma place »**           | Carte affichant l'état (activées / désactivées / bloquées) avec bouton **Activer** ou **Désactiver**                              |
| **Toasts contextuels**                 | Retours visuels vert (succès), rouge (erreur), ambre (avertissement), bleu (info) — plus de tout-en-rouge                       |
| **Skeletons de chargement**            | Cartes animées (`animate-pulse`) sur l'accueil et « Ma place » pendant les requêtes initiales                                     |
| **Animations de chargement boutons**   | Tous les boutons d'action async (park, save, delete, trip…) affichent un spinner et sont désactivés pendant l'appel API           |

---

## Choix volontairement simples (hors scope)

- Pas de file d'attente ni de réservation à l'avance
- Pas de compte administrateur
- Pas d'historique des occupations
- Pas de push serveur (notifications uniquement quand l'app ou le SW est actif)

