export interface GTFSStopTime {
    tripId: string;

    plannedArrivalTime?: Date | null;
    plannedDepartureTime?: Date | null;
    actualArrivalTime: Date;
    actualDepartureTime: Date;
    realTime: boolean;

    stopHeadsign: string;
    headsign: string;
    shortName: string;
    routeShortName: string;
    routeLongName: string;
    dataOrigin: string;
    
    operator: string;
    tripScheduleRelationship: string;
    stopScheduleRelationship: string;

    plannedPlatform: string;
    actualPlatform: string;

    routeUrl: string;
    routeType: string;
    routeDesc: string;
    routeColor: string;
    routeTextColor: string;

    canceled: boolean;

    startsBefore: boolean;
    startsFrom: string;
    endsAt: string;
}
