import { GTFSRoute } from './gtfsroute';
import { GTFSStopTime } from './gtfsstop-time';

export interface GTFSStop {
    id: string;
    primaryStop: string;
    code: string;
    name: string;
    description: string;

    longitude: number;
    latitude: number;

    lastUpdated: Date;

    zone: string;
    locationType: string;
    parentStation: string;
    platformCode: string;
    dataOrigin: string;
    stopType: StopType;

    departures: GTFSStopTime[];
    relatedStops: GTFSStop[];
    mergedStops: GTFSStop[];
    routes: GTFSRoute[];
}
export enum StopType {
    Bus = 'Bus',
    Train = 'Train',
    Metro = 'Metro',
    Tram = 'Tram',
    Bicycle = 'Bicycle',
    Coach = 'Coach',
    Ferry = 'Ferry',
    CableCar = 'CableCar',
    Gondola = 'Gondola',
    Monorail = 'Monorail',
    Unknown = 'Unknown',
    Mixed = 'Mixed',
}
