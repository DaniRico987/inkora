const NOMINATIM_API_URL = 'https://nominatim.openstreetmap.org/search';
const DEFAULT_LANGUAGE = 'es';
const DEFAULT_COUNTRY_CODE = 'co';
const DEFAULT_COUNTRY_NAME = 'colombia';
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 350;
const MAX_BACKOFF_MS = 2500;

type PhotonFeature = {
    geometry?: {
        coordinates?: unknown;
    };
    boundingBox?: [number, number, number, number] | null;
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

type CitySearchContext = {
    boundingBox: [number, number, number, number] | null;
    cityLabel: string;
};

type AddressSearchContext = {
    query: string;
    street: string;
    houseNumber: string;
    neighborhood: string;
    city: string;
    state: string;
};

type SearchCandidate = {
    cacheKey: string;
    searchParams: URLSearchParams;
    context: AddressSearchContext;
};

type CachedCityContext = {
    expiresAt: number;
    context: CitySearchContext | null;
};

const queryFeatureCache = new Map<string, CachedFeatureList>();
const cityContextCache = new Map<string, CachedCityContext>();

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

function parseAddressParts(address: string, city: string): AddressSearchContext {
    const normalizedAddress = address.trim();
    const parts = normalizedAddress.split(',').map((part) => part.trim()).filter(Boolean);
    const firstPart = parts[0] ?? normalizedAddress;
    const secondPart = parts[1] ?? '';
    const thirdPart = parts[2] ?? '';
    const fourthPart = parts[3] ?? '';

    const houseNumberMatch = firstPart.match(/(?:#|\bno\.?|\bnro\.?|\bnum\.?|\bn\.?\s*)\s*([0-9]+(?:[-/][0-9]+)?[a-z]?)/i)
        ?? firstPart.match(/\b([0-9]+(?:[-/][0-9]+)?[a-z]?)\b(?:\s*[-]\s*[0-9]+)?$/i);

    const houseNumber = houseNumberMatch?.[1]?.trim() ?? '';
    const street = normalizePhotonQueryPart(
        firstPart
            .replace(/(?:#|\bno\.?|\bnro\.?|\bnum\.?|\bn\.?\s*)\s*[0-9]+(?:[-/][0-9]+)?[a-z]?/i, ' ')
            .replace(/[\s,]+\d+(?:[-/]\d+)?[a-z]?$/i, ' '),
    );

    return {
        query: buildQuery(address, city),
        street: street,
        houseNumber: normalizePhotonQueryPart(houseNumber),
        neighborhood: normalizePhotonQueryPart(secondPart),
        city: normalizePhotonQueryPart(thirdPart || city),
        state: normalizePhotonQueryPart(fourthPart),
    };
}

function buildCityQueryCandidates(city: string): string[] {
    const normalizedCity = normalizePhotonQueryPart(city);
    const normalizedCountry = normalizePhotonQueryPart(DEFAULT_COUNTRY_NAME);

    const candidates = [
        [normalizedCity, normalizedCountry].filter(Boolean).join(', '),
        [normalizedCity, normalizedCountry].filter(Boolean).join(' '),
        normalizedCity,
    ];

    return candidates.filter((query, index) => Boolean(query) && candidates.indexOf(query) === index);
}

function buildSearchCandidates(address: string, city: string, cityContext: CitySearchContext | null): SearchCandidate[] {
    const parts = parseAddressParts(address, city);
    const cityContextLabel = normalizePhotonQueryPart(cityContext?.cityLabel ?? city);
    const normalizedCountry = normalizePhotonQueryPart(DEFAULT_COUNTRY_NAME);

    const addressLine = [parts.street, parts.houseNumber].filter(Boolean).join(' ').trim();
    const resolvedCity = parts.city || cityContextLabel;
    const detailedLocation = [addressLine, parts.neighborhood, resolvedCity, parts.state, normalizedCountry]
        .filter(Boolean)
        .join(', ');

    const structuredParams = new URLSearchParams({
        format: 'json',
        addressdetails: '1',
        limit: '10',
        countrycodes: DEFAULT_COUNTRY_CODE,
        'accept-language': DEFAULT_LANGUAGE,
    });

    if (addressLine) {
        structuredParams.set('street', addressLine);
    }

    if (resolvedCity) {
        structuredParams.set('city', resolvedCity);
    }

    if (parts.state) {
        structuredParams.set('state', parts.state);
    }

    structuredParams.set('country', 'Colombia');

    const freeformParams = new URLSearchParams({
        q: detailedLocation || buildQuery(address, city),
        format: 'json',
        addressdetails: '1',
        limit: '10',
        countrycodes: DEFAULT_COUNTRY_CODE,
        'accept-language': DEFAULT_LANGUAGE,
    });

    if (cityContext?.boundingBox) {
        freeformParams.set('viewbox', buildViewboxParam(cityContext.boundingBox));
        freeformParams.set('bounded', '1');
    }

    return [
        {
            cacheKey: `structured:${addressLine}|${resolvedCity}|${parts.state}|${normalizedCountry}`,
            searchParams: structuredParams,
            context: { ...parts, city: resolvedCity },
        },
        {
            cacheKey: `free:${detailedLocation || buildQuery(address, city)}`,
            searchParams: freeformParams,
            context: { ...parts, city: resolvedCity },
        },
    ].filter((candidate) => candidate.searchParams.toString().length > 0);
}

function buildQueryCandidates(address: string, city: string): string[] {
    const rawQuery = buildQuery(address, city);

    if (!rawQuery) {
        return [];
    }

    const normalizedAddress = normalizePhotonQueryPart(address);
    const normalizedCity = normalizePhotonQueryPart(city);
    const normalizedCountry = normalizePhotonQueryPart(DEFAULT_COUNTRY_NAME);

    const candidates = [
        [normalizedAddress, normalizedCity, normalizedCountry].filter(Boolean).join(', '),
        [normalizedAddress, normalizedCountry].filter(Boolean).join(', '),
        [normalizedAddress, normalizedCity].filter(Boolean).join(', '),
        [normalizedAddress, normalizedCity].filter(Boolean).join(' '),
        normalizedAddress.replace(/\s+/g, ' ').trim(),
        normalizedCity.replace(/\s+/g, ' ').trim(),
        [normalizedAddress, normalizedCountry].filter(Boolean).join(' '),
    ];

    return candidates.filter((query, index) => Boolean(query) && candidates.indexOf(query) === index);
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

function buildCityCacheKey(city: string): string {
    return normalizeText(city);
}

function getCachedCityContext(cacheKey: string): CitySearchContext | null {
    const cachedEntry = cityContextCache.get(cacheKey);

    if (!cachedEntry) {
        return null;
    }

    if (cachedEntry.expiresAt <= Date.now()) {
        cityContextCache.delete(cacheKey);
        return null;
    }

    return cachedEntry.context;
}

function setCachedCityContext(cacheKey: string, context: CitySearchContext | null): void {
    cityContextCache.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        context,
    });
}

function parseBoundingBox(value: unknown): [number, number, number, number] | null {
    if (!Array.isArray(value) || value.length < 4) {
        return null;
    }

    const south = Number(value[0]);
    const north = Number(value[1]);
    const west = Number(value[2]);
    const east = Number(value[3]);

    if (![south, north, west, east].every(Number.isFinite)) {
        return null;
    }

    return [south, north, west, east];
}

function buildViewboxParam(boundingBox: [number, number, number, number]): string {
    const [south, north, west, east] = boundingBox;
    return `${west},${north},${east},${south}`;
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

function getFeatureStreet(feature: PhotonFeature): string | null {
    return feature.properties?.street?.trim() || null;
}

function getFeatureHouseNumber(feature: PhotonFeature): string | null {
    return feature.properties?.housenumber?.trim() || null;
}

function getFeatureNeighborhood(feature: PhotonFeature): string | null {
    return feature.properties?.locality?.trim() || feature.properties?.district?.trim() || null;
}

function getFeatureState(feature: PhotonFeature): string | null {
    return feature.properties?.state?.trim() || null;
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

function matchesCountry(feature: PhotonFeature): boolean {
    const country = feature.properties?.country?.trim();

    if (!country) {
        return false;
    }

    const normalizedCountry = normalizeText(country);
    return normalizedCountry.includes(DEFAULT_COUNTRY_NAME) || DEFAULT_COUNTRY_NAME.includes(normalizedCountry);
}

async function resolveCityContext(city: string, signal?: AbortSignal): Promise<CitySearchContext | null> {
    const cleanCity = city.trim();

    if (!cleanCity) {
        return null;
    }

    const cacheKey = buildCityCacheKey(cleanCity);
    const cachedContext = getCachedCityContext(cacheKey);

    if (cachedContext) {
        return cachedContext;
    }

    for (const query of buildCityQueryCandidates(cleanCity)) {
        const searchParams = new URLSearchParams({
            q: query,
            format: 'json',
            addressdetails: '1',
            limit: '10',
            countrycodes: DEFAULT_COUNTRY_CODE,
            'accept-language': DEFAULT_LANGUAGE,
        });

        const features = await fetchPhotonFeatures(searchParams, `city:${normalizeText(query)}`, signal);
        const filteredFeatures = features.filter((feature) => matchesCountry(feature));

        for (const feature of filteredFeatures) {
            const featureCity = getFeatureCity(feature);

            if (featureCity && !matchesCity(feature, cleanCity)) {
                continue;
            }

            const boundingBox = feature.boundingBox;
            const context = {
                boundingBox: boundingBox ?? null,
                cityLabel: featureCity ?? cleanCity,
            } satisfies CitySearchContext;

            setCachedCityContext(cacheKey, context);
            return context;
        }
    }

    setCachedCityContext(cacheKey, null);
    return null;
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

function scoreFeatureMatch(context: AddressSearchContext, feature: PhotonFeature): number {
    const normalizedQuery = normalizeText(context.query);
    const normalizedLabel = normalizeText(buildFeatureLabel(feature));
    const normalizedCity = normalizeText(getFeatureCity(feature) ?? '');
    const normalizedStreet = normalizeText(getFeatureStreet(feature) ?? '');
    const normalizedHouseNumber = normalizeText(getFeatureHouseNumber(feature) ?? '');
    const normalizedNeighborhood = normalizeText(getFeatureNeighborhood(feature) ?? '');
    const normalizedState = normalizeText(getFeatureState(feature) ?? '');

    const queryTokens = normalizedQuery.split(' ').filter((token) => token.length > 1);
    const labelTokens = normalizedLabel.split(' ').filter((token) => token.length > 1);
    const queryTokenSet = new Set(queryTokens);
    const tokenMatches = labelTokens.filter((token) => queryTokenSet.has(token)).length;
    const tokenScore = queryTokens.length > 0 ? tokenMatches / queryTokens.length : 0;

    const maxLength = Math.max(normalizedQuery.length, normalizedLabel.length, 1);
    const distanceScore = 1 - levenshteinDistance(normalizedQuery, normalizedLabel) / maxLength;
    const cityBonus = normalizedCity && normalizedQuery.includes(normalizedCity) ? 0.15 : 0;
    const streetBonus = context.street && normalizedStreet.includes(context.street) ? 0.25 : 0;
    const houseNumberBonus = context.houseNumber && normalizedHouseNumber.includes(context.houseNumber) ? 0.35 : 0;
    const neighborhoodBonus = context.neighborhood && normalizedNeighborhood.includes(context.neighborhood) ? 0.08 : 0;
    const stateBonus = context.state && normalizedState.includes(context.state) ? 0.08 : 0;
    const exactHousePenalty = context.houseNumber && !normalizedHouseNumber ? -0.25 : 0;

    return Math.max(
        0,
        tokenScore * 0.25 +
        Math.max(0, distanceScore) * 0.2 +
        cityBonus +
        streetBonus +
        houseNumberBonus +
        neighborhoodBonus +
        stateBonus +
        exactHousePenalty,
    );
}

function sortFeaturesByQuery(context: AddressSearchContext, features: PhotonFeature[]): PhotonFeature[] {
    return [...features].sort((left, right) => scoreFeatureMatch(context, right) - scoreFeatureMatch(context, left));
}

async function fetchPhotonFeatures(
    searchParams: URLSearchParams,
    cacheKey: string,
    signal?: AbortSignal,
    cityContext?: CitySearchContext | null,
): Promise<PhotonFeature[]> {
    const cachedFeatures = getCachedFeatures(cacheKey);

    if (cachedFeatures) {
        return cachedFeatures;
    }

    if (cityContext?.boundingBox) {
        searchParams.set('viewbox', buildViewboxParam(cityContext.boundingBox));
        searchParams.set('bounded', '1');
    }

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
                    boundingBox: parseBoundingBox(item.boundingbox),
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
    const cityContext = await resolveCityContext(city, options.signal);
    const candidates = buildSearchCandidates(address, city, cityContext);

    for (const candidate of candidates) {
        const features = await fetchPhotonFeatures(candidate.searchParams, candidate.cacheKey, options.signal, cityContext);
        const filteredFeatures = features.filter((feature) => matchesCountry(feature));
        const cityFilteredFeatures = strictCityMatch
            ? filteredFeatures.filter((feature) => matchesCity(feature, city))
            : filteredFeatures;

        if (cityFilteredFeatures.length > 0) {
            return sortFeaturesByQuery(candidate.context, cityFilteredFeatures);
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

    const bestScore = scoreFeatureMatch(parseAddressParts(address, city), bestFeature);

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

