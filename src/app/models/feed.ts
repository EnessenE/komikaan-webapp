export interface Feed {
    name: string,
    interval: Date,
    lastUpdated: Date,
    lastChecked: Date,
    lastAttempt: Date,
    downloadPending: boolean,
    agencies: number,
    routes: number,
    stops: number,
    trips: number,
}
