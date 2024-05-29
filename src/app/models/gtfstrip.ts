import { Time } from "@angular/common";

export interface GTFSTrip {
    id: string;
    sequence: number;
    name: string;
    platformCode: string;
    cancelled: boolean;

    plannedPlatform: string;
    actualPlatform: string;
    plannedArrivalTime?: Time | null;
    plannedDepartureTime?: Time | null;
    actualArrivalTime?: Time | null;
    actualDepartureTime?: Time | null;
}
