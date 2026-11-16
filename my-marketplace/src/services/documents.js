import apiClient from './api';

export async function downloadPrivateDocument(value) {
  try {
    const base = new URL(apiClient.defaults.baseURL, window.location.origin);
    const url = new URL(value, base);
    if (url.origin !== base.origin || !/^\/(?:api\/uploads\/documents|uploads)\/[\w-]+\.(?:jpg|jpeg|png|gif|webp|pdf)$/i.test(url.pathname)) {
      throw new Error('Invalid document URL');
    }
    const response = await apiClient.get(url.href, { responseType: 'blob' });
    const objectUrl = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = url.pathname.split('/').pop();
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  } catch {
    alert('تعذّر تحميل المستند. يجب تسجيل الدخول بحساب المالك أو الإدارة.');
  }
}
