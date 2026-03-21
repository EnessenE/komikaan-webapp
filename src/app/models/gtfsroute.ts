export interface GTFSRoute {
    id: string;
    shortName: string;
    longName: string;
    dataOrigin: string;
    agency: string;
    description: string;
    type: number | string;
    url: string;
    color: string;
    textColor: string;
    lastUpdated: Date;
}
