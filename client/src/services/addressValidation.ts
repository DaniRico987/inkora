import { geocodeAddress, getAddressSuggestions, type AddressSuggestion } from './geocodingService';

export async function validateAddress(address: string, city: string): Promise<boolean> {
    const cleanAddress = address.trim();
    const cleanCity = city.trim();

    if (!cleanAddress) {
        return false;
    }

    try {
        const result = await geocodeAddress(cleanAddress, cleanCity);
        return result !== null;
    } catch {
        return false;
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