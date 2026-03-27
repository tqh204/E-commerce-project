export const formatPrice = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('vi-VN').format(amount);
};

export const formatDateTime = (value) => {
  if (!value) return 'n/a';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'n/a';
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

export const joinLocation = (...parts) => parts.filter(Boolean).join(', ') || 'n/a';

export const compactText = (value, limit = 100) => {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
};

export const roleNames = (roles = []) =>
  roles.map((role) => (typeof role === 'string' ? role : role?.name)).filter(Boolean).join(', ') || 'n/a';

export const toPrettyJson = (value) => JSON.stringify(value, null, 2);

export const normalizeTags = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const messagePreview = (message) => {
  if (!message) return '';
  if (message.status === 'deleted') return 'Tin nhan da thu hoi';
  if (message.content) return compactText(message.content, 72);
  if (message.attachmentUrls?.length) return `[${message.attachmentUrls.length} tep dinh kem]`;
  return '[Tin nhan]';
};
