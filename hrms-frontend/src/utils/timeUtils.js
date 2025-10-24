/**
 * Converts a timestamp to relative time format
 * Examples: "1 min ago", "5 mins ago", "1 hour ago", "Yesterday", "3 days ago"
 */
export const getRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  
  const now = new Date();
  const past = new Date(timestamp);
  const diffInSeconds = Math.floor((now - past) / 1000);
  
  // Just now (less than 1 minute)
  if (diffInSeconds < 60) {
    return 'Just now';
  }
  
  // Minutes ago
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return diffInMinutes === 1 ? '1 min ago' : `${diffInMinutes} mins ago`;
  }
  
  // Hours ago
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
  }
  
  // Days ago
  const diffInDays = Math.floor(diffInHours / 24);
  
  // Yesterday
  if (diffInDays === 1) {
    return 'Yesterday';
  }
  
  // Days ago (less than a week)
  if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  }
  
  // Weeks ago
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return diffInWeeks === 1 ? '1 week ago' : `${diffInWeeks} weeks ago`;
  }
  
  // Months ago
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return diffInMonths === 1 ? '1 month ago' : `${diffInMonths} months ago`;
  }
  
  // Years ago
  const diffInYears = Math.floor(diffInDays / 365);
  return diffInYears === 1 ? '1 year ago' : `${diffInYears} years ago`;
};

