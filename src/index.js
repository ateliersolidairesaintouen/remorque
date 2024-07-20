const express = require("express")
const cors = require("cors");
const path = require('path')
const PahekoClient = require("./paheko");
const CalendarClient = require("./google");
const fetch = require("node-fetch");
const Mail = require("./mail");
const Service = require("./services");

const CONFIG = require(path.join(__dirname, "../config.json"));

const SERVICES = Service.prepareServices(CONFIG.services);

const BASEURL = CONFIG.baseurl;
const PORT = CONFIG.port;

// SECURITY
// Operation : ((MOIS + ANNEE[2 DIGITS]) * CODE)[2 DIGITS]

const CAPTCHA_SECRET = CONFIG.captchaSecret;

// PAHEKO
const PAHEKO_BASEURL = CONFIG.paheko.url;
const PAHEKO_USERNAME = CONFIG.paheko.username;
const PAHEKO_PASSWORD = CONFIG.paheko.password;
const PAHEKO_ACTIVITY_ADHESION_ID = CONFIG.paheko.activityAdhesionId;
// GOOGLE CALENDAR
const GOOGLE_CREDENTIALS = CONFIG.googleCredentials;

// SMTP GMAIL
const GMAIL_SMTP = CONFIG.smtp;

let app = express()
let paheko = new PahekoClient(
    PAHEKO_BASEURL,
    PAHEKO_USERNAME,
    PAHEKO_PASSWORD
);

let error = (e, res) => {
    console.log(e);
    res.send({
        status: 500,
        message: e
    })
};

let checkForService = (data, success, failure) => {
    if (data.service == null) failure("Matériel de prêt inconnu");
    else success();
}

let checkForCaptcha = (data, success, failure) => {
    let captcha = data.captcha;

    let form = new URLSearchParams();
    form.append("secret", CAPTCHA_SECRET);
    form.append("response", captcha);

    let req = new fetch.Request("https://www.google.com/recaptcha/api/siteverify", {
        body: form,
        method: "POST"
    });

    fetch(req).then(res => {
        res.json().then(json => {
            if (json.success == true) success()
            else failure("Captcha invalide")
        }).catch(_ => failure("Erreur de captcha"))
    }).catch(_ => {
        failure("Erreur de captcha")
    });
}

let checkForRegistration = (data, success, failure) => {
    let member = data.member;
    let from = data.from;
    let to = data.to;

    paheko.getMemberActivities(member, result => {
        let aJourCotis = false;
        let aJourRemorque = false;
        let it;
        for (let i = 0; i < result.length; ++i) {
            it = result[i];

            let service = it["id_service"];
            let start = new Date(it["date"]);
            let expire = new Date(it["expiry_date"]);

            if (service == PAHEKO_ACTIVITY_ADHESION_ID) {
                if (start >= from) continue;
                if (expire <= to) continue;
                aJourCotis = true;
            }

            if (service == data.service.pahekoActivityId) {
                if (start >= from) continue;
                if (expire <= to) continue;
                aJourRemorque = true;
            }
        }
        if (aJourCotis && aJourRemorque)  success(it)
        else failure("Cotisation ou inscription pas à jour");
    }, failure);
};

let checkCalendarAvailability = (data, isAvailable, failure) => {
    let from = data.from;
    let to = data.to;

    data.calendar.isAvailable({
        from: from,
        to: to,
    }).then(isAvailable).catch(failure);
};

// Fonction qui permet de vérifier que le créneau choisi
// est valide (sur 2 jours; + de x heures)
let isValidHours = (data) => {
    let from = data.from;
    let to = data.to;

    console.log(from, to);

    if (from >= to) return false;
    return true;
};

let calculateCode = (data, date) => {
    let month = date.getMonth() + 1;
    let year = parseInt(new String(date.getUTCFullYear()).substring(2, 4));
    let init = month + year;
    let result = new String(init * data.service.codePrivateKey)
    return result.substring(result.length - 4, result.length);
}

let addCalendarEvent = (data, success, failure) => {
    let member = data.member;
    let from = data.from;
    let to = data.to;

    if (!isValidHours(data)) return failure("Créneau invalide");

    let event = {
        "summary": member.nom,
        "description": data.calendar.formatDescription(member),
        "start": {
            "dateTime": from.toISOString(),
            "timeZone": "Europe/Paris",
        },
        "end": {
            "dateTime": to.toISOString(),
            "timeZone": "Europe/Paris",
        }
    }

    data.calendar.newEvent(event, event => success(event.data.id), failure);
};

let sendConfirmationMail = (data, success, failure) => {
    let mail = new Mail(BASEURL, GMAIL_SMTP, data);
    mail.sendConfirmationMail().then(success).catch(failure);
};

let abortCalendarEvent = (calendar, data, success, failure) => {
    calendar.deleteEvent(data).then(success).catch(failure);
}

app.set("views", "./src/views");
app.set("view engine", "pug");
app.use(express.urlencoded({ extended: true }));
app.use("/", express.static(path.join(__dirname, "public")));
app.use(cors());
app.options('*', cors());

app.post("/add", function(req, res) {
    // On fait rien s'il manque un champ >>> SEMBLE PAS MARCHER LOL
    if (!req.body.member || !req.body.from || !req.body.to || !req.body.service) {
        return error("Formulaire incomplet", res)
    };

    // Date-heure au format ISO /!\
    let member = req.body.member;
    let from = new Date(req.body.from);
    let to = new Date(req.body.to);
    let captcha = req.body.captcha;
    let service = Service.getServiceById(SERVICES, req.body.service);

    let data = {
        member: member,
        from: from,
        to: to,
        captcha: captcha,
        service: service
    };

    console.log(data.service)

    // Vérifier que le service existe
    // Vérifier que le captcha est valide
    // Vérifier l'inscription de l'adhérent
    // Vérifier que le créneau est valide (durée, jour, etc.)
    // Vérifier que le créneau n'est pas déjà pris

    checkForService(data, () => {
        data.calendar = new CalendarClient(
            data.service.googleCalendarId,
            GOOGLE_CREDENTIALS
        );
        checkForCaptcha(data, () => {
            checkForRegistration(data, result => {
                data.member = result;
                checkCalendarAvailability(data, () => {
                    // Le créneau est libre
                    addCalendarEvent(data, id => {
                        // On a bien ajouté le créneau à l'agenda
                        data.eventId = id;
                        data.code = calculateCode(data, data.from);
                        sendConfirmationMail(data, () => {
                            // Le mail de confirmation est bien envoyé
                            res.send({
                                status: 200,
                                message: "Créneau bien ajouté. Merci de vérifier vos mails."
                            })
                        }, (e) => {
                            // Le mail n'est pas envoyé
                            abortCalendarEvent(data.calendar, { eventId: id }, () => {
                                // On supprime le créneau
                                error(e, res);
                            }, (e) => error(e, res));
                        })
                    }, (e) => error(e, res));
                }, (e) => error(e, res))
            }, (e) => error(e, res));
        }, (e) => error(e, res));
    }, (e) => error(e, res));
});

app.get("/calendar", function (req, res) {
    // On fait rien s'il manque un champ >>> SEMBLE PAS MARCHER LOL
    if (!req.query.start || !req.query.end || !req.query.service) return error("Formulaire incomplet", res);

    let start = new Date(req.query.start);
    let end = new Date(req.query.end);
    let service = Service.getServiceById(SERVICES, req.query.service);

    if (service == null) return error("Materiel de prêt inconnu", res);

    let calendar = new CalendarClient(
        service.googleCalendarId,
        GOOGLE_CREDENTIALS
    );

    calendar.getEvents({
        start: start,
        end: end
    }).then(results => {
        res.send(results);
    }).catch(e => {
        error(e, res);
    });

});


app.get("/cancel", (req, res) => {
    let id = req.query.id;
    let serviceId = req.query.service;

    if (id == undefined ) error("No id", res);
    if (serviceId == undefined) error("No service", res);

    let service = Service.getServiceById(SERVICES, serviceId);
    console.log(service);
    if (service == null) error("Unknow service", res);

    let calendar = new CalendarClient(
        service.googleCalendarId,
        GOOGLE_CREDENTIALS
    );

    abortCalendarEvent(calendar, { eventId: id }, () => {
        // On supprime le créneau
        res.render("cancel", {
            title: "Créneau supprimmé",
            message: "Le créneau a bien été supprimé."
        });
    }, (e) => {
        res.render("cancel", {
            title: "Créneau inconnu",
            message: "Impossible de retrouver ce créneau."
        });
    });
});

app.get("/services", (req, res) => {
    res.send(SERVICES.map(it => {
        return {
            id: it.id,
            name: it.name
        }
    }));
})

app.get("/test", (req, res) => {
    console.log(CONFIG);
    res.send("")
})

app.listen(PORT, () => {
    console.log("Starting remorque :)")
});
