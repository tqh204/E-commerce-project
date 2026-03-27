const TOKEN_KEY = 'market_react_token';

export const getStoredToken = () => {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.localStorage.getItem(TOKEN_KEY) || '';
};

export const setStoredToken = (token) => {
  if (typeof window === 'undefined') {
    return;
  }
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
  }
};

export const clearStoredToken = () => setStoredToken('');
