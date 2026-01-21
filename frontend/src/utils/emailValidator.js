export const emailValidator = {
  normalize(email) {
    if (!email) return '';

    return email
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '');
  },

  isValid(email) {
    if (!email) return false;

    const normalized = this.normalize(email);

    const emailRegex = /^[a-z0-9][a-z0-9._-]*@[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/;

    if (!emailRegex.test(normalized)) {
      return false;
    }

    if (normalized.includes('..')) {
      return false;
    }

    if (normalized.startsWith('.') || normalized.includes('@.') || normalized.includes('.@')) {
      return false;
    }

    return true;
  },

  getValidationError(email) {
    if (!email) {
      return 'Email é obrigatório';
    }

    const normalized = this.normalize(email);

    if (normalized !== email.trim()) {
      if (/[À-ÿ]/.test(email)) {
        return 'Email não pode conter acentos ou caracteres especiais';
      }
      if (/\s/.test(email)) {
        return 'Email não pode conter espaços';
      }
    }

    if (!this.isValid(email)) {
      return 'Email inválido';
    }

    return null;
  },

  validateAndNormalize(email) {
    const error = this.getValidationError(email);
    if (error) {
      throw new Error(error);
    }
    return this.normalize(email);
  }
};
