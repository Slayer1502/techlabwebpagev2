const HSN_RULES = [
  { pattern: /repeater|range extender|wifi (usb )?dongle|wi-?fi (usb )?(adapter|dongle)|access point|router|network card|networking/i, hsn: "85176290" },
  { pattern: /printer|copier|scanner|ecotank/i, hsn: "84433100" },
  { pattern: /monitor|display|lcd|led screen/i, hsn: "85285200" },
  { pattern: /camera|cctv|dvr|nvr|doorbell|ip (wifi )?cam/i, hsn: "85219000" },
  { pattern: /laptop|notebook|macbook|all-?in-?one pc/i, hsn: "84713000" },
  { pattern: /keyboard|mouse|kbd/i, hsn: "84716060" },
  { pattern: /processor|cpu|i[3579]-?\d|ryzen|motherboard|mainboard|ram|memory|harddisk|hard ?disk|ssd|solid state|nvme|expansion|gpu|graphics|vga card|smps|cabinet/i, hsn: "84733030" },
  { pattern: /desktop|tower|office (desktop|tower)/i, hsn: "84715000" },
  { pattern: /storage|pen drive|memory card|micro ?sd|sd card|flash|external drive|pendrive/i, hsn: "85235100" },
  { pattern: /ups|power supply|inverter|battery/i, hsn: "85044010" },
  { pattern: /cable|wire|connector|hdmi|vga|usb cable|ethernet/i, hsn: "85444220" },
  { pattern: /hub|adapter|charger|power ?bank/i, hsn: "85044010" },
  { pattern: /fan|cooler|smps|cabinet/i, hsn: "84733030" },
  { pattern: /installation|service|labour|warranty|amc|repair|setup|charges?/i, hsn: "99831200" },
  { pattern: /phone|mobile|smartphone/i, hsn: "85171300" },
  { pattern: /tablet|ipad/i, hsn: "84713000" },
  { pattern: /television|tv|smart ?tv/i, hsn: "85287200" },
  { pattern: /speaker|headset|headphone|earbud|mic|audio/i, hsn: "85183000" },
  { pattern: /projector/i, hsn: "85286200" },
  { pattern: /software|license|os|windows|office|antivirus/i, hsn: "85235100" },
];

const FALLBACK_HSN = {
  item: "84733030",
  service: "99831200",
  laptop: "84713000",
  desktop: "84715000",
  cctv: "85219000",
  accessory: "85176290",
};

const autoHsn = (productName, productType = "") => {
  const name = String(productName || "").trim();
  const type = String(productType || "").trim();
  const search = `${name} ${type}`;
  for (const rule of HSN_RULES) {
    if (rule.pattern.test(search) || rule.pattern.test(name.toLowerCase())) {
      return rule.hsn;
    }
  }
  const typeKey = type.toLowerCase();
  if (FALLBACK_HSN[typeKey]) return FALLBACK_HSN[typeKey];
  return null;
};

module.exports = { autoHsn };