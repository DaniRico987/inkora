const NOMINATIM_API_URL = 'https://nominatim.openstreetmap.org/search';
const DEFAULT_LANGUAGE = 'es';
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 350;
const MAX_BACKOFF_MS = 2500;

type PhotonFeature = {
    geometry?: {
        coordinates?: unknown;
    };
    properties?: {
        city?: string | null;
        country?: string | null;
        district?: string | null;
        housenumber?: string | null;
        locality?: string | null;
        name?: string | null;
        postcode?: string | null;
        state?: string | null;
        street?: string | null;
    };
};

type CachedFeatureList = {
    expiresAt: number;
    features: PhotonFeature[];
};

const queryFeatureCache = new Map<string, CachedFeatureList>();

export type GeocodeResult = {
    latitude: number;
    longitude: number;
    label: string;
    city: string | null;
};

export type AddressSuggestion = {
    label: string;
    city: string | null;
};

export type GeocodeAddressOptions = {
    signal?: AbortSignal;
};

function normalizeText(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');
}

function normalizePhotonQueryPart(value: string): string {
    const normalized = normalizeText(value);

    return normalized
        .replace(/\b(cra|cr|kra|kr)\.?\b/g, 'carrera')
        .replace(/\b(cl|cll|cal|call|calle)\.?\b/g, 'calle')
        .replace(/\b(av|avda|avd|avenida)\.?\b/g, 'avenida')
        .replace(/\b(tv|transv|transversal)\.?\b/g, 'transversal')
        .replace(/\b(diag|diagonal)\.?\b/g, 'diagonal')
        .replace(/\b(no|nro|num|numero)\.?\b/g, ' ')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function buildQuery(address: string, city: string): string {
    const cleanAddress = address.trim();
    const cleanCity = city.trim();

    if (cleanAddress && cleanCity) {
        return `${cleanAddress}, ${cleanCity}`;
    }

    return cleanAddress || cleanCity;
}

function buildQueryCandidates(address: string, city: string): string[] {
    const rawQuery = buildQuery(address, city);

    if (!rawQuery) {
        return [];
    }

    const normalizedAddress = normalizePhotonQueryPart(address);
    const normalizedCity = normalizePhotonQueryPart(city);

    const candidates = [
        [normalizedAddress, normalizedCity].filter(Boolean).join(', '),
        [normalizedAddress, normalizedCity].filter(Boolean).join(' '),
        normalizedAddress.replace(/\s+/g, ' ').trim(),
        normalizedCity.replace(/\s+/g, ' ').trim(),
    ];

    return candidates.filter((query, index) => Boolean(query) && candidates.indexOf(query) === index);
}

function buildCacheKey(query: string): string {
    return normalizeText(query);
}

function getCachedFeatures(cacheKey: string): PhotonFeature[] | null {
    const cachedEntry = queryFeatureCache.get(cacheKey);

    if (!cachedEntry) {
        return null;
    }

    if (cachedEntry.expiresAt <= Date.now()) {
        queryFeatureCache.delete(cacheKey);
        return null;
    }

    return cachedEntry.features;
}

function setCachedFeatures(cacheKey: string, features: PhotonFeature[]): void {
    queryFeatureCache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        features,
    });
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
            return;
        }

        const timeoutId = window.setTimeout(() => {
            cleanup();
            resolve();
        }, ms);

        const onAbort = (): void => {
            cleanup();
            reject(new DOMException('The operation was aborted.', 'AbortError'));
        };

        const cleanup = (): void => {
            window.clearTimeout(timeoutId);
            signal?.removeEventListener('abort', onAbort);
        };

        signal?.addEventListener('abort', onAbort, { once: true });
    });
}

function isRetryableStatus(status: number): boolean {
    return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function getBackoffDelayMs(attempt: number, retryAfterHeader: string | null): number {
    if (retryAfterHeader) {
        const parsedSeconds = Number(retryAfterHeader);

        if (Number.isFinite(parsedSeconds) && parsedSeconds >= 0) {
            return Math.min(parsedSeconds * 1000, MAX_BACKOFF_MS);
        }
    }

    const exponentialDelay = BASE_BACKOFF_MS * 2 ** attempt;
    const jitter = Math.round(Math.random() * 150);

    return Math.min(exponentialDelay + jitter, MAX_BACKOFF_MS);
}

function getFeatureLocationLabel(feature: PhotonFeature): string {
    const properties = feature.properties;

    if (!properties) {
        return '';
    }

    const segments = [
        properties.name,
        properties.street,
        properties.housenumber,
        properties.postcode,
        properties.city,
        properties.district,
        properties.state,
        properties.country,
    ]
        .map((value) => value?.trim() ?? '')
        .filter((value, index, values) => value.length > 0 && values.indexOf(value) === index);

    return segments.join(', ');
}

function buildFeatureLabel(feature: PhotonFeature): string {
    const label = getFeatureLocationLabel(feature);

    if (label) {
        return label;
    }

    const properties = feature.properties;
    const fallbackSegments = [
        properties?.street,
        properties?.housenumber,
        properties?.city,
        properties?.district,
        properties?.state,
        properties?.country,
    ]
        .map((value) => value?.trim() ?? '')
        .filter(Boolean);

    return fallbackSegments.join(', ');
}

function getFeatureCity(feature: PhotonFeature): string | null {
    const properties = feature.properties;

    if (!properties) {
        return null;
    }

    return (
        properties.city?.trim() ||
        properties.locality?.trim() ||
        properties.district?.trim() ||
        properties.state?.trim() ||
        properties.country?.trim() ||
        null
    );
}

function matchesCity(feature: PhotonFeature, city: string): boolean {
    const cleanCity = city.trim();

    if (!cleanCity) {
        return true;
    }

    const normalizedCity = normalizeText(cleanCity);
    const candidates = [
        feature.properties?.city,
        feature.properties?.locality,
        feature.properties?.district,
        feature.properties?.state,
        feature.properties?.country,
    ].filter((value): value is string => Boolean(value?.trim()));

    if (candidates.length === 0) {
        return false;
    }

    const normalizedCityTokens = normalizedCity.split(' ').filter((token) => token.length > 1);

    return candidates.some((candidate) => {
        const normalizedCandidate = normalizeText(candidate);
        if (normalizedCandidate.includes(normalizedCity) || normalizedCity.includes(normalizedCandidate)) {
            return true;
        }

        const candidateTokens = normalizedCandidate.split(' ').filter((token) => token.length > 1);
        if (normalizedCityTokens.length === 0 || candidateTokens.length === 0) {
            return false;
        }

        const tokenMatches = candidateTokens.filter((token) => normalizedCityTokens.includes(token)).length;
        const overlapRatio = tokenMatches / Math.min(normalizedCityTokens.length, candidateTokens.length);

        return tokenMatches >= 1 && overlapRatio >= 0.5;
    });
}

function levenshteinDistance(left: string, right: string): number {
    if (left === right) {
        return 0;
    }

    if (left.length === 0) {
        return right.length;
    }

    if (right.length === 0) {
        return left.length;
    }

    const previousRow = Array.from({ length: right.length + 1 }, (_, index) => index);

    for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
        const currentRow = [leftIndex];

        for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
            const insertionCost = currentRow[rightIndex - 1] + 1;
            const deletionCost = previousRow[rightIndex] + 1;
            const substitutionCost = previousRow[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1);
            currentRow.push(Math.min(insertionCost, deletionCost, substitutionCost));
        }

        for (let index = 0; index < previousRow.length; index += 1) {
            previousRow[index] = currentRow[index];
        }
    }

    return previousRow[right.length];
}

function scoreFeatureMatch(query: string, feature: PhotonFeature): number {
    const normalizedQuery = normalizeText(query);
    const normalizedLabel = normalizeText(buildFeatureLabel(feature));
    const normalizedCity = normalizeText(getFeatureCity(feature) ?? '');

    const queryTokens = normalizedQuery.split(' ').filter((token) => token.length > 1);
    const labelTokens = normalizedLabel.split(' ').filter((token) => token.length > 1);
    const queryTokenSet = new Set(queryTokens);
    const tokenMatches = labelTokens.filter((token) => queryTokenSet.has(token)).length;
    const tokenScore = queryTokens.length > 0 ? tokenMatches / queryTokens.length : 0;

    const maxLength = Math.max(normalizedQuery.length, normalizedLabel.length, 1);
    const distanceScore = 1 - levenshteinDistance(normalizedQuery, normalizedLabel) / maxLength;
    const cityBonus = normalizedCity && normalizedQuery.includes(normalizedCity) ? 0.15 : 0;

    return Math.max(0, tokenScore * 0.6 + Math.max(0, distanceScore) * 0.4 + cityBonus);
}

function sortFeaturesByQuery(query: string, features: PhotonFeature[]): PhotonFeature[] {
    return [...features].sort((left, right) => scoreFeatureMatch(query, right) - scoreFeatureMatch(query, left));
}

async function fetchPhotonFeatures(query: string, signal?: AbortSignal): Promise<PhotonFeature[]> {
    const cacheKey = buildCacheKey(query);
    const cachedFeatures = getCachedFeatures(cacheKey);

    if (cachedFeatures) {
        return cachedFeatures;
    }

    const searchParams = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '10',
        'accept-language': DEFAULT_LANGUAGE,
    });

    const url = `${NOMINATIM_API_URL}?${searchParams.toString()}`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
        const response = await fetch(url, {
            signal,
            headers: {
                // Nominatim policy requests a valid User-Agent; include a simple app name
                'User-Agent': 'inkora-client/1.0 (+https://example.com)',
            },
        });

        if (response.status === 400) {
            setCachedFeatures(cacheKey, []);
            return [];
        }

        if (response.ok) {
            const data = (await response.json()) as any[];

            if (!Array.isArray(data)) {
                setCachedFeatures(cacheKey, []);
                return [];
            }

            // Map Nominatim results to our PhotonFeature-like shape so existing helpers continue working
            const mapped: PhotonFeature[] = data.map((item) => {
                const lat = item.lat;
                const lon = item.lon;
                const address = item.address ?? {};

                const properties: Record<string, string | null> = {
                    name: (item.display_name as string) ?? null,
                    street: (address.road as string) ?? null,
                    housenumber: (address.house_number as string) ?? null,
                    postcode: (address.postcode as string) ?? null,
                    city: (address.city as string) ?? (address.town as string) ?? (address.village as string) ?? null,
                    locality: (address.suburb as string) ?? null,
                    district: (address.county as string) ?? null,
                    state: (address.state as string) ?? null,
                    country: (address.country as string) ?? null,
                };

                return {
                    geometry: {
                        coordinates: [Number(lon), Number(lat)],
                    },
                    properties,
                };
            });

            setCachedFeatures(cacheKey, mapped);
            return mapped;
        }

        if (!isRetryableStatus(response.status) || attempt === MAX_RETRIES) {
            break;
        }

        const retryDelayMs = getBackoffDelayMs(attempt, response.headers.get('retry-after'));
        await delay(retryDelayMs, signal);
    }

    throw new Error('No se pudo consultar Nominatim para geocodificar la dirección');
}

async function searchPhotonFeatures(
    address: string,
    city: string,
    options: GeocodeAddressOptions = {},
    strictCityMatch = true,
): Promise<PhotonFeature[]> {
    const queryCandidates = buildQueryCandidates(address, city);

    for (const query of queryCandidates) {
        const features = await fetchPhotonFeatures(query, options.signal);
        const filteredFeatures = strictCityMatch ? features.filter((feature) => matchesCity(feature, city)) : features;

        if (filteredFeatures.length > 0) {
            return sortFeaturesByQuery(query, filteredFeatures);
        }
    }

    return [];
}

function toGeocodeResult(feature: PhotonFeature): GeocodeResult | null {
    const coordinates = feature.geometry?.coordinates;

    if (!Array.isArray(coordinates) || coordinates.length < 2) {
        return null;
    }

    const [longitudeValue, latitudeValue] = coordinates;
    const longitude = Number(longitudeValue);
    const latitude = Number(latitudeValue);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
    }

    return {
        latitude,
        longitude,
        label: buildFeatureLabel(feature),
        city: getFeatureCity(feature),
    };
}

function dedupeStrings(values: string[]): string[] {
    return values.filter((value, index) => values.indexOf(value) === index);
}

export async function geocodeAddress(
    address: string,
    city: string,
    options: GeocodeAddressOptions = {},
): Promise<GeocodeResult | null> {
    if (!buildQueryCandidates(address, city).length) {
        return null;
    }

    const strictFeatures = await searchPhotonFeatures(address, city, options, true);

    if (strictFeatures.length > 0) {
        return toGeocodeResult(strictFeatures[0]);
    }

    const tolerantFeatures = await searchPhotonFeatures(address, city, options, false);

    if (tolerantFeatures.length === 0) {
        return null;
    }

    const bestFeature = tolerantFeatures[0];
    const bestResult = toGeocodeResult(bestFeature);

    if (!bestResult) {
        return null;
    }

    const bestScore = scoreFeatureMatch(buildQuery(address, city), bestFeature);

    return bestScore >= 0.45 ? bestResult : null;
}

export async function getAddressSuggestions(
    address: string,
    city: string,
    options: GeocodeAddressOptions = {},
): Promise<AddressSuggestion[]> {
    if (!buildQueryCandidates(address, city).length) {
        return [];
    }

    try {
        const features = await searchPhotonFeatures(address, city, options, false);
        const labels = dedupeStrings(
            features
                .map((feature) => buildFeatureLabel(feature).trim())
                .filter((label) => label.length > 0),
        );

        return labels.slice(0, 5).map((label) => ({
            label,
            city: null,
        }));
    } catch {
        return [];
    }
}

