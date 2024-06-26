// À MODIFIER COMME LE FICHIER DE CONFIGURATION
let BASE_URL = "https://remorque.atelierso.fr/";

let calNavTitle = document.getElementById("calendar-navigation-title");
let calNavToday = document.getElementById("calendar-navigation-today");
let calNavPrev = document.getElementById("calendar-navigation-prev");
let calNavNext = document.getElementById("calendar-navigation-next");

let calendarTable = document.getElementById("calendar_table");
let alertLabel = document.getElementById("alert");

let date = document.getElementById("date");
let startHour = document.getElementById("start-hour");
let startMinute = document.getElementById("start-minute");

let endHour = document.getElementById("end-hour");
let endMinute = document.getElementById("end-minute");

let submit = document.getElementById("submit");

date.valueAsDate = new Date();

async function submitRequest(member, start, end, captcha) {
    let form = new FormData();
    form.append("member", member);
    form.append("from", start);
    form.append("to", end);
    form.append("captcha", captcha);

    let res = await fetch(BASE_URL + "add", {
        "method": "POST",
        "body": new URLSearchParams(form)
    });
    let rep = await res.json();
    return rep;
}

async function fetchCalendar(start, end) {
    let form = new FormData();
    form.append("start", start);
    form.append("end", end);

    let res = await fetch(BASE_URL + "calendar?" + new URLSearchParams(form));
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

var getTodayWeekConfig = (day) => {
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
        start: start,
        end: end
    }
}

var setPrevWeek = (d) => {
    var day = d.getDate();
    d.setDate(day - 7);
    calendarConfig = getTodayWeekConfig(d);
}

var setNextWeek = (d) => {
    var day = d.getDate();
    d.setDate(day + 7);
    calendarConfig = getTodayWeekConfig(d);
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

var updateCalendarData = (calendarConfig) => {

    $("#calendar").jqs("reset", calendarConfig.start.getDate());

    calNavTitle.innerText = getWeekTitle(calendarConfig);

    let data = [];

    fetchCalendar(calendarConfig.start, calendarConfig.end).then(result => {
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
                    [sstr.substring(sstr, sstr.length - 3), estr.substring(estr, estr.length - 3)]
                ]
            };

            data.push(event);
        }

        $("#calendar").jqs("import", data);
    }).catch(e => {
        //$("#calendar").jqs(config);
    });
}

submit.addEventListener("click", () => {
    var s = formatDateTime(date.valueAsDate, startHour.value, startMinute.value);
    var e = formatDateTime(date.valueAsDate, endHour.value, endMinute.value);
    var m = member.value;
    var c = grecaptcha.getResponse();

    alertMessage("alert-secondary", "Enregistrement...")

    submitRequest(m, s, e, c).then((rs) => {
        if (rs.status == 200) {
            alertMessage("alert-success", rs.message);
            updateCalendarData(calendarConfig);
        } else {
            alertMessage("alert-danger", rs.message);
        }
    }).catch((e) => {
        alertMessage("alert-secondary", "Erreur rencontrée. Réessayez plus tard.")
    })
});

calNavToday.addEventListener("click", () => {
    calendarConfig = getTodayWeekConfig(new Date());
    updateCalendarData(calendarConfig);
});


calNavPrev.addEventListener("click", () => {
    setPrevWeek(calendarConfig.start);
    updateCalendarData(calendarConfig);
});

calNavNext.addEventListener("click", () => {
    setNextWeek(calendarConfig.start);
    updateCalendarData(calendarConfig);
});

$("#calendar").jqs({
    mode: "read",
    days: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
})

let calendarConfig = getTodayWeekConfig(new Date());

//setPrevWeek(calendarConfig.start);
updateCalendarData(calendarConfig);
