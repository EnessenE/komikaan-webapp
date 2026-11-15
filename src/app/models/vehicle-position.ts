export interface VehiclePosition {
    lastUpdated: Date;
    id: string;
    tripId: string;
    latitude: number;
    longitude: number;
    stopId: string;
    currentStatus: string;
    measurementTime: Date;
    congestionLevel: string;
    occupancyStatus: string;
    occupancyPercentage?: number;
    vehicleId?: string;
    vehicleLabel?: string;
    vehicleLicensePlate?: string;
}
