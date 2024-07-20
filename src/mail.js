const nodemailer = require("nodemailer");

const SUBJECT = "Confirmation de réservation de remorque"
const CONTENT = [
    "<p>Nous vous confirmons la réservation de la remorque en libre service. Voici les détails de votre réservation :</p>",
    "<p>{NAME}",
    "<br/>Début : {HOUR_START} le {DATE_START}",
    "<br/>Fin : {HOUR_END} le {DATE_END}</p>",
    "<p>Pour récupérer la remorque, vous devrez ouvrir la boîte à clé à l'aide du code suivant : <b>{CODE}</b>.</p>",
    "<p>Si vous souhaitez annuler la réservation, cliquez sur le lien suivant :</p>",
    "<p><a href=\"{LINK_CANCEL}\">{LINK_CANCEL}</a></p>",
    "<p>Si vous rencontrez un problème avec la remorque, merci de nous le faire savoir en retour de ce mail.</p>",
    "<h3>Rappel des règles d'utilisation</h3>",
    "<p>Au départ de l'Atelier :</p>",
    "<ul>",
    "<li>Les pneus sont correctement gonflés (pression indiquée sur les pneus)</li>",
    "<li>Les freins du vélo sont vérifiés</li>",
    "<li>La remorque est équipé de catadioptres sur les roues avant et arrière</li>",
    "<li>L’emprunteur possède des lumière (avant et arrière), l’atelier n’en fournit pas</li>",
    "<li>Mettre le drapeau de signalisation sur la remorque Ne pas laisser le code sur le coffre à clé, il faut tourner les molettes</li>",
    "</ul>",
    "<p>Pendant l'emprunt :</p>",
    "<ul>",
    "<li>Respecter la règle des 3 points pour l’accrochage des vélos et remorque : un bon U accroché au cadre, roues et point fixe</li>",
    "<li>Ne pas laisser le matériel  non attaché sans surveillance même dans un local vélo et même pour une minute</li>",
    "<li>Ne pas dépasser une charge supérieure à 40 kg</li>",
    "</ul>",
    "<p>Au retour à l'Atelier :</p>",
    "<ul>",
    "<li>Réinstaller et raccrocher la remorque comme vous l’avez trouvé</li>",
    "<li>Rapporter le matériel nettoyé, en état de bon fonctionnement</li>",
    "<li>En cas de souci, nous faire un mail en décrivant précisément ce qui ne va pas</li>",
    "<li>Faire un don à prix libre pour l’utilisation</li>",
    "</ul>",
    "<p>Atelier Solidaire</p>"
].join("\n")

var mail = class Mail {
    constructor(baseurl, smtp, data) {
        this.baseurl = baseurl;
        this.data = data;
        this.smtp = smtp,
        this.transport = nodemailer.createTransport({
            host: smtp.host,
            port: smtp.portSSL,
            secure: true,
            auth: {
                user: smtp.email,
                pass: smtp.password
            }
        });
    }

    generateLinkHelp(id) {
        return this.baseurl + "help?id=" + id;
    }

    generateLinkCancel(id) {
        return this.baseurl + "cancel?id=" + id;
    }

    formatHour(date) {
        return date.toLocaleDateString("fr-FR");
    }

    generateMail(data) {
        var content = data.service.mailConfirmationContent
            .replaceAll("{NAME}", data.member.nom)
            .replaceAll("{HOUR_START}", data.from.toLocaleTimeString("fr-FR"))
            .replaceAll("{HOUR_END}", data.to.toLocaleTimeString("fr-FR"))
            .replaceAll("{DATE_START}", data.from.toLocaleDateString("fr-FR"))
            .replaceAll("{DATE_END}", data.to.toLocaleDateString("fr-FR"))
            .replaceAll("{LINK_CANCEL}", this.generateLinkCancel(data.eventId))
            .replaceAll("{CODE}", data.code);
        var subject = data.service.mailConfirmationSubject;
        var sender = `${this.smtp.name} <${this.smtp.email}>`

        return {
            content: content,
            subject: subject,
            sender: sender
        }
    }

    async sendConfirmationMail() {
        var template = this.generateMail(this.data);
        var member = this.data.member;

        try {
            this.transport.sendMail({
                from: template.sender,
                to: member.email,
                subject: template.subject,
                html: template.content,
            })
        } catch(e) {
            throw "Impossible d'envoyer le mail" + e;
        }
    }
}

module.exports = mail;
