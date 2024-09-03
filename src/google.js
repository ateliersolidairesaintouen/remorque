const {google} = require("googleapis");
const {JWT} = require("google-auth-library");

var calendarClient = class CalendarClient {
    constructor(calendarId, credentials) {
        this.credentials = credentials;
        this.client = new JWT({
            email: credentials.client_email,
            key: credentials.private_key,
            scopes: [
                "https://www.googleapis.com/auth/calendar",
                "https://www.googleapis.com/auth/calendar.events"
            ]
        });
        this.calendar = google.calendar({version:"v3"});
        this.calendarId = calendarId;
    }

    formatDescription(member) {
        return `Nom : ${member.nom}\nEmail : ${member.email}\nTelephone : ${member.telephone}`;
    }

    newEvent(event, success, failure) {
        this.calendar.events.insert({
            calendarId: this.calendarId,
            auth: this.client,
            requestBody: event
        }).then(success).catch(() => failure("Impossible d'ajouter l'événement"));
    }

    // Virer isAvailable et failure par return et throw (puis .then() et .catch());
    async isAvailable(data) {
        var from = data.from;
        var to = data.to;

        try {
            var res = await this.calendar.events.list({
                calendarId: this.calendarId,
                auth: this.client,
                timeMin: from.toISOString(),
                timeMax: to.toISOString()
            });

            if (res.data.items.length > 0) throw "Créneau indisponible";
            else return;

        } catch (e) {
            throw (e);
        }

    }

    async getEvents(data) {
        var start = data.start;
        var end = data.end;

        try {
            var res = await this.calendar.events.list({
                calendarId: this.calendarId,
                auth: this.client,
                timeMin: start.toISOString(),
                timeMax: end.toISOString()
            });

            console.log(res.data.items)

            var results = [];

            res.data.items.forEach(i => {
                if (i.id == undefined || i.start == undefined || i.end == undefined) return;
                results.push({
                    id: i.id,
                    start: new Date(i.start.dateTime),
                    end: new Date(i.end.dateTime),
                })
            });

            return results;
        } catch(e) {
            throw new String(e);
        }
    }

    async deleteEvent(data) {
        try {
            var res = await this.calendar.events.delete({
                auth: this.client,
                calendarId: this.calendarId,
                eventId: data.eventId,
            });
        } catch(e) {
            throw e;
        }
    }

}

module.exports = calendarClient;
