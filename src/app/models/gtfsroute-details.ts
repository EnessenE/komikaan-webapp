import { GTFSSearchStop } from './gtfssearchstop';
import { GTFSRoute } from './gtfsroute';
import { GTFSShape } from './gtfsshape';
import { GTFSRouteTimetableRow } from './gtfsroute-timetable-row';

export interface GTFSRouteDetails extends GTFSRoute {
    stopCount: number;
    tripCount: number;
    firstRun: string | null;
    lastRun: string | null;
    shapes: GTFSShape[];
    stops: GTFSSearchStop[];
    timetable: GTFSRouteTimetableRow[];
}