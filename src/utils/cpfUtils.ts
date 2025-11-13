/**
 * Removes formatting characters from CPF (dots and dashes)
 * @param cpf - CPF string with or without formatting
 * @returns CPF with only numbers
 */
export const formatCPF = (cpf: string): string => {
  return cpf.replace(/[.\-]/g, '');
};

/**
 * Validates CPF format (must have 11 digits)
 * @param cpf - CPF string
 * @returns true if CPF has 11 digits
 */
export const validateCPFFormat = (cpf: string): boolean => {
  const cleaned = formatCPF(cpf);
  return /^\d{11}$/.test(cleaned);
};

/**
 * Validates if all digits are the same (invalid CPF pattern)
 * @param cpf - CPF string (cleaned, 11 digits)
 * @returns true if all digits are the same
 */
const allDigitsSame = (cpf: string): boolean => {
  return /^(\d)\1{10}$/.test(cpf);
};

/**
 * Calculates CPF check digit
 * @param digits - Array of digits to calculate check digit for
 * @param weights - Array of weights to multiply with
 * @returns Check digit (0-9)
 */
const calculateCheckDigit = (digits: number[], weights: number[]): number => {
  const sum = digits.reduce((acc, digit, index) => acc + digit * weights[index], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
};

/**
 * Validates CPF using the Brazilian CPF validation algorithm
 * @param cpf - CPF string (with or without formatting)
 * @returns true if CPF is valid
 */
export const validateCPF = (cpf: string): boolean => {
  const cleaned = formatCPF(cpf);
  
  // Check format
  if (!validateCPFFormat(cleaned)) {
    return false;
  }
  
  // Check if all digits are the same (invalid)
  if (allDigitsSame(cleaned)) {
    return false;
  }
  
  // Extract digits
  const digits = cleaned.split('').map(Number);
  
  // Calculate first check digit
  const firstWeights = [10, 9, 8, 7, 6, 5, 4, 3, 2];
  const firstCheckDigit = calculateCheckDigit(digits.slice(0, 9), firstWeights);
  
  // Verify first check digit
  if (firstCheckDigit !== digits[9]) {
    return false;
  }
  
  // Calculate second check digit
  const secondWeights = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
  const secondCheckDigit = calculateCheckDigit(digits.slice(0, 10), secondWeights);
  
  // Verify second check digit
  if (secondCheckDigit !== digits[10]) {
    return false;
  }
  
  return true;
};

/**
 * Formats CPF for display (XXX.XXX.XXX-XX)
 * @param cpf - CPF string
 * @returns Formatted CPF string
 */
export const displayCPF = (cpf: string): string => {
  const cleaned = formatCPF(cpf);
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};
