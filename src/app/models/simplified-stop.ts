import { StopType } from "./gtfsstop"

export interface SimplifiedStop {
    ids: string[]
    name: string,
    stopType: StopType
}
