export type LocationOption = {
    label: string;
    value: string;
};

type ColombiaDepartment = {
    id: number;
    name: string;
};

type ColombiaCity = {
    id: number;
    name: string;
};

type RestCountry = {
    name?: {
        common?: string;
    };
};

type CountriesNowStatesResponse = {
    error?: boolean;
    data?: {
        states?: Array<{ name?: string }>;
    };
};

type CountriesNowCitiesResponse = {
    error?: boolean;
    data?: string[];
};

const colombiaDepartmentIdsByName = new Map<string, number>();

function normalizeStateName(value: string) {
    return value
        .replace(/\s+department$/i, '')
        .replace(/\s+province$/i, '')
        .trim();
}

async function loadColombiaDepartments(): Promise<LocationOption[]> {
    const response = await fetch('https://api-colombia.com/api/v1/Department');
    if (!response.ok) {
        return [];
    }

    const departments = (await response.json()) as ColombiaDepartment[];
    colombiaDepartmentIdsByName.clear();

    const normalized = departments
        .map((department) => ({
            id: department.id,
            name: department.name?.trim() || '',
        }))
        .filter((department) => Boolean(department.name))
        .map((department) => {
            colombiaDepartmentIdsByName.set(department.name.toLowerCase(), department.id);
            return {
                label: department.name,
                value: department.name,
            } satisfies LocationOption;
        })
        .sort((left, right) => left.label.localeCompare(right.label, 'es'));

    return normalized;
}

async function loadColombiaCitiesByDepartmentName(departmentName: string): Promise<LocationOption[]> {
    const normalizedName = departmentName.trim().toLowerCase();
    let departmentId = colombiaDepartmentIdsByName.get(normalizedName);

    if (!departmentId) {
        await loadColombiaDepartments();
        departmentId = colombiaDepartmentIdsByName.get(normalizedName);
    }

    if (!departmentId) {
        return [];
    }

    const response = await fetch(`https://api-colombia.com/api/v1/Department/${departmentId}/cities`);
    if (!response.ok) {
        return [];
    }

    const cities = (await response.json()) as ColombiaCity[];

    return cities
        .map((city) => city.name?.trim())
        .filter((city): city is string => Boolean(city))
        .map((city) => ({ label: city, value: city }))
        .sort((left, right) => left.label.localeCompare(right.label, 'es'));
}

export async function getCountries(): Promise<LocationOption[]> {
    const response = await fetch('https://restcountries.com/v3.1/all?fields=name');
    if (!response.ok) {
        return [{ label: 'Colombia', value: 'Colombia' }];
    }

    const countries = (await response.json()) as RestCountry[];
    const normalized = countries
        .map((country) => country.name?.common?.trim())
        .filter((country): country is string => Boolean(country))
        .map((country) => ({ label: country, value: country }))
        .sort((left, right) => {
            if (left.value === 'Colombia') return -1;
            if (right.value === 'Colombia') return 1;
            return left.label.localeCompare(right.label, 'es');
        });

    if (!normalized.some((country) => country.value === 'Colombia')) {
        normalized.unshift({ label: 'Colombia', value: 'Colombia' });
    }

    return normalized;
}

export async function getStates(country: string): Promise<LocationOption[]> {
    if (country.trim().toLowerCase() === 'colombia') {
        const colombiaStates = await loadColombiaDepartments();
        if (colombiaStates.length) {
            return colombiaStates;
        }
    }

    const response = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ country }),
    });

    if (!response.ok) {
        return [];
    }

    const payload = (await response.json()) as CountriesNowStatesResponse;
    const states = payload.data?.states ?? [];

    return states
        .map((state) => state.name?.trim())
        .filter((state): state is string => Boolean(state))
        .map((rawState) => ({
            label: normalizeStateName(rawState),
            value: rawState,
        }))
        .filter((state) => Boolean(state.label) && Boolean(state.value))
        .sort((left, right) => left.label.localeCompare(right.label, 'es'));
}

export async function getCities(country: string, state: string): Promise<LocationOption[]> {
    if (country.trim().toLowerCase() === 'colombia') {
        const colombiaCities = await loadColombiaCitiesByDepartmentName(state);
        if (colombiaCities.length) {
            return colombiaCities;
        }
    }

    const response = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ country, state }),
    });

    if (!response.ok) {
        return [];
    }

    const payload = (await response.json()) as CountriesNowCitiesResponse;
    const cities = payload.data ?? [];

    return cities
        .map((city) => city?.trim())
        .filter((city): city is string => Boolean(city))
        .map((city) => ({ label: city, value: city }))
        .sort((left, right) => left.label.localeCompare(right.label, 'es'));
}