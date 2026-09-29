import { DeliveryAddress } from '../types/index.ts';
import { normalizePhoneNumber } from '../lib/firebase.ts';

/**
 * Normalizes a string for clean comparison (lowercased, trimmed, collapsed whitespace)
 */
export function normalizeText(str?: string): string {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Checks whether two delivery addresses represent the same physical location.
 * Helps prevent duplicate address entries when orders are placed repeatedly.
 */
export function isSameAddress(a1?: Partial<DeliveryAddress>, a2?: Partial<DeliveryAddress>): boolean {
  if (!a1 || !a2) return false;

  const full1 = normalizeText(a1.fullAddress);
  const full2 = normalizeText(a2.fullAddress);

  if (!full1 || !full2) return false;

  const dist1 = normalizeText(a1.district);
  const dist2 = normalizeText(a2.district);

  const div1 = normalizeText(a1.division);
  const div2 = normalizeText(a2.division);

  const upa1 = normalizeText(a1.upazila);
  const upa2 = normalizeText(a2.upazila);

  const phone1 = normalizePhoneNumber(a1.mobileNumber || a1.recipientPhone || (a1 as any).mobile);
  const phone2 = normalizePhoneNumber(a2.mobileNumber || a2.recipientPhone || (a2 as any).mobile);

  // Text & Regional matching
  const fullAddressMatch = full1 === full2;
  const districtMatch = !dist1 || !dist2 || dist1 === dist2;
  const divisionMatch = !div1 || !div2 || div1 === div2;
  const upazilaMatch = !upa1 || !upa2 || upa1 === upa2;

  if (fullAddressMatch && districtMatch && divisionMatch && upazilaMatch) {
    // Check phone compatibility if present
    if (!phone1 || !phone2) return true;
    if (phone1 === phone2) return true;
    if (phone1.length >= 10 && phone2.endsWith(phone1.slice(-10))) return true;
    if (phone2.length >= 10 && phone1.endsWith(phone2.slice(-10))) return true;
  }

  return false;
}

/**
 * Safely merges a new address into an existing address array without adding duplicates.
 */
export function addAddressWithoutDuplicates(
  existingAddresses: DeliveryAddress[] = [],
  newAddress: DeliveryAddress
): { addresses: DeliveryAddress[]; added: boolean } {
  if (!newAddress || !newAddress.fullAddress || newAddress.fullAddress.trim().length < 3) {
    return { addresses: existingAddresses, added: false };
  }

  const isDuplicate = existingAddresses.some((addr) => isSameAddress(addr, newAddress));
  if (isDuplicate) {
    return { addresses: existingAddresses, added: false };
  }

  // Set isDefault to true if this is the first saved address
  const isDefault = existingAddresses.length === 0 || Boolean(newAddress.isDefault);
  const addrToAdd: DeliveryAddress = {
    ...newAddress,
    id: newAddress.id || `addr-${Date.now()}`,
    isDefault,
  };

  const updatedList = isDefault
    ? [...existingAddresses.map((a) => ({ ...a, isDefault: false })), addrToAdd]
    : [...existingAddresses, addrToAdd];

  return { addresses: updatedList, added: true };
}
