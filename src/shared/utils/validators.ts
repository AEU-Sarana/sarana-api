/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  /**
   * Validate phone number (Cambodia format)
   */
  export function isValidPhone(phone: string): boolean {
    const phoneRegex = /^(\+855|0)[0-9]{8,9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }
  
  /**
   * Validate UUID format
   */
  export function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
  
  /**
   * Validate PIN (4-6 digits)
   */
  export function isValidPIN(pin: string): boolean {
    const pinRegex = /^\d{4,6}$/;
    return pinRegex.test(pin);
  }
  
  /**
   * Sanitize string input
   */
  export function sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }