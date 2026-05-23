export interface TopDelayedStop {
    primaryStopId: string;
    stopId: string;
    stopName: string;
    stopType: number | string;
    dataOrigin: string;
    averageDelay: number | null;
    delayCount: number;
    cancellationCount: number;
    maxDelay: number | null;
    minDelay: number | null;
}
