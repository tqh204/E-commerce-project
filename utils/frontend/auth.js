const TOKEN_KEY = 'marketplace.react.token';
const REMEMBERED_IDENTIFIER_KEY = 'marketplace.react.identifier';

export const getStoredToken = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(TOKEN_KEY) || '';
};

export const setStoredToken = (token) => {
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
};

export const clearStoredToken = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
};

export const getRememberedIdentifier = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(REMEMBERED_IDENTIFIER_KEY) || '';
};

export const setRememberedIdentifier = (identifier) => {
  if (typeof window === 'undefined') return;
  if (identifier) {
    window.localStorage.setItem(REMEMBERED_IDENTIFIER_KEY, identifier);
  } else {
    window.localStorage.removeItem(REMEMBERED_IDENTIFIER_KEY);
  }
};

export const clearRememberedIdentifier = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(REMEMBERED_IDENTIFIER_KEY);
};
