export interface TrainStationPerformance {
    primaryStopId: string;
    stopId: string;
    stopName: string;
    stopType: number;
    dataOrigin: string;
    latitude: number;
    longitude: number;
    onTimePercentage: number;
    onTimeCount: number;
    delayCount: number;
    cancellationCount: number;
    totalTripsCount: number;
}
