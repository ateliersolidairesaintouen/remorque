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
    "<p>Atelier Solidaire</p>"
].join("\n")

var mail = class Mail {
    constructor(baseurl, smtp) {
        this.baseurl = baseurl;
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

    formatDate(date) {

    }

    formatHour(date) {
        return date.toLocaleDateString("fr-FR");
    }

    generateMail(data) {
        var content = CONTENT
            .replaceAll("{NAME}", data.member.nom)
            .replaceAll("{HOUR_START}", data.from.toLocaleTimeString("fr-FR"))
            .replaceAll("{HOUR_END}", data.to.toLocaleTimeString("fr-FR"))
            .replaceAll("{DATE_START}", data.from.toLocaleDateString("fr-FR"))
            .replaceAll("{DATE_END}", data.to.toLocaleDateString("fr-FR"))
            .replaceAll("{LINK_CANCEL}", this.generateLinkCancel(data.eventId))
            .replaceAll("{CODE}", data.code);
        var subject = SUBJECT;
        var sender = `${this.smtp.name} <${this.smtp.email}>`

        return {
            content: content,
            subject: subject,
            sender: sender
        }
    }

    async sendConfirmationMail(data) {
        var template = this.generateMail(data);
        var member = data.member;

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
