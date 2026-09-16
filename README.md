# BADONLINE

Site français de personnalisation badminton destiné aux particuliers : t-shirts, maillots et tubes de volants. Design neumorphism gris perle, vert forêt et lime, responsive. Quatre concepts illustrés avec les prénoms fictifs Camille, Alex, Léa et Hugo.

## Streamlit Community Cloud

Déployer `USONDIG/BADONLINE`, branche `main`, fichier `streamlit_app.py`, Python 3.12 ou plus récent. `requirements.txt` fixe la version de Streamlit.

Le composant Streamlit transmet le formulaire au serveur Python, qui contacte FormSubmit en HTTPS. La destination ne figure ni dans le HTML ni dans le JavaScript envoyé au navigateur. Les illustrations et les styles existants sont réutilisés. Le serveur Node n’est pas nécessaire à Streamlit.

## Activation FormSubmit (sans compte)

1. Envoyer une première demande : FormSubmit adresse un e-mail d’activation au destinataire.
2. Le destinataire clique sur le lien reçu pour autoriser la réception. Vérifier les indésirables.
3. Faire un essai après confirmation et vérifier sa réception réelle avant de considérer l’envoi opérationnel.

La destination actuelle est définie uniquement dans `contact_config.json`, chargé côté serveur. Le dépôt GitHub étant public, cela masque l’adresse sur le site mais ne la rend pas secrète dans le dépôt ou son historique. Pour retirer aussi l’adresse de la version courante du dépôt, utiliser l’identifiant opaque fourni par FormSubmit après activation, ou stocker la destination dans les Secrets Streamlit sous `FORMSUBMIT_RECIPIENT` puis retirer la valeur du fichier serveur. Ne jamais publier de clés ni de secrets.

Configurer aussi `SITE_URL` dans les Secrets Streamlit avec l’URL publique du site pour identifier correctement sa provenance. Sans cette valeur, le dépôt GitHub sert de référence dans les e-mails.

Pas de mot de passe Gmail, pas de clé d’API et pas de compte FormSubmit. Le succès affiché signifie que FormSubmit a accepté la demande, pas qu’un e-mail est arrivé dans la boîte de réception. Les erreurs sont génériques et ne révèlent pas le destinataire. Aucun contenu utilisateur n’est injecté en HTML ou journalisé.

Protection : validation serveur, consentement obligatoire, champ piège anti-spam, délai de 30 secondes par session Streamlit et plafond de 30 tentatives par heure par processus. La voie AJAX utilise `_captcha=false` : ces protections ne remplacent pas un CAPTCHA ou une protection distribuée pour un site à fort trafic. Aucune réponse automatique n’est envoyée au visiteur.

FormSubmit conserve les soumissions pendant 30 jours, comme indiqué dans la notice du site. Les informations légales d’entreprise et les durées de conservation dans la messagerie de l’exploitant restent à compléter.

## Version Node

Node 22+, sans dépendance. `npm start` lance http://127.0.0.1:3000 ; `npm test` vérifie le serveur et l’intégration d’envoi simulée. `npm run build` copie les fichiers publics dans `dist/`. Un hébergement uniquement statique ne suffit plus au formulaire : utiliser Node ou Streamlit pour conserver la destination côté serveur.

`FORMSUBMIT_RECIPIENT` et `SITE_URL` peuvent également être définis dans l’environnement Node. `.env.example` contient les noms de variables. Le serveur écoute en local ; utiliser un reverse proxy HTTPS en production.

## Vérification Python

`python -m unittest discover -s test -p 'test_*.py'`

Les tests utilisent des réponses simulées et n’envoient pas d’e-mails. Pour lancer le site : `pip install -r requirements.txt` puis `streamlit run streamlit_app.py`.
