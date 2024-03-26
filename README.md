# Remorque

*Remorque* est une plateforme permettant de réserver des créneaux pour l'utilisation d'une remorque en libre service.

La plateforme permet de visualiser les créneaux enregistrés dans un agenda Google. Elle permet aussi de choisir un créneau et – successivement – d'éxécuter les actions suivantes :

1. Vérifier l'adhésion et l'inscription de l'utilisateur à l'activité du service sur le serveur Paheko de l'association.
2. Vérifier et ajouter le créneau dans l'agenda Google.
3. Envoyer un email de confirmation avec les instructions pour récupérer la remorque (comprenant le code d'antivol du mois).
4. Si le mail ne s'envoie pas, supprimer le créneau de l'agenda Google.

## Utilisation

Avant tout, il faut éditer le fichier de configuration (le renommer `config.json`) et ajouter les informations suivantes :

* Base URL et port du serveur
* Clé initiale pour calculer les codes mensuels d'antivol
* Identifiants et point d'entrée de l'API Paheko.
* Authentification de l'API Google Calendar à l'aide d'un [compte de service](https://developers.google.com/workspace/guides/create-credentials?hl=fr#service-account) et identifiant du calendrier concerné.
* Serveur SMTP

Ensuite, lancez le serveur grâce à la commande :

```bash
$ npm start
```

## Personnalisation du mail de confirmation

Le template du mail de confirmation se trouve dans le fichier `./src/mail.js`.
