export interface GTFSStopTime {
    tripId: string;
    arrivalTime?: string | null;
    departureTime?: string | null;
    stopHeadsign: string;
    headsign: string;
    shortName: string;
    routeShortName: string;
    routeLongName: string;
    dataOrigin: string;
}
