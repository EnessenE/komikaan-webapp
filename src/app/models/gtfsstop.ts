import { GTFSStopTime } from "./gtfsstop-time";

export interface GTFSStop {
    id: string,
    code: string,
    name: string,
    description: string,

    longitude: number;
    latitude: number;

    zone: string,
    locationType: string,
    parentStation: string,
    platformCode: string,
    dataOrigin: string,

    departures: GTFSStopTime[];
    relatedStops: GTFSStop[];
}
