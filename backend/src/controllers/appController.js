const path = require("path");
const fs = require("fs");

const appApkCandidates = [
  { dir: path.join(__dirname, "../../../android-app/android/app/build/outputs/apk/debug"), defaultFile: "app-debug.apk" },
  { dir: path.join(__dirname, "../../../android-app/android/app/build/outputs/apk/release"), defaultFile: "app-release.apk" },
];

const getLatestApk = () => {
  for (const candidate of appApkCandidates) {
    let stamp = null;
    const stampPath = path.join(candidate.dir, "version.json");
    if (fs.existsSync(stampPath)) {
      try { stamp = JSON.parse(fs.readFileSync(stampPath, "utf8")); } catch { stamp = null; }
    }
    const fileName = stamp && stamp.filename ? stamp.filename : candidate.defaultFile;
    const apkPath = path.join(candidate.dir, fileName);
    if (!fs.existsSync(apkPath)) continue;
    const stat = fs.statSync(apkPath);
    return {
      path: apkPath,
      filename: fileName,
      version: stamp ? stamp.version : null,
      builtAt: stamp && stamp.builtAt ? stamp.builtAt : stat.mtime.toISOString(),
      size: stamp && stamp.size ? stamp.size : stat.size,
    };
  }
  return null;
};

const getLatestAppInfo = async (req, res) => {
  const apk = getLatestApk();
  if (!apk) {
    return res.json({ available: false });
  }
  res.json({ available: true, url: "/api/app/download", version: apk.version, filename: apk.filename, builtAt: apk.builtAt, size: apk.size });
};

const downloadApp = async (req, res) => {
  const apk = getLatestApk();
  if (!apk) {
    return res.status(404).json({ error: "Android app build not found. Run build-android.bat to generate the APK." });
  }
  res.setHeader("Content-Type", "application/vnd.android.package-archive");
  res.setHeader("Content-Disposition", `attachment; filename="${apk.filename}"`);
  fs.createReadStream(apk.path).pipe(res);
};

module.exports = {
  getLatestAppInfo,
  downloadApp
};
