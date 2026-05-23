import { GTFSSearchStop } from './gtfssearchstop';
import { GTFSShape } from './gtfsshape';

export interface MapViewportData {
    shapes: GTFSShape[];
    stops: GTFSSearchStop[];
}