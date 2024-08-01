import { Time } from "@angular/common";

export interface GTFSStopTime {
    tripId: string;

    plannedArrivalTime?: Date | null;
    plannedDepartureTime?: Date | null;
    actualArrivalTime: Date;
    actualDepartureTime: Date;

    stopHeadsign: string;
    headsign: string;
    shortName: string;
    routeShortName: string;
    routeLongName: string;
    dataOrigin: string;
    
    operator: string;

    plannedPlatform: string;
    actualPlatform: string;

    routeUrl: string;
    routeType: string;
    routeDesc: string;
    routeColor: string;
    routeTextColor: string;

    cancelled: boolean;
}
