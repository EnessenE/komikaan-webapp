/**
 * Maps a GTFS (extended) route/stop type number, or already-resolved string, to a
 * human-readable transport mode label.
 *
 * Covers both the basic GTFS types (0–7) and the HVT extended types (100–1700).
 * If the value is already a non-empty string (e.g. 'Train') it is returned as-is.
 */
export function gtfsTypeLabel(type: number | string | null | undefined): string {
    if (type == null) return 'Unknown';
    if (typeof type === 'string' && isNaN(Number(type))) return type;

    const t = Number(type);

    // Basic GTFS (0–7)
    if (t === 0) return 'Tram';
    if (t === 1) return 'Metro';
    if (t === 2) return 'Train';
    if (t === 3) return 'Bus';
    if (t === 4) return 'Ferry';
    if (t === 5) return 'Cable car';
    if (t === 6) return 'Gondola';
    if (t === 7) return 'Funicular';

    // HVT extended types
    if (t >= 100 && t <= 199) return 'Train';
    if (t >= 200 && t <= 299) return 'Coach';
    if (t >= 400 && t <= 499) return 'Metro';
    if (t >= 700 && t <= 799) return 'Bus';
    if (t >= 900 && t <= 999) return 'Tram';
    if (t >= 1000 && t <= 1099) return 'Ferry';
    if (t >= 1100 && t <= 1199) return 'Air';
    if (t >= 1200 && t <= 1299) return 'Ferry';
    if (t >= 1300 && t <= 1399) return 'Gondola';
    if (t >= 1400 && t <= 1499) return 'Funicular';
    if (t >= 1500 && t <= 1599) return 'Taxi';
    if (t >= 1700 && t <= 1799) return 'Misc';

    return 'Other';
}

/** Canonical sort order for transport mode groups in UI lists. */
export const GTFS_TYPE_ORDER: readonly string[] = [
    'Train', 'Metro', 'Tram', 'Bus', 'Ferry', 'Coach',
    'Cable car', 'Gondola', 'Funicular', 'Air', 'Taxi', 'Misc', 'Other', 'Unknown',
];
