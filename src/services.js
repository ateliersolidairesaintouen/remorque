var service = class Service {
    constructor(
        id,
        name,
        googleCalendarId,
        mailConfirmationSubject,
        mailConfirmationContent,
        pahekoActivityId,
        codePrivateKey
    ) {
        this.id = id;
        this.name = name;
        this.googleCalendarId = googleCalendarId;
        this.mailConfirmationSubject = mailConfirmationSubject;
        this.mailConfirmationContent = mailConfirmationContent;
        this.pahekoActivityId = pahekoActivityId;
        this.codePrivateKey = codePrivateKey;
    }

    static prepareServices(configServices) {
        return configServices.map(it => new Service(
            it.id,
            it.name,
            it.googleCalendarId,
            it.mailConfirmationSubject,
            it.mailConfirmationContent,
            it.pahekoActivityId,
            it.codePrivateKey
        ))
    }

    static getServiceById(services, id) {
        for (let i = 0; i < services.length; ++i) {
            let it = services[i];
            if (it.id == id) return it;
        }
        return null;
    }
}

module.exports = service;
