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
| Peut-on annuler un déplacement avant la date prévue ? | **Oui** — la place redevient indisponible selon ses règles habituelles                                                                                      |
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
| Que mémorise le navigateur ? | Date d'expiration du code + **numéro de place + numéro d'appartement** → retour direct sur l'**accueil** sans repasser par l'onboarding |
| Protection brute force       | **5 tentatives** de code incorrectes par IP / **15 minutes**                                                              |


---

## Parcours utilisateur

```
Ouverture app
  → Code valide en local ?
      Non → Saisie code 6 chiffres
  → Place + appartement en local ?
      Oui → Accueil
      Non → Saisie numéro de place (3 chiffres)
          → Place en base ?
              Non → Appartement → Config horaires → Accueil
              Oui → Appartement pour confirmer
                  → Correspond ?
                      Non → Erreur, accès refusé
                      Oui → Horaires configurés ?
                          Non → Config horaires → Accueil
                          Oui → Accueil

Accueil → Garer / Libérer / Ma place / Déplacement
```

### Écrans (MVP)

1. **Connexion** — code 6 chiffres (si session expirée)
2. **Onboarding place** — 3 champs chiffre par chiffre pour le numéro
3. **Onboarding appartement** — saisie ou confirmation si place existante (format libre, ex. A01)
4. **Configuration horaires** — jours de la semaine + plages début/fin
5. **Accueil** — toutes les places enregistrées (numéro + statut) + actions garer/libérer + bandeaux d'alerte
6. **Ma place** — statut, horaires, déplacement, changement de numéro, réinitialisation session
7. **Déplacement** — formulaire départ/retour (date + heure)

---

## Données et modèle conceptuel

Aucune donnée confidentielle n'est demandée : le numéro d'appartement seul et le numéro de place ne constituent pas des données personnelles au sens RGPD, et le numéro d'appartement n'est jamais affiché.

```
spots
  id, number (001–999, unique), apartment_hash, created_at

spot_schedules
  spot_id, day_of_week (0=lundi … 6=dimanche), start_time, end_time

spot_trips
  spot_id, depart_at, return_at, cancelled_at

active_parkings
  spot_id, parked_at
  (occupation anonyme — pas de numéro d'appartement stocké ni affiché)

spot_alerts
  spot_id, message, created_at, dismissed_at

auth_attempts
  ip_address, attempted_at, success

localStorage (côté client)
  auth_expires_at, spot_number, apartment (secret, jamais affiché)
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

```bash
cp .env.example .env
docker compose up -d --build
```

Ouvrir [http://localhost:8080](http://localhost:8080)

Le code d'accès par défaut est `123456` (modifiable via `ACCESS_CODE` dans `.env`).

---

## Choix volontairement simples (hors scope MVP)

- Pas de notification push — les alertes s'affichent **dans l'app** uniquement
- Pas de file d'attente ni de réservation à l'avance
- Pas de compte administrateur
- Pas d'historique des occupations

