type ReservationCartMapping = {
    reservationId: number;
    cartItemIds: number[];
    expirationDate: string;
};

const STORAGE_KEY = 'inkora:reservation_cart_map';

function readMappings(): ReservationCartMapping[] {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as ReservationCartMapping[];
    } catch {
        return [];
    }
}

function writeMappings(mappings: ReservationCartMapping[]) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
    } catch {
        // noop
    }
}

export function addMapping(mapping: ReservationCartMapping) {
    const mappings = readMappings();
    const exists = mappings.find((m) => m.reservationId === mapping.reservationId);
    if (exists) {
        exists.cartItemIds = Array.from(new Set([...exists.cartItemIds, ...mapping.cartItemIds]));
        exists.expirationDate = mapping.expirationDate;
    } else {
        mappings.push(mapping);
    }
    writeMappings(mappings);
}

export function getMapping(reservationId: number): ReservationCartMapping | undefined {
    const mappings = readMappings();
    return mappings.find((m) => m.reservationId === reservationId);
}

export function getMappingByCartItemId(cartItemId: number): ReservationCartMapping | undefined {
    const mappings = readMappings();
    return mappings.find((m) => m.cartItemIds.includes(cartItemId));
}

export function removeMapping(reservationId: number) {
    const mappings = readMappings().filter((m) => m.reservationId !== reservationId);
    writeMappings(mappings);
}

export function listMappings(): ReservationCartMapping[] {
    return readMappings();
}

export default {
    addMapping,
    getMapping,
    getMappingByCartItemId,
    removeMapping,
    listMappings,
};
