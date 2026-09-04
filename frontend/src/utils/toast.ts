export const toast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  // Simple implementation for now, can be replaced with a proper library like react-hot-toast
  const existing = document.querySelector(".toast-notification");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast-notification toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position:fixed;
    top:20px;
    right:20px;
    padding:12px 20px;
    border-radius:12px;
    font-size:14px;
    font-weight: 600;
    z-index:9999;
    animation:slideIn .3s ease;
    max-width:300px;
    word-wrap:break-word;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  `;

  const colors = {
    info: "#3b82f6",
    success: "#22c55e",
    error: "#ef4444"
  };

  toast.style.background = colors[type];
  toast.style.color = "#fff";
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s ease';
    setTimeout(() => toast.remove(), 500);
  }, 4000);
};
