const express = require("express")
const cors = require("cors");
const path = require('path')
const PahekoClient = require("./paheko");
const CalendarClient = require("./google");
const fetch = require("node-fetch");
const Mail = require("./mail");

const CONFIG = require(path.join(__dirname, "../config.json"));

const BASEURL = CONFIG.baseurl;
const PORT = CONFIG.port;

// SECURITY
// Operation : ((MOIS + ANNEE[2 DIGITS]) * CODE)[2 DIGITS]
const codePrivateKey = CONFIG.codePrivateKey;

const CAPTCHA_SECRET = CONFIG.captchaSecret;

// PAHEKO
const PAHEKO_BASEURL = CONFIG.paheko.url;
const PAHEKO_USERNAME = CONFIG.paheko.username;
const PAHEKO_PASSWORD = CONFIG.paheko.password;
const PAHEKO_ACTIVITY_ADHESION_ID = CONFIG.paheko.activityAdhesionId;
const PAHEKO_ACTIVITY_REMORQUE_ID = CONFIG.paheko.activityRemorqueId;

// GOOGLE CALENDAR
const GOOGLE_CREDENTIALS = CONFIG.googleCredentials;
const GOOGLE_CALENDAR_ID = CONFIG.googleCalendarId;

// SMTP GMAIL
const GMAIL_SMTP = CONFIG.smtp;

var app = express()
var paheko = new PahekoClient(
    PAHEKO_BASEURL,
    PAHEKO_USERNAME,
    PAHEKO_PASSWORD
);
var calendar = new CalendarClient(
    GOOGLE_CALENDAR_ID,
    GOOGLE_CREDENTIALS
);
var mail = new Mail(BASEURL, GMAIL_SMTP);

var error = (e, res) => {
    res.send({
        status: 500,
        message: e
    })
};

var checkForCaptcha = (data, success, failure) => {
    var captcha = data.captcha;

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

var checkForRegistration = (data, success, failure) => {
    var member = data.member;
    var from = data.from;
    var to = data.to;

    paheko.getMemberActivities(member, result => {
        let aJourCotis = false;
        let aJourRemorque = false;
        for (var i = 0; i < result.length; ++i) {
            var it = result[i];

            var service = it["id_service"];
            var start = new Date(it["date"]);
            var expire = new Date(it["expiry_date"]);

            if (service == PAHEKO_ACTIVITY_ADHESION_ID) {
                if (start >= from) continue;
                if (expire <= to) continue;
                aJourCotis = true;
            }

            if (service == PAHEKO_ACTIVITY_REMORQUE_ID) {
                if (start >= from) continue;
                if (expire <= to) continue;
                aJourRemorque = true;
            }
        }
        if (aJourCotis && aJourRemorque)  success(it)
        else failure("Cotisation ou inscription pas à jour");
    }, failure);
};

var checkCalendarAvailability = (data, isAvailable, failure) => {
    var from = data.from;
    var to = data.to;

    calendar.isAvailable({
        from: from,
        to: to,
    }).then(isAvailable).catch(failure);
};

// Fonction qui permet de vérifier que le créneau choisi
// est valide (sur 2 jours; + de x heures)
var isValidHours = (data) => {
    var from = data.from;
    var to = data.to;

    console.log(from, to);

    if (from >= to) return false;
    return true;
};

var calculateCode = (date) => {
    var month = date.getMonth() + 1;
    var year = parseInt(new String(date.getUTCFullYear()).substring(2, 4));
    var init = month + year;
    var result = new String(init * codePrivateKey)
    return result.substring(result.length - 4, result.length);
}

var addCalendarEvent = (data, success, failure) => {
    var member = data.member;
    var from = data.from;
    var to = data.to;

    if (!isValidHours(data)) return failure("Créneau invalide");

    var event = {
        "summary": member.nom,
        "description": calendar.formatDescription(member),
        "start": {
            "dateTime": from.toISOString(),
            "timeZone": "Europe/Paris",
        },
        "end": {
            "dateTime": to.toISOString(),
            "timeZone": "Europe/Paris",
        }
    }

    calendar.newEvent(event, event => success(event.data.id), failure);
};

var sendConfirmationMail = (data, success, failure) => {
    mail.sendConfirmationMail(data).then(success).catch(failure);
};

var abortCalendarEvent = (data, success, failure) => {
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
    if (!req.body.member || !req.body.from || !req.body.to) {
        return error("Formulaire incomplet", res)
    };

    // Date-heure au format ISO /!\
    var member = req.body.member;
    var from = new Date(req.body.from);
    var to = new Date(req.body.to);
    var captcha = req.body.captcha;


    var data = {
        member: member,
        from: from,
        to: to,
        captcha: captcha
    };

    // Vérifier l'inscription de l'adhérent
    // Vérifier que le créneau est valide (durée, jour, etc.)
    // Vérifier que le créneau n'est pas déjà pris

    checkForCaptcha(data, () => {
        checkForRegistration(data, result => {
            data = {
                member: result,
                from: from,
                to: to
            };

            checkCalendarAvailability(data, () => {
                // Le créneau est libre
                addCalendarEvent(data, id => {
                    // On a bien ajouté le créneau à l'agenda
                    data.eventId = id;
                    data.code = calculateCode(data.from);
                    sendConfirmationMail(data, () => {
                        // Le mail de confirmation est bien envoyé
                        res.send({
                            status: 200,
                            message: "Créneau bien ajouté. Merci de vérifier vos mails."
                        })
                    }, (e) => {
                        // Le mail n'est pas envoyé
                        abortCalendarEvent({ eventId: id }, () => {
                            // On supprime le créneau
                            error(e, res);
                        }, (e) => error(e, res));
                    })
                }, (e) => error(e, res));
            }, (e) => error(e, res))
        }, (e) => error(e, res));
    }, (e) => error(e, res))

});

app.get("/calendar", function (req, res) {
    // On fait rien s'il manque un champ >>> SEMBLE PAS MARCHER LOL
    if (!req.query.start || !req.query.end) return error("Formulaire incomplet", res);

    var start = new Date(req.query.start);
    var end = new Date(req.query.end);

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
    var id = req.query.id;
    if (id == undefined) error("No id", res);
    else abortCalendarEvent({ eventId: id }, () => {
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

app.get("/test", (req, res) => {
    console.log(CONFIG);
    res.send("")
})

app.listen(PORT, () => {
    console.log("Starting remorque :)")
});
