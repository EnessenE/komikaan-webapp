import { JourneyExpectation } from "../enums/journey-expectation"

export interface JourneyResult {
    journeyExpectation: JourneyExpectation
    disruptions: Disruption[]
    travelAdvice: TravelAdvice[]
  }
  
  export interface Disruption {
    source: string
    title: string
    expectedEnd: Date
    descriptions: string[]
    type: string
    advices: string[]
  }
  
  export interface TravelAdvice {
    source: string
    realistic: boolean
    route: Route[]
    plannedDurationInMinutes: number
    actualDurationInMinutes: number
  }
  
  export interface Route {
    name: string
    cancelled: boolean
    alternativeTransfer: boolean
    realisticTransfer: boolean
    plannedDeparture: Date;
    actualDeparture: Date;
    actualArrival: Date;
    plannedArrival: Date;
  }
  