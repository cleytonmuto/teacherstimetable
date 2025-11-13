/**
 * Validates password strength
 * Requirements:
 * - At least 8 characters long
 * - At least 1 uppercase character
 * - At least 1 lowercase character
 * - At least 1 numerical character
 * - At least 1 symbol
 */
export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('A senha deve ter pelo menos 8 caracteres');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('A senha deve conter pelo menos 1 letra maiúscula');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('A senha deve conter pelo menos 1 letra minúscula');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('A senha deve conter pelo menos 1 número');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('A senha deve conter pelo menos 1 símbolo');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Gets password strength indicator text
 */
export const getPasswordStrength = (password: string): string => {
  if (password.length === 0) return '';
  
  const validation = validatePassword(password);
  if (validation.valid) {
    return 'Senha forte';
  }
  
  return validation.errors.join(', ');
};

