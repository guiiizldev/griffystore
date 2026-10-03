const maxRadius = 15;
function coordinate(value, limit) {
  if (!["number", "string"].includes(typeof value) || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}
function validateLocation(settings, body) {
  const storeLat = coordinate(settings["timeclock.store_latitude"], 90);
  const storeLng = coordinate(settings["timeclock.store_longitude"], 180);
  if (storeLat === null || storeLng === null) return { error: "O administrador precisa salvar a localizacao da entrada da loja antes das batidas." };
  const latitude = coordinate(body.latitude, 90);
  const longitude = coordinate(body.longitude, 180);
  if (latitude === null || longitude === null) return { error: "Localizacao invalida. Ative o GPS e tente novamente." };
  const configured = Number(settings["timeclock.allowed_radius_meters"] || maxRadius);
  const radius = Number.isFinite(configured) && configured > 0 ? Math.min(configured, maxRadius) : maxRadius;
  const accuracy = coordinate(body.accuracy, Number.MAX_SAFE_INTEGER);
  if (accuracy === null || accuracy <= 0 || accuracy > radius) return { error: `GPS impreciso. Ative a localizacao precisa e tente novamente na entrada da loja (precisao maxima de ${radius} m).` };
  const radians = (value) => value * Math.PI / 180;
  const x = Math.sin(radians(latitude - storeLat) / 2) ** 2 + Math.cos(radians(storeLat)) * Math.cos(radians(latitude)) * Math.sin(radians(longitude - storeLng) / 2) ** 2;
  const distance = 6371000 * 2 * Math.atan2(Math.sqrt(Math.min(1, x)), Math.sqrt(Math.max(0, 1 - x)));
  if (distance > radius) return { error: `Voce esta fora do local permitido. Aproxime-se da entrada da loja (raio de ${radius} m).` };
  return { latitude, longitude, accuracy, distanceMeters: Math.round(distance), locationStatus: "Dentro do raio" };
}
module.exports = { coordinate, maxRadius, validateLocation };
