import { Time } from "@angular/common";

export interface GTFSStopTime {
    tripId: string;

    plannedArrivalTime?: Time | null;
    plannedDepartureTime?: Time | null;
    actualArrivalTime?: Time | null;
    actualDepartureTime?: Time | null;

    stopHeadsign: string;
    headsign: string;
    shortName: string;
    routeShortName: string;
    routeLongName: string;
    dataOrigin: string;
    
    operator: string;

    plannedPlatform: string;
    actualPlatform: string;

    cancelled: boolean;
}
