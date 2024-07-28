import { GTFSStopTime } from './gtfsstop-time';

export interface GTFSStop {
    id: string;
    code: string;
    name: string;
    description: string;

    longitude: number;
    latitude: number;

    zone: string;
    locationType: string;
    parentStation: string;
    platformCode: string;
    dataOrigin: string;
    stopType: StopType;

    departures: GTFSStopTime[];
    relatedStops: GTFSStop[];
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
