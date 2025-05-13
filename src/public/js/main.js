// À MODIFIER COMME LE FICHIER DE CONFIGURATION
const BASE_URL = "https://remorque.atelierso.fr/";
const COLORS = [
    "#FFADAD",
    "#FFD6A5",
    "#FDFFB6",
    "#CAFFBF",
    "#9BF6FF",
    "#A0C4FF",
    "#BDB2FF",
    "#FFC6FF"
]

var SERVICES = undefined;

let calNavTitle = document.getElementById("calendar-navigation-title");
let calNavToday = document.getElementById("calendar-navigation-today");
let calNavPrev = document.getElementById("calendar-navigation-prev");
let calNavNext = document.getElementById("calendar-navigation-next");

let calendarTable = document.getElementById("calendar_table");
let alertLabel = document.getElementById("alert");

let date = document.getElementById("date");
let service = document.getElementById("service");
let startHour = document.getElementById("start-hour");
let startMinute = document.getElementById("start-minute");

let endHour = document.getElementById("end-hour");
let endMinute = document.getElementById("end-minute");

let submit = document.getElementById("submit");

date.valueAsDate = new Date();

async function submitRequest(service, member, start, end, captcha) {
    let form = new FormData();
    form.append("service", service);
    form.append("member", member);
    form.append("from", start);
    form.append("to", end);
    //form.append("captcha", captcha); 06/02/25 : suppression captcha

    let res = await fetch(BASE_URL + "add", {
        "method": "POST",
        "body": new URLSearchParams(form)
    });
    let rep = await res.json();
    return rep;
}

async function fetchCalendar(service, start, end) {
    let form = new FormData();
    form.append("start", start);
    form.append("end", end);
    form.append("service", service);

    let res = await fetch(BASE_URL + "calendar?" + new URLSearchParams(form));
    return await res.json();
}

async function fetchServices() {
    let res = await fetch(BASE_URL + "services");
    return await res.json();
}

var formatDateTime = (date, hour, minute) => {
    let year = date.getUTCFullYear();
    let month = date.getMonth();
    let day = date.getDate();
    let final = new Date(year, month, day, new Number(hour), new Number(minute));
    return final.toISOString();
}

var getWeekTitle = (config) => {
    return `${config.start.toLocaleDateString("fr-FR", {
        weekday: "long",
        month: "long",
        day: "numeric"
    })} • ${config.end.toLocaleDateString("fr-FR", {
        weekday: "long",
        month: "long",
        day: "numeric"
    })}`
}

var getTodayWeekConfig = (service, day) => {
    let d = new Date(day);
    let de = new Date(day);

    d.setHours(0);
    de.setHours(23);

    d.setMinutes(0);
    de.setMinutes(59);

    let dday = d.getDay();
    let diff = d.getDate() - dday + (dday == 0 ? -6 : 1);

    var start = new Date(d.setDate(diff));
    var end = new Date(de.setDate(start.getDate() + 6));

    return {
        service: service,
        start: start,
        end: end
    }
}

var setPrevWeek = (config) => {
    let d = config.start;
    let day = d.getDate();
    d.setDate(day - 7);
    calendarConfig = getTodayWeekConfig(config.service, d);
}

var setNextWeek = (config) => {
    let d = config.start;
    var day = d.getDate();
    d.setDate(day + 7);
    calendarConfig = getTodayWeekConfig(config.service, d);
}

var alertMessage = (type, message) => {
    alertLabel.innerText = message;
    alertLabel.className = "alert " + type;
}

var decimalToTime = (n) => (
    new String(
        Math.floor(n)
    ).padStart(2, "0") + ":" + new String(
        Math.floor((n % 1) * 60)
    ).padStart(2, "0"));

var daysInDateMonth = (d) => {
    let bx = d.getFullYear() % 4 == 0 ? true : false;
    let nbs = [
        31,
        28 + (bx ? 1 : 0),
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31
    ]
    return nbs[d.getMonth()]
}

// Init and set services

var initServices = (then, _) => {
    fetchServices().then(services => {
        let all = [];
        for (let i = 0; i < services.length; ++i) {
            let sv = services[i];
            sv.color = COLORS[i % services.length];
            let option = new Option(sv.name, sv.id);
            option.value = sv.available ? sv.name : sv.name + " (indisponible)"
            option.disabled = !sv.available
            service.appendChild(option);
            all.push(sv);
        }
        then(all);
    })
}

// Update calendar events

var updateCalendarData = (calendarConfig) => {
    let date = calendarConfig.start;
    $("#calendar").jqs("reset", date.getDate(), daysInDateMonth(date));

    calNavTitle.innerText = getWeekTitle(calendarConfig);

    let data = [];

    fetchCalendar(calendarConfig.service.id, calendarConfig.start, calendarConfig.end).then(result => {
        for (let i = 0; i < result.length; ++i) {
            let it = result[i];
            let s = new Date(it.start);
            let e = new Date(it.end);
            let d = s.getDay() == 0 ? 5 : s.getDay() - 1;

            let sstr = s.toLocaleTimeString("fr-FR");
            let estr = e.toLocaleTimeString("fr-FR");

            let event = {
                day: d,
                periods: [
                    {
                        start: sstr.substring(sstr, sstr.length - 3),
                        end: estr.substring(estr, estr.length - 3),
                        backgroundColor: calendarConfig.service.color
                    }
                ]
            };

            data.push(event);
        }

        $("#calendar").jqs("import", data);
    }).catch(e => {
        //$("#calendar").jqs(config);
    });
}

var askForDonation = () => {
    if (confirm("Un petit don pour l'atelier ? À votre bon coeur!") == true) {
        window.location.href = "https://www.helloasso.com/associations/atelier-solidaire-saint-ouen/boutiques/don-remorque"
    }
}

service.addEventListener('change', () => {
    let id = service.value;
    SERVICES.forEach(it => {
        if (it.id == id) {
            calendarConfig.service = it;
            updateCalendarData(calendarConfig);
        }
    })
})

submit.addEventListener("click", () => {
    var s = formatDateTime(date.valueAsDate, startHour.value, startMinute.value);
    var e = formatDateTime(date.valueAsDate, endHour.value, endMinute.value);
    var m = member.value;
    //var c = grecaptcha.getResponse(); 06/02/25 suppression captcha
    var c = undefined
    var sv = service.value;

    alertMessage("alert-secondary", "Enregistrement...")

    submitRequest(sv, m, s, e, c).then((rs) => {
        if (rs.status == 200) {
            alertMessage("alert-success", rs.message);
            updateCalendarData(calendarConfig);

            setTimeout(askForDonation, 1000);
        } else {
            alertMessage("alert-danger", rs.message);
        }
    }).catch((e) => {
        alertMessage("alert-secondary", "Erreur rencontrée. Réessayez plus tard.")
    })
});

calNavToday.addEventListener("click", () => {
    calendarConfig = getTodayWeekConfig(calendarConfig.service, new Date());
    updateCalendarData(calendarConfig);
});


calNavPrev.addEventListener("click", () => {
    setPrevWeek(calendarConfig);
    updateCalendarData(calendarConfig);
});

calNavNext.addEventListener("click", () => {
    setNextWeek(calendarConfig);
    updateCalendarData(calendarConfig);
});



$("#calendar").jqs({
    mode: "read",
    days: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
})

var calendarConfig = undefined;

//setPrevWeek(calendarConfig.start);
initServices(svs => {
    SERVICES = svs;
    let firstService = svs[0];
    calendarConfig = getTodayWeekConfig(firstService, new Date());
    updateCalendarData(calendarConfig);
})
