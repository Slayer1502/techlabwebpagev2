const https = require("https");

const fetchQrCode = (data) => {
  return new Promise((resolve) => {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;
    const req = https.get(url, (res) => {
      if (res.statusCode !== 200) {
        console.warn(`[QR] API returned status ${res.statusCode}`);
        return resolve(null);
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });

    req.on('error', (e) => {
      console.warn("[QR] Fetch Error:", e.message);
      resolve(null);
    });

    req.setTimeout(3000, () => {
      req.destroy();
      console.warn("[QR] Timeout fetching QR code");
      resolve(null);
    });
  });
};

module.exports = { fetchQrCode };
