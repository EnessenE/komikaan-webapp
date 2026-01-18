import { Time } from '@angular/common';
import { GTFSShape } from './gtfsshape';

export interface GTFSTripStop {
    id: string;
    sequence: number;
    name: string;
    platformCode: string;
    stopHeadsign: string;
    stopType: string;
    canceled: boolean;
    stopScheduleRelationship: string;
    tripScheduleRelationship: string;
    
    longitude: number;
    latitude: number;

    plannedPlatform: string;
    actualPlatform: string;
    plannedArrivalTime: Date;
    plannedDepartureTime?: Date | null;
    actualArrivalTime: Date;
    actualDepartureTime?: Date | null;
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

    latitude?: number | null;
    longitude?: number | null;
    currentStatus?: string | null;
    congestionLevel?: string | null;
    occupancyStatus?: string | null;
    occupancyPercentage?: number | null;
    measurementTime?: string | null;
    enrouteTo?: string | null;

    targetStopId?: string | null;
    targetStopName?: string | null;
    
    targetStopType?: string | null;

    routeShortName?: string | null;
    routeLongName?: string | null;

    stops: GTFSTripStop[] | null;
    shapes: GTFSShape[] | null;
}
