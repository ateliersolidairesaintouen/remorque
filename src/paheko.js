const fetch = require("node-fetch");

var pahekoClient = class PahekoClient {

    constructor(baseUrl, user, pass) {
        this.baseUrl = baseUrl;
        this.user = user;
        this.pass = pass;
    }

    // Paheko <= 1.3.5
    getMemberActivities = (id, result, failure) => {
        var endpoint = this.baseUrl + "/sql";

        // Requête SQL qui renvoie chaque activité auquelle est inscrit l'utilisateur
        // avec, pour chaque entrée, des informations sur l'utilisateur.
        var sqlRequest = `SELECT u.nom, u.email, u.telephone, u.adresse, u.code_postal, s.id_service, s.date, s.expiry_date FROM services_users s INNER JOIN users u ON u.id = s.id_user WHERE u.numero = ${id}`;

        var authValue = "Basic " + Buffer.from(this.user + ":" + this.pass).toString("base64");
        var headers = new fetch.Headers({
            "Authorization": authValue
        })
        var request = new fetch.Request(endpoint, {
            body: sqlRequest,
            method: "POST",
            headers: headers
        });

        fetch(request).then(res => {
            res.json().then(json => {
                var count = json["count"];
                var results = json["results"];
                if (count <= 1) failure("Adhésion pas à jour");
                else result(results);
            }, _ => failure("Réponse Paheko illisible"));
        }, _ => failure("Paheko inaccessible !"));


    }
}

module.exports = pahekoClient;
