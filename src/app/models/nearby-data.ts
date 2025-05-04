import { GTFSSearchStop } from "./gtfssearchstop";
import { VehiclePosition } from "./vehicle-position";

export interface NearbyData {
    stops: Array<GTFSSearchStop>,
    vehicles: Array<VehiclePosition>,
}
