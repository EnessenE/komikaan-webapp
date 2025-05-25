export interface Alert {
    dataOrigin: string;
    internalId: string;
    created: string; // Or Date, if you parse it
    lastUpdated: string; // Or Date
    id: string;
    isDeleted: boolean;
    activePeriods: string; // Or a more specific type if the structure is known, e.g., { start: string, end: string }[]
    cause: string;
    effect: string;
    url: string;
    headerText: string;
    descriptionText: string;
    ttsHeaderText: string;
    ttsDescriptionText: string;
    severityLevel: number; // Or string
}