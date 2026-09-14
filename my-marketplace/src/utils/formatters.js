export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('ar-EG');
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP'
  }).format(amount);
};

export const timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' سنة';
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' شهر';
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' يوم';
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' ساعة';
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' دقيقة';
  
  return 'للتو';
};
