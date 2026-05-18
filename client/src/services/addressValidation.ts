import { geocodeAddress, getAddressSuggestions, type AddressSuggestion } from './geocodingService';

function isPlausibleColombianAddress(address: string, city: string): boolean {
    const cleanAddress = address.trim();
    const cleanCity = city.trim();

    if (cleanAddress.length < 6) {
        return false;
    }

    const hasStreetReference = /\b(cra|cr|kra|kr|carrera|calle|cl|cll|avenida|av|transversal|tv|diagonal|diag|via|v[íi]a)\b/i.test(cleanAddress);
    const hasHouseNumber = /(?:#|\bno\.?|\bnro\.?|\bnum\.?|\bn\.?)\s*\d+/i.test(cleanAddress)
        || /\d+\s*[-/]\s*\d+/i.test(cleanAddress)
        || /\d+\s*[a-z]?$/i.test(cleanAddress);
    const hasLetterContent = /[\p{L}]/u.test(cleanAddress);
    const hasCityHint = cleanCity.length === 0 || cleanCity.length >= 3;

    return hasStreetReference && hasHouseNumber && hasLetterContent && hasCityHint;
}

export async function validateAddress(address: string, city: string): Promise<boolean> {
    const cleanAddress = address.trim();
    const cleanCity = city.trim();

    if (!cleanAddress) {
        return false;
    }

    try {
        const result = await geocodeAddress(cleanAddress, cleanCity);
        if (result !== null) {
            return true;
        }

        return isPlausibleColombianAddress(cleanAddress, cleanCity);
    } catch {
        return isPlausibleColombianAddress(cleanAddress, cleanCity);
    }
}

export async function suggestAddresses(
    address: string,
    city: string,
): Promise<AddressSuggestion[]> {
    const cleanAddress = address.trim();
    const cleanCity = city.trim();

    if (!cleanAddress) {
        return [];
    }

    try {
        return await getAddressSuggestions(cleanAddress, cleanCity);
    } catch {
        return [];
    }
}