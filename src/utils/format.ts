export const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const withEmbeddedTrue = (url: string): string => {
  if (!url) {
    return url;
  }
  return url.includes('?') ? `${url}&embedded=true` : `${url}?embedded=true`;
};

