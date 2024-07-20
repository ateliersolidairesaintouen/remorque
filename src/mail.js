const nodemailer = require("nodemailer");

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

    generateLinkCancel(service, id) {
        return this.baseurl + "cancel?service=" + service.id + "&id=" + id;
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
            .replaceAll("{LINK_CANCEL}", this.generateLinkCancel(data.service, data.eventId))
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
