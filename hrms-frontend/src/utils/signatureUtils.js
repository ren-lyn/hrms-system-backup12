/**
 * Signature Utilities
 * Handles signature display robustly across different devices and environments
 */

// Get the base API URL dynamically
export const getApiBaseUrl = () => {
  // Always use Laravel backend port 8000 for storage URLs
  const currentHost = window.location.hostname;
  
  // In development, always point to Laravel backend on port 8000
  if (process.env.NODE_ENV === 'development') {
    return `http://${currentHost}:8000`;
  }
  
  // In production, use the same protocol and host as the frontend
  const protocol = window.location.protocol;
  const host = window.location.hostname;
  
  // For storage URLs, we always need to point to Laravel backend (port 8000)
  return `${protocol}//${host}:8000`;
};

// Generate signature URL with fallback options
export const getSignatureUrl = (path) => {
  if (!path) return null;
  
  const baseUrl = getApiBaseUrl();
  // The path from database already includes 'signatures/' so use it directly
  return `${baseUrl}/storage/${path}`;
};

// Generate multiple fallback URLs for different scenarios
export const getSignatureFallbackUrls = (path) => {
  if (!path) return [];
  
  const urls = [];
  
  // Primary URL using dynamic base
  urls.push(getSignatureUrl(path));
  
  // Fallback URLs for different common scenarios - all pointing to Laravel backend
  const currentHost = window.location.hostname;
  const commonHosts = [
    `http://${currentHost}:8000`,
    'http://localhost:8000',
    'http://127.0.0.1:8000',
  ];
  
  // Add other common local network addresses if different from current host
  if (currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
    if (currentHost.startsWith('192.168.') || currentHost.startsWith('10.')) {
      // Already added above
    } else {
      commonHosts.push('http://192.168.1.100:8000'); // Common local IP fallback
    }
  }
  
  commonHosts.forEach(host => {
    const url = `${host}/storage/${path}`;
    if (!urls.includes(url)) {
      urls.push(url);
    }
  });
  
  return urls;
};

// Check if a file path represents an image
export const isImageFile = (filePath) => {
  if (!filePath) return false;
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  const extension = filePath.split('.').pop()?.toLowerCase();
  return imageExtensions.includes(extension);
};

// Load image with multiple fallback URLs
export const loadImageWithFallback = async (path) => {
  const fallbackUrls = getSignatureFallbackUrls(path);
  
  for (const url of fallbackUrls) {
    try {
      // Test if the image loads successfully
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        return url;
      }
    } catch (error) {
      // Continue to next URL
      console.warn(`Failed to load image from ${url}:`, error.message);
    }
  }
  
  // If all URLs fail, return null
  console.error('Failed to load image from all fallback URLs');
  return null;
};

// Convert file to base64 for storage
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};

// Check if data is base64 encoded
export const isBase64Data = (data) => {
  return typeof data === 'string' && data.startsWith('data:');
};

// Get image dimensions
export const getImageDimensions = (imageUrl) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
};

// Download file with proper error handling
export const downloadSignatureFile = async (path, filename) => {
  try {
    const url = await loadImageWithFallback(path);
    if (!url) {
      throw new Error('Unable to locate signature file');
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const blob = await response.blob();
    
    // Create download link
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || path.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    return true;
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
};

// Network status utilities
export const isOnline = () => {
  return navigator.onLine;
};

export const onNetworkChange = (callback) => {
  window.addEventListener('online', () => callback(true));
  window.addEventListener('offline', () => callback(false));
};
