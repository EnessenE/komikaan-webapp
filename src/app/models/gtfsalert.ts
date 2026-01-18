export interface Alert {
    dataOrigin: string;
    created: string; // Or Date, if you parse it
    lastUpdated: string; // Or Date
    id: string;
    isDeleted: boolean;
    cause: string;
    effect: string;
    url: string;
    headerText: string;
    descriptionText: string;
    ttsHeaderText: string;
    ttsDescriptionText: string;
    severityLevel: string; // Or string
    startTime: Date;
    endTime: Date;
}