const maxRadius = 15;
function coordinate(value, limit) {
  if (!["number", "string"].includes(typeof value) || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}
function validateLocation(settings, body) {
  const storeLat = coordinate(settings["timeclock.store_latitude"], 90);
  const storeLng = coordinate(settings["timeclock.store_longitude"], 180);
  const latitude = coordinate(body.latitude, 90);
  const longitude = coordinate(body.longitude, 180);
  if (latitude === null || longitude === null) return { error: "Localizacao invalida. Ative o GPS e tente novamente." };
  const reportedAccuracy = coordinate(body.accuracy, Number.MAX_SAFE_INTEGER);
  const accuracy = reportedAccuracy > 0 ? reportedAccuracy : null;
  if (storeLat === null || storeLng === null) {
    return { latitude, longitude, accuracy, distanceMeters: null, locationStatus: "Localizacao registrada" };
  }
  const radians = (value) => value * Math.PI / 180;
  const x = Math.sin(radians(latitude - storeLat) / 2) ** 2 + Math.cos(radians(storeLat)) * Math.cos(radians(latitude)) * Math.sin(radians(longitude - storeLng) / 2) ** 2;
  const distance = 6371000 * 2 * Math.atan2(Math.sqrt(Math.min(1, x)), Math.sqrt(Math.max(0, 1 - x)));
  return { latitude, longitude, accuracy, distanceMeters: Math.round(distance), locationStatus: "Localizacao registrada" };
}
module.exports = { coordinate, maxRadius, validateLocation };
