# Parking — partage de places entre voisins

**Parking** est une webapp mobile-first qui permet aux résidents d'un même parking partagé de déclarer quand leur place est libre, de voir en un coup d'œil les places disponibles, et de signaler temporairement qu'ils s'y sont garés — le tout sans compte, avec un simple code d'accès commun.

L'objectif est le bon voisinage : partager les places de parking dans la résidence sans collecter de données sensibles.

---

## Contexte et périmètre


| Question                          | Décision                                                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Une ou plusieurs résidences ?     | **Une seule instance** — tous les immeubles partagent le même parking et le **même code à 6 chiffres** (dans `.env`) |
| Quelles données sont collectées ? | Numéro de place (3 chiffres max) + numéro d'appartement (format libre)                                               |
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
| Peut-on modifier les horaires récurrents après la première config ? | **Oui**, à tout moment depuis « Ma place »                                                                 |


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

**Ce que l'utilisateur voit partout** : numéro de place + statut uniquement.

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
| Peut-on modifier un déplacement existant ?            | **Oui** — depuis « Ma place », bouton « Modifier » sur chaque déplacement à venir                                                                            |
| Peut-on annuler un déplacement avant la date prévue ? | **Oui** — la place redevient indisponible selon ses règles habituelles                                                                                      |
| Que deviennent les déplacements passés ?              | **Nettoyés automatiquement** à chaque ouverture de l'accueil (les `return_at < now()` sont marqués comme annulés)                                            |
| Et si quelqu'un est garé lors de l'annulation ?       | Un **bandeau visible** l'informe : « Le propriétaire de la place XXX est de retour » (sans numéro d'appartement), dismissible, visible 24 h ou jusqu'à fermeture manuelle |


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
| Que mémorise le navigateur ? | Date d'expiration du code + **numéro de place + numéro d'appartement** (session courante) + **liste des numéros de place déjà utilisés** (`saved_profiles`, sans appartement) |
| Multi-profils                | À la déconnexion, l'appartement est effacé mais les **numéros de place déjà connectés** restent en mémoire pour proposer une **reconnexion rapide** (l'appartement reste à ressaisir) |
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
              Non → Appartement → Téléphone (optionnel) → Config horaires → Intro déplacement → Accueil
              Oui → Appartement pour confirmer
                  → Correspond ?
                      Non → Erreur, accès refusé
                      Oui → Horaires configurés ?
                          Non → Config horaires (avec rappel "horaires d'absence") → Intro déplacement → Accueil
                          Oui → Accueil

Accueil → Filtrer (date/heure) / Voir détail d'une place / Garer (avec confirmation) / Libérer / Onglets bas
Onglets bas → Ma place · Horaires · Déplacement
Ma place → Liste déplacements (ajouter/modifier/annuler chacun) / Horaires / Téléphone / Changer de numéro / Supprimer ma place
Bouton profil (header) → Déconnexion · Switch vers un autre profil enregistré
```

### Écrans

1. **Connexion** — code 6 chiffres + avertissement de non-divulgation
2. **Onboarding place** — 3 champs chiffre par chiffre + raccourcis de reconnexion pour les profils déjà utilisés
3. **Onboarding appartement** — saisie ou confirmation si place existante (format libre, ex. A01)
4. **Onboarding téléphone** — facultatif, format français 10 chiffres, chiffré en base, visible par tous
5. **Configuration horaires** — jours de la semaine + plages début/fin (inputs **toujours visibles**, grisés si jour décoché)
6. **Onboarding déplacement** — écran d'explication du concept (by-pass des horaires)
7. **Accueil** — barre de filtre date/heure, places visibles (les *hors plage* masquées par défaut), cartes cliquables, dialog de confirmation avant de se garer, bandeaux d'alerte, **skeletons** de chargement
8. **Détail d'une place** — plages horaires détaillées par jour + déplacements à venir + téléphone
9. **Ma place** — statut, **liste des déplacements à venir** (modifier/annuler chacun), bouton « Ajouter un déplacement », horaires, téléphone, changement de numéro, **suppression définitive de la place**
10. **Déplacement** — formulaire départ/retour (création ou modification d'un déplacement)
11. **Téléphone** — modification ou suppression du numéro

---

## Données et modèle conceptuel

Aucune donnée confidentielle n'est demandée : le numéro d'appartement seul et le numéro de place ne constituent pas des données personnelles au sens RGPD, et le numéro d'appartement n'est jamais affiché.

```
spots
  id, number (001–999, unique), apartment_hash, phone_encrypted (optionnel), created_at

spot_schedules
  spot_id, day_of_week (0=lundi … 6=dimanche), start_time, end_time

spot_trips
  spot_id, depart_at, return_at, cancelled_at
  (plusieurs déplacements à venir possibles par place)

active_parkings
  spot_id, parked_at, parked_by_spot_number
  (occupation anonyme — pas de numéro d'appartement stocké ni affiché)

spot_alerts
  spot_id, message, created_at, dismissed_at

auth_attempts
  ip_address, attempted_at, success

localStorage (côté client)
  auth_expires_at       — expiration du code (7 jours)
  spot_number           — place de la session courante
  apartment             — secret, jamais affiché, effacé à la déconnexion
  saved_profiles[]      — numéros de place déjà connectés (sans appartement)
                          → pour reconnexion rapide et switch de profil
```

---

## Stack et structure du projet


| Composant        | Technologie                                          |
| ---------------- | ---------------------------------------------------- |
| Back             | PHP                                                  |
| Base de données  | MySQL                                                |
| Front            | JavaScript, HTML, Tailwind CSS                       |
| Conteneurisation | Docker (nginx + php-fpm + MySQL)                     |
| Design           | **Mobile-first**                                     |
| Architecture     | Monolithe — front JS et back PHP dans le même projet |


```
public/          # Front (index.php, action.php, js/)
includes/        # Logique PHP (services, base de données)
database/        # Schéma MySQL
docker/          # Config nginx + PHP
```

- `index.php` — page de l'application
- `action.php` — traitements PHP appelés par le JavaScript
- `js/backend.js` — pont entre le front et `action.php`
- `js/app.js` — interface et parcours utilisateur
- `js/storage.js` — session localStorage (7 jours)

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

Importez `database/schema.sql` via phpMyAdmin. Test : `GET /action.php?action=health` doit renvoyer `{"ok":true}`.

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
| **Masquage des places hors plage**        | Par défaut, on ne voit que les places `disponible` et `occupée` ; un bouton dévoile les `hors plage` à la demande                     |
| **Détail d'une place au clic**            | Chaque carte ouvre un écran avec ses **plages horaires détaillées** (jour par jour) et tous ses **déplacements à venir**             |
| **Barre d'onglets en bas**                | 3 onglets toujours visibles : `Ma place` · `Horaires` · `Déplacement` (remplace l'unique bouton « Ma place »)                        |
| **Bouton profil en haut à droite**        | Affiche le numéro de place courant ; au clic, sous-menu **Déconnexion** + liste des autres profils enregistrés pour switcher         |

### Stationnement et déplacements

| Fonctionnalité                                | Description                                                                                                                          |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Dialog de confirmation « Je me gare ici »** | Avant de se garer, une modale rappelle jusqu'à quand la place est libre (hint d'horaire ou date de retour du déplacement)            |
| **Plusieurs déplacements par place**          | On peut planifier autant de déplacements futurs que nécessaire — ils s'empilent dans « Ma place »                                    |
| **Modifier un déplacement**                   | Bouton « Modifier » sur chaque déplacement à venir, pré-remplit le formulaire                                                        |
| **Annuler un déplacement précis**             | Annulation indépendante de chaque déplacement (au lieu d'une annulation globale)                                                     |
| **Nettoyage automatique**                     | À chaque chargement de l'accueil, les déplacements dont `return_at` est dépassé sont marqués `cancelled` côté serveur                |
| **Suppression définitive de la place**        | Bouton rouge dans « Ma place » + confirmation native ; supprime la place et toutes ses données associées (horaires, déplacements, parking actif, alertes) |

### Onboarding enrichi

| Fonctionnalité                              | Description                                                                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Étape « concept de déplacement »**        | Après la config des horaires, écran explicatif : « Un déplacement by-passe vos plages habituelles, votre place est libre 24h/24 »          |
| **Horaires toujours affichés**              | Dans la config, les heures début/fin restent visibles même quand un jour est décoché (grisées et désactivées) — plus lisible pour comparer |
| **Re-onboarding horaires**                  | À la reconnexion d'une place existante **sans horaires**, l'app redirige vers l'écran d'horaires avec un message : « Ces horaires correspondent à vos absences habituelles (ex. travail). Ils permettent à vos voisins de savoir quand votre place est disponible. » |
| **Message de non-divulgation du code**      | Bandeau d'avertissement sur l'écran de saisie du code commun                                                                               |

### Multi-profils (sans risque pour l'appartement)

| Fonctionnalité                          | Description                                                                                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mémorisation des numéros de place**   | À chaque connexion réussie, le numéro de place rejoint `saved_profiles[]` en localStorage (**jamais l'appartement**)                              |
| **Reconnexion rapide**                  | L'écran de saisie du numéro de place propose des **boutons de reconnexion rapide** pour chaque profil sauvegardé (l'appartement reste à ressaisir) |
| **Switch de profil**                    | Depuis le menu profil (header), passage direct à l'écran d'appartement d'un autre profil sauvegardé sans repasser par l'onboarding complet        |
| **Déconnexion partielle**               | La déconnexion efface l'auth + l'appartement, mais **conserve** la liste des profils déjà utilisés                                                |

### UX et performance

| Fonctionnalité                         | Description                                                                                                                       |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Skeletons de chargement**            | Cartes animées (`animate-pulse`) sur l'accueil et « Ma place » pendant les requêtes initiales                                     |
| **Animations de chargement boutons**   | Tous les boutons d'action async (park, save, delete, trip…) affichent un spinner et sont désactivés pendant l'appel API           |

---

## Choix volontairement simples (hors scope MVP)

- **Notifications navigateur** — alertes « retour anticipé » via l'API Notification (polling toutes les 60 s tant que l'app est ouverte ; pas de push serveur)
- Pas de file d'attente ni de réservation à l'avance
- Pas de compte administrateur
- Pas d'historique des occupations

