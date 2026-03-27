export const formatPrice = (value) => Number(value || 0).toLocaleString('vi-VN');

export const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('vi-VN') : 'n/a';

export const compactText = (value, max = 120) => {
  const text = String(value || '').trim();
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max).trim()}...`;
};

export const joinLocation = (...parts) => parts.filter(Boolean).join(', ') || 'Khong ro vi tri';
