# École des Ombres — GitHub Pages + Supabase + Discord

> État actualisé : dépôt publié sur https://prismdevvv.github.io/ecole-des-ombres/ ; tables créées et fonction `ecole` déployée dans le projet `roszuwquxrbgszocydue`. 3 261 personnages importés. La synchronisation s'exécute désormais directement dans Supabase toutes les 30 minutes, via `pg_cron` et la fonction privée `sync_school_zenkai` (migration 002). Le workflow GitHub de synchronisation est supprimé : aucun secret Supabase n'est nécessaire dans GitHub. Les étapes de création et de secrets ci-dessous sont historiques ; ne pas les refaire sur ce projet. Les URL de retour sont configurées. Il reste à renseigner et activer le fournisseur Discord, puis à vérifier une connexion réelle et attribuer le premier Roi.

Version adaptée du site existant, avec son interface, les cours, rapports, grades, exercices, annonces, shogi et signalisation vocale. Le navigateur est hébergé sur GitHub Pages ; les actions et permissions sont vérifiées dans une fonction Supabase. Rafraîchissement toutes les deux secondes. Le vocal dépend du réseau des participants (serveur STUN, sans relais TURN).

## État de livraison

Fichiers préparés localement. Aucun dépôt distant ni projet Supabase n'a encore été créé. La connexion Discord et les services distants restent à tester après configuration. Les données de test et anciennes sessions de data.json sont volontairement exclues.

## 1. Créer Supabase

Créer un projet sur https://supabase.com/dashboard puis ouvrir SQL Editor et exécuter `supabase/migrations/001_school.sql` une seule fois. Les trois tables sont privées : aucune permission directe pour les visiteurs.

Dans `config.js`, renseigner l'URL du nouveau projet et sa clé publique publishable (ou anon). Ne jamais mettre une clé service_role, un mot de passe ou le secret Discord dans ce fichier.

Installer la CLI Supabase, puis depuis ce dossier :

```sh
supabase login
supabase link --project-ref TON_PROJECT_REF
supabase functions deploy ecole --no-verify-jwt
```

Le contrôle JWT de la passerelle est désactivé pour accepter les clés publiques récentes ; la fonction vérifie obligatoirement chaque jeton avec `auth.getUser` avant tout accès. Les variables serveur SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournies par Supabase.

## 2. Créer le dépôt GitHub

Créer un dépôt `ecole-des-ombres`, puis y envoyer **le contenu de ce dossier**, y compris `.github`. Dans Settings > Pages > Source, choisir GitHub Actions. Le workflow publie seulement la page et ses ressources publiques.

Ajouter dans Settings > Secrets and variables > Actions deux secrets :

- SUPABASE_URL : URL du nouveau projet.
- SUPABASE_SERVICE_ROLE_KEY : clé serveur du nouveau projet, exclusivement dans les secrets GitHub.

Lancer Actions > Synchroniser les personnages Zenkai > Run workflow une première fois. Le workflow reprend la source utilisée par la copie locale de Seimei et synchronise ensuite toutes les 30 minutes. Les délais GitHub peuvent varier. Les personnages sont rapprochés avec `discord_id` enregistré en texte, pour éviter toute perte de précision.

## 3. Activer Discord

Créer une application sur https://discord.com/developers/applications. Dans OAuth2, ajouter la redirection `https://TON_PROJECT_REF.supabase.co/auth/v1/callback`.

Dans Supabase > Authentication > Sign In / Providers > Discord, activer le fournisseur et saisir Client ID et Client Secret. Dans URL Configuration, définir Site URL sur `https://TON_COMPTE.github.io/ecole-des-ombres/` et ajouter exactement cette URL aux Redirect URLs. Si tu utilises `/index.html`, l'ajouter aussi.

Le secret Discord reste dans Supabase. Documentation : https://supabase.com/docs/guides/auth/social-login/auth-discord

## 4. Attribuer le premier Roi

Connecte-toi après la première synchronisation. Ton compte commence en Pion. S'il existe plusieurs personnages sur ton Discord, choisis le bon (le choix devient la fiche de ce compte).

Dans SQL Editor, remplacer l'identifiant ci-dessous par ton vrai ID Discord :

```sql
update public.school_state
set data = jsonb_set(data, array['users','TON_ID_DISCORD','role'], '"Roi"'::jsonb),
    version = version + 1
where id = 1 and data->'users' ? 'TON_ID_DISCORD';
```

Reconnecte-toi : tu peux ensuite attribuer les grades depuis le site. Aucun visiteur ne devient administrateur automatiquement.

## Vérification après installation

Vérifier connexion/déconnexion, récupération du bon personnage, choix entre plusieurs personnages, refus d'un Discord sans personnage, création d'un cours, inscription, rapport, validation réservée aux hauts gradés, changement de grade, annonces et shogi à deux comptes. Tester le vocal sur deux appareils. Une mauvaise configuration doit afficher une erreur explicite.

Les noms de personnages sont conservés à la création de la fiche afin de préserver les liens des cours et parties. Un changement de personnage ou de nom se traite actuellement par l'administrateur dans la base. Les règles de déplacement du shogi sont celles du site source, avec validation manuelle des déplacements par les joueurs.
