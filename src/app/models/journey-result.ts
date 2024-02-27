export interface JourneyResult {
    journeyExpectation: string
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
    route: Route[]
    plannedDurationInMinutes: number
    actualDurationInMinutes: number
  }
  
  export interface Route {
    name: string
    cancelled: boolean
    plannedDeparture: Date;
    actualDeparture: Date;
  }
  