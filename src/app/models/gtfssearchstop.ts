import { StopType } from './gtfsstop';
import { GTFSStopTime } from './gtfsstop-time';

export interface GTFSSearchStop {
    id: string;
    code: string;
    name: string;
    description: string;

    adjustedCoordinates: SimpleCoordinate[];

    mergedStops: number;
    lastUpdated: Date;

    zone: string;
    locationType: string;
    parentStation: string;
    platformCode: string;
    dataOrigin: string;
    stopType: StopType;

    departures: GTFSStopTime[];
}

export interface SimpleCoordinate{
    longitude: number;
    latitude: number;
}