import { DataSource } from '../enums/datasource';
import { JourneyExpectation } from '../enums/journey-expectation';

export interface JourneyResult {
    journeyExpectation: JourneyExpectation;
    disruptions: Disruption[];
    travelAdvice: TravelAdvice[];
}

export interface Disruption {
    source: DataSource;
    title: string;
    start: Date;
    expectedEnd: Date;
    descriptions: string[];
    type: string;
    url: string;
    advices: string[];
    affectedStops: string[];
}

export interface TravelAdvice {
    source: DataSource;
    route: RoutePart[];
    plannedDurationInMinutes: number;
    actualDurationInMinutes: number | null;

    //Web-app related values
    //TODO: move them?
    realistic: boolean;
    pinned: boolean | false;
    oldData: boolean | false;
}

export interface RoutePart {
    departureStation: string;
    arrivalStation: string;

    type: string;
    cancelled: boolean;
    alternativeTransport: boolean;
    realisticTransfer: boolean;

    plannedDeparture: Date;
    plannedArrival: Date | null;

    actualDeparture: Date | null;
    actualArrival: Date | null;

    plannedArrivalTrack: string | null;
    plannedDepartureTrack: string | null;

    actualArrivalTrack: string | null;
    actualDepartureTrack: string | null;

    direction: string | null;
    lineName: string | null;
    operator: string | null;

    stops: JourneyStop[];
}

export interface JourneyStop{
    name: string;

    plannedDeparture: Date;
    plannedArrival: Date | null;

    actualDeparture: Date | null;
    actualArrival: Date | null;

    plannedArrivalTrack: string | null;
    plannedDepartureTrack: string | null;

    actualArrivalTrack: string | null;
    actualDepartureTrack: string | null;

    longitude: number;
    latitude: number;
}