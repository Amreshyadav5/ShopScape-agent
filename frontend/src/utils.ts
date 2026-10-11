export function formatPrice(amount: number, currencySymbol: string = '₹'): string {
  if (isNaN(amount) || amount === null || amount === undefined) return `${currencySymbol}0`;
  return `${currencySymbol}${amount.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  })}`;
}

export function resolveImageUrl(url?: string): string {
  if (!url) return 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  if (url.startsWith('/resources/')) {
    return url;
  }
  if (url.startsWith('resources/')) {
    return `/${url}`;
  }
  return `/resources/${url}`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return 'Recently';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}
