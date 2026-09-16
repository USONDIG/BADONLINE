# BADONLINE

Site français responsive pour la personnalisation de textiles de badminton et de tubes de volants. Le dépôt était vide au démarrage : HTML, CSS, JavaScript natif et serveur Node sans dépendance ont été choisis pour conserver un site simple à maintenir.

## Utilisation

Node.js 22 ou plus récent. Aucun paquet à installer.

- `npm start` : aperçu à http://127.0.0.1:3000.
- `npm test` : validation et tests HTTP du formulaire.
- `npm run build` : copie des fichiers publics dans `dist/` pour hébergement statique.

Les chemins d’assets sont absolus : héberger à la racine d’un domaine. Pour GitHub Pages sous `/BADONLINE/`, adapter les chemins ou utiliser un domaine personnalisé. Le push GitHub ne déploie pas automatiquement le site.

## Réception des devis

Par défaut, le formulaire prépare un e-mail vers **bastien.sudan@gmail.com** dans la messagerie du visiteur. Il indique explicitement que le visiteur doit envoyer ce message. Un texte copiable permet de terminer la demande sans application de messagerie configurée. Aucun faux succès et aucun envoi externe automatique.

Pour un envoi direct, définir `CONTACT_WEBHOOK_URL` avec l’URL HTTPS d’un service de réception maîtrisé, puis démarrer le serveur Node. Le serveur transmet un JSON avec `name`, `email`, `phone`, `organization`, `project`, `quantity`, `message`, `consent`. La destination reste côté serveur ; ne jamais exposer un secret dans les fichiers publics. Configurer le service pour remettre les demandes à l’adresse ci-dessus et tester la réception réelle avant activation. L’endpoint doit répondre en 2xx uniquement quand la demande est acceptée durablement.

Exemple : `node --env-file=.env server.mjs` après avoir copié `.env.example` dans `.env`. Le serveur écoute en local ; pour un hébergement public utiliser un reverse proxy HTTPS. La limite d’envoi en mémoire (5 requêtes/minute/adresse IP) convient à une instance. Derrière un proxy, prévoir une limitation au niveau du proxy plutôt que de faire confiance arbitrairement à X-Forwarded-For. Aucun contenu de demande n’est journalisé ou stocké localement.

## Contenu et confidentialité

Les illustrations SVG sont des concepts originaux, pas des photos de réalisations. Aucun tarif, avis client, délai ou certification n’est inventé. Les informations légales d’entreprise (raison sociale, responsable, adresse, immatriculation, hébergeur), la durée de conservation réelle et les sous-traitants de réception restent à compléter par l’exploitant avant une exploitation commerciale publique.

Navigation clavier, champs associés à leurs libellés, contraste, mouvement réduit, menu mobile, FAQ native et statut de formulaire accessible. Aucun service de police, cookie publicitaire ou outil de suivi externe.
