import { Time } from '@angular/common';
import { GTFSShape } from './gtfsshape';

export interface GTFSTripStop {
    id: string;
    sequence: number;
    name: string;
    platformCode: string;
    stopHeadsign: string;
    stopType: string;
    cancelled: boolean;

    longitude: number;
    latitude: number;

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
    shapes: GTFSShape[] | null;
}
