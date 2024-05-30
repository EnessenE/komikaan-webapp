import { Time } from '@angular/common';

export interface GTFSTripStop {
    id: string;
    sequence: number;
    name: string;
    platformCode: string;
    stopHeadsign: string;
    cancelled: boolean;

    plannedPlatform: string;
    actualPlatform: string;
    plannedArrivalTime?: Time | null;
    plannedDepartureTime?: Time | null;
    actualArrivalTime?: Time | null;
    actualDepartureTime?: Time | null;
}

export interface GTFSTrip {
    id: string;
    routeid: string;
    serviceId: string;
    headsign: string;
    shortname: string;
    direction: string;
    blockId: string;
    dataOrigin: string;

    stops: GTFSTripStop[] | null;
}
