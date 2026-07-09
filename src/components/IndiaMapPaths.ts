import indiaMap from "@svg-maps/india";

export interface StatePath {
  id: string;
  name: string;
  d: string;
  labelX: number;
  labelY: number;
}

// These coordinates are beautifully scaled from the original viewBox (600x650) to the high-fidelity viewBox (612x696).
// We've also manually fine-tuned key states to ensure centered hotspot radar rings and perfect alignment!
const labelConfig: Record<string, { labelX: number, labelY: number, customName?: string }> = {
  "jk": { labelX: 270, labelY: 90, customName: "Jammu and Kashmir" },
  "hp": { labelX: 295, labelY: 135 },
  "pb": { labelX: 250, labelY: 145 },
  "ut": { labelX: 332, labelY: 160 },
  "hr": { labelX: 280, labelY: 185 },
  "dl": { labelX: 296, labelY: 195 },
  "rj": { labelX: 204, labelY: 260 },
  "up": { labelX: 337, labelY: 235 },
  "gj": { labelX: 140, labelY: 340 },
  "mp": { labelX: 270, labelY: 320 },
  "br": { labelX: 413, labelY: 245 },
  "jh": { labelX: 408, labelY: 310 },
  "wb": { labelX: 444, labelY: 345 },
  "or": { labelX: 388, labelY: 385 },
  "ct": { labelX: 352, labelY: 360, customName: "Chhattisgarh" },
  "mh": { labelX: 250, labelY: 415 },
  "ga": { labelX: 199, labelY: 505, customName: "Goa" },
  "ap": { labelX: 316, labelY: 520 },
  "tg": { labelX: 273, labelY: 485, customName: "Telangana" },
  "ka": { labelX: 230, labelY: 535 },
  "kl": { labelX: 237, labelY: 625 },
  "tn": { labelX: 280, labelY: 620 },
  "sk": { labelX: 454, labelY: 215 },
  "as": { labelX: 515, labelY: 240 },
  "ar": { labelX: 546, labelY: 210 },
  "nl": { labelX: 571, labelY: 250 },
  "mn": { labelX: 571, labelY: 275 },
  "mz": { labelX: 561, labelY: 315 },
  "tr": { labelX: 538, labelY: 310 },
  "ml": { labelX: 507, labelY: 250 }
};

export const INDIA_STATE_PATHS: StatePath[] = indiaMap.locations
  .filter(loc => labelConfig[loc.id])
  .map(loc => {
    const config = labelConfig[loc.id];
    return {
      id: loc.id.toUpperCase(),
      name: config.customName || loc.name,
      d: loc.path,
      labelX: config.labelX,
      labelY: config.labelY
    };
  });
