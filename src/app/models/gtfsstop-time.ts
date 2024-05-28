export interface GTFSStopTime {
    tripId: string;
    arrivalTime?: string | null;
    departureTime?: string | null;
    stopHeadsign: string;
    shortName: string;
    routeShortName: string;
    routeLongName: string;
    dataOrigin: string;
}
