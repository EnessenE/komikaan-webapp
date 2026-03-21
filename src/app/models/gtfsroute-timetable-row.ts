export interface GTFSRouteTimetableRow {
    stopId: string;
    stopName: string;
    stopSequence: number;
    tripId: string;
    tripHeadsign: string;
    /** Static GTFS time string "HH:mm:ss", null for pass-through stops */
    /** Static GTFS time string "HH:mm:ss", null/undefined for pass-through stops */
    departureTime: string | null | undefined;
}
