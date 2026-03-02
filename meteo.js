/* ═══════════════════════════════════════════════════════════════
   SKANNER — meteo.js
   Gestion complète du widget météo coin bas-droite
   API : Open-Meteo (sans clé) + Nominatim + ipapi.co (fallback)
═══════════════════════════════════════════════════════════════ */

'use strict';

// ─── DONNÉES : ICÔNES & DESCRIPTIONS WMO ─────────────────────────────────────
const WX_ICO = {
  0:'☀️', 1:'🌤', 2:'⛅', 3:'☁️',
  45:'🌫', 48:'🌫',
  51:'🌦', 53:'🌦', 55:'🌧',
  61:'🌧', 63:'🌧', 65:'🌧',
  71:'🌨', 73:'🌨', 75:'❄️',
  80:'🌦', 81:'🌧', 82:'⛈',
  95:'⛈', 99:'⛈'
};

const WX_DESC = {
  0:'DÉGAGÉ',        1:'PEU NUAGEUX',    2:'NUAGEUX',        3:'COUVERT',
  45:'BROUILLARD',   48:'GIVRE',
  51:'BRUINE',       53:'BRUINE',        55:'PLUIE',
  61:'PLUIE LÉGÈRE', 63:'PLUIE',         65:'FORTE PLUIE',
  71:'NEIGE LÉGÈRE', 73:'NEIGE',         75:'FORTE NEIGE',
  80:'AVERSES',      81:'AVERSES',       82:'ORAGES',
  95:'ORAGE',        99:'ORAGE GRÊLE'
};

const JOURS = ['DIM','LUN','MAR','MER','JEU','VEN','SAM'];

// ─── GÉOLOCALISATION ─────────────────────────────────────────────────────────
/**
 * Tente la géoloc navigateur, fallback sur ipapi.co
 * @returns {Promise<{lat, lon, city}>}
 */
async function getLocation() {
  // 1. Géoloc navigateur
  try {
    const pos = await new Promise((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
    );
    return { lat: pos.coords.latitude, lon: pos.coords.longitude, city: null };
  } catch (_) {
    // 2. Fallback IP
    const r = await fetch('https://ipapi.co/json/');
    const d = await r.json();
    return { lat: d.latitude, lon: d.longitude, city: d.city || '–' };
  }
}

// ─── REVERSE GEOCODE ─────────────────────────────────────────────────────────
/**
 * Nominatim → nom de ville
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<string>}
 */
async function reverseGeocode(lat, lon) {
  const r = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
  );
  const d = await r.json();
  return d.address?.city || d.address?.town || d.address?.village || '–';
}

// ─── FETCH MÉTÉO ─────────────────────────────────────────────────────────────
/**
 * Open-Meteo — données actuelles + prévision 4 jours
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<Object>}
 */
async function fetchMeteo(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast`
    + `?latitude=${lat}&longitude=${lon}`
    + `&current=temperature_2m,weathercode,windspeed_10m,relative_humidity_2m,apparent_temperature`
    + `&daily=weathercode,temperature_2m_max`
    + `&timezone=auto&forecast_days=4`;
  const r = await fetch(url);
  return r.json();
}

// ─── RENDU HTML ──────────────────────────────────────────────────────────────
/**
 * Génère le HTML du widget à partir des données météo
 */
function renderMeteo(data, city) {
  const cur   = data.current;
  const daily = data.daily;
  const ico   = WX_ICO[cur.weathercode]  || '🌡';
  const desc  = WX_DESC[cur.weathercode] || '–';

  const forecastHTML = daily.time.slice(1, 4).map((t, i) => `
    <div class="wx-fday">
      <span class="wx-fday-name">${JOURS[new Date(t).getDay()]}</span>
      <span class="wx-fday-icon">${WX_ICO[daily.weathercode[i + 1]] || '–'}</span>
      <span class="wx-fday-t">${Math.round(daily.temperature_2m_max[i + 1])}°</span>
    </div>`
  ).join('');

  document.getElementById('wxBody').innerHTML = `
    <div class="wx-compact">
      <span class="wx-emoji">${ico}</span>
      <div>
        <div class="wx-temp">${Math.round(cur.temperature_2m)}<sup>°C</sup></div>
        <div class="wx-city">${city.toUpperCase()}</div>
        <div class="wx-desc">${desc}</div>
      </div>
    </div>
    <div class="wx-hint">▸ DÉTAILS</div>
    <div class="wx-expanded">
      <div class="wx-stats">
        <div class="wx-stat">
          <span class="wx-stat-lbl">RESSENTI</span>
          <span class="wx-stat-val">${Math.round(cur.apparent_temperature)}<small>°C</small></span>
        </div>
        <div class="wx-stat">
          <span class="wx-stat-lbl">VENT</span>
          <span class="wx-stat-val">${Math.round(cur.windspeed_10m)}<small> km/h</small></span>
        </div>
        <div class="wx-stat">
          <span class="wx-stat-lbl">HUMIDITÉ</span>
          <span class="wx-stat-val">${cur.relative_humidity_2m}<small>%</small></span>
        </div>
      </div>
      <div class="wx-forecast">${forecastHTML}</div>
    </div>`;
}

// ─── INIT MÉTÉO ───────────────────────────────────────────────────────────────
/**
 * Point d'entrée principal — appelé au chargement de la page
 */
async function loadWeather() {
  const el = document.getElementById('wxBody');
  try {
    const { lat, lon, city: ipCity } = await getLocation();

    // Ville via reverse geocode (ou fallback IP)
    let city = ipCity;
    try { city = await reverseGeocode(lat, lon); } catch (_) {}

    const data = await fetchMeteo(lat, lon);
    renderMeteo(data, city || '–');

  } catch (err) {
    console.error('[meteo.js] Erreur :', err);
    el.innerHTML = `<div class="wx-err">⚠ MÉTÉO INDISPONIBLE</div>`;
  }
}

// ─── TOGGLE WIDGET ────────────────────────────────────────────────────────────
/**
 * Ouvre/ferme le panneau détails du widget
 * Appelée depuis l'attribut onclick du HTML
 */
function toggleWx() {
  document.getElementById('wxWidget').classList.toggle('open');
}

// ─── AUTO-INIT ────────────────────────────────────────────────────────────────
loadWeather();
