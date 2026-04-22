import { useEffect, useMemo, useRef, useState } from 'react';
import { InputSelect } from './Inputs';
import { getCities, getCountries, getStates, type LocationOption } from '../api/locations';

type LocationPickerProps = {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    error?: string;
};

const defaultCountry = 'Colombia';

function toLocationLabel(country: string, state: string, city: string) {
    return [city, state, country].filter(Boolean).join(', ');
}

function findOptionLabel(options: LocationOption[], value: string) {
    const option = options.find((item) => item.value === value);
    return option?.label ?? value;
}

export function LocationPicker({ label = 'Lugar de nacimiento', value, onChange, disabled, error }: LocationPickerProps) {
    const [countries, setCountries] = useState<LocationOption[]>([{ label: defaultCountry, value: defaultCountry }]);
    const [states, setStates] = useState<LocationOption[]>([]);
    const [cities, setCities] = useState<LocationOption[]>([]);
    const [country, setCountry] = useState(defaultCountry);
    const [state, setState] = useState('');
    const [city, setCity] = useState('');
    const [loadingCountries, setLoadingCountries] = useState(false);
    const [loadingStates, setLoadingStates] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);
    const onChangeRef = useRef(onChange);
    const lastEmittedValueRef = useRef('');

    const hasSelection = useMemo(() => Boolean(country && state && city), [country, state, city]);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        let isMounted = true;

        const loadCountries = async () => {
            setLoadingCountries(true);
            try {
                const data = await getCountries();
                if (!isMounted) return;

                setCountries(data.length ? data : [{ label: defaultCountry, value: defaultCountry }]);

                if (!data.some((option) => option.value === country)) {
                    setCountry(defaultCountry);
                }
            } catch {
                if (isMounted) {
                    setCountries([{ label: defaultCountry, value: defaultCountry }]);
                    setCountry(defaultCountry);
                }
            } finally {
                if (isMounted) {
                    setLoadingCountries(false);
                }
            }
        };

        void loadCountries();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        if (!country) {
            setStates([]);
            setCities([]);
            setState('');
            setCity('');
            return () => {
                isMounted = false;
            };
        }

        const loadStates = async () => {
            setLoadingStates(true);

            try {
                const data = await getStates(country);
                if (isMounted) {
                    setStates(data);
                }
            } catch {
                if (isMounted) {
                    setStates([]);
                }
            } finally {
                if (isMounted) {
                    setLoadingStates(false);
                }
            }
        };

        void loadStates();

        return () => {
            isMounted = false;
        };
    }, [country]);

    useEffect(() => {
        let isMounted = true;

        if (!country || !state) {
            setCities([]);
            setCity('');
            return () => {
                isMounted = false;
            };
        }

        const loadCities = async () => {
            setLoadingCities(true);

            try {
                const data = await getCities(country, state);
                if (isMounted) {
                    setCities(data);
                }
            } catch {
                if (isMounted) {
                    setCities([]);
                }
            } finally {
                if (isMounted) {
                    setLoadingCities(false);
                }
            }
        };

        void loadCities();

        return () => {
            isMounted = false;
        };
    }, [country, state]);

    useEffect(() => {
        if (value === lastEmittedValueRef.current) {
            return;
        }

        if (!value) {
            setCountry(defaultCountry);
            setState('');
            setCity('');
            return;
        }

        const parsedParts = value.split(',').map((part) => part.trim()).filter(Boolean);
        if (parsedParts.length >= 3) {
            const [parsedCity, parsedState, parsedCountry] = parsedParts;
            setCountry(parsedCountry || defaultCountry);
            setState(parsedState || '');
            setCity(parsedCity || '');
        }
    }, [value]);

    useEffect(() => {
        if (!state || !states.length) {
            return;
        }

        const hasRawMatch = states.some((option) => option.value === state);
        if (hasRawMatch) {
            return;
        }

        const matchByLabel = states.find(
            (option) => option.label.toLowerCase() === state.toLowerCase(),
        );

        if (matchByLabel) {
            setState(matchByLabel.value);
        }
    }, [state, states]);

    const handleCountryChange = (nextCountry: string) => {
        if (nextCountry === country) {
            return;
        }

        setCountry(nextCountry);
        setState('');
        setCity('');
        setStates([]);
        setCities([]);

        if (value) {
            lastEmittedValueRef.current = '';
            onChangeRef.current('');
        }
    };

    const handleStateChange = (nextState: string) => {
        if (nextState === state) {
            return;
        }

        setState(nextState);
        setCity('');
        setCities([]);

        if (value) {
            lastEmittedValueRef.current = '';
            onChangeRef.current('');
        }
    };

    const handleCityChange = (nextCity: string) => {
        setCity(nextCity);

        if (!nextCity) {
            lastEmittedValueRef.current = '';
            onChangeRef.current('');
            return;
        }

        const stateLabel = findOptionLabel(states, state);
        const countryLabel = findOptionLabel(countries, country);
        const nextValue = toLocationLabel(countryLabel, stateLabel, nextCity);
        lastEmittedValueRef.current = nextValue;
        onChangeRef.current(nextValue);
    };

    const countryOptions = useMemo(
        () => [{ label: 'Selecciona país', value: '' }, ...countries],
        [countries],
    );

    const stateOptions = useMemo(
        () => [{ label: 'Selecciona departamento/estado', value: '' }, ...states],
        [states],
    );

    const cityOptions = useMemo(
        () => [{ label: 'Selecciona ciudad', value: '' }, ...cities],
        [cities],
    );

    return (
        <div className="space-y-3">
            <p className="block text-sm font-medium text-text">{label}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <InputSelect
                    label="País"
                    value={country}
                    options={countryOptions}
                    onChange={(event) => handleCountryChange(event.target.value)}
                    disabled={disabled || loadingCountries}
                />
                <InputSelect
                    label="Departamento / estado"
                    value={state}
                    options={stateOptions}
                    onChange={(event) => handleStateChange(event.target.value)}
                    disabled={disabled || loadingStates || !country}
                />
                <InputSelect
                    label="Ciudad"
                    value={city}
                    options={cityOptions}
                    onChange={(event) => handleCityChange(event.target.value)}
                    disabled={disabled || loadingCities || !state}
                />
            </div>
            {error && <p className="text-xs text-red-300">{error}</p>}
            {!hasSelection && (
                <p className="text-xs text-text-muted">
                    Selecciona primero Colombia, luego tu departamento o estado y finalmente tu ciudad.
                </p>
            )}
        </div>
    );
}