/* ═══════════════════════════════════════════════════════════════
   SKANNER — scrapper.js
   6 encarts permanents par moteur
   Mise à jour sans quitter la page
   Clic → drawer avec lien vers le vrai site
═══════════════════════════════════════════════════════════════ */

'use strict';

// ─── MOTEURS ─────────────────────────────────────────────────────────────────
const ENG_URLS = {
  google:   q => `https://www.google.com/search?q=${encodeURIComponent(q)}&tbm=shop`,
  amazon:   q => `https://www.amazon.fr/s?k=${encodeURIComponent(q)}`,
  ldlc:     q => `https://www.ldlc.com/recherche/${encodeURIComponent(q)}/`,
  materiel: q => `https://www.materiel.net/recherche/${encodeURIComponent(q)}/`,
  ebay:     q => `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(q)}`,
  rdc:      q => `https://www.rueducommerce.fr/recherche?term=${encodeURIComponent(q)}`
};

// ─── 6 SOURCES FIXES (1 par encart) ──────────────────────────────────────────
const SOURCES = [
  { id: 'google',   label: 'GOOGLE SHOPPING', color: '#4285f4', emoji: '🔍' },
  { id: 'amazon',   label: 'AMAZON.FR',       color: '#ff9900', emoji: '📦' },
  { id: 'ldlc',     label: 'LDLC',            color: '#e63946', emoji: '🏪' },
  { id: 'materiel', label: 'MATERIEL.NET',    color: '#00b4d8', emoji: '🖥️' },
  { id: 'ebay',     label: 'EBAY.FR',         color: '#86bc25', emoji: '🏷️' },
  { id: 'rdc',      label: 'RUE DU COMMERCE', color: '#9b5de5', emoji: '🛒' },
];

// ─── MÉTADONNÉES CATÉGORIES ───────────────────────────────────────────────────
const CAT_META = {
  all:   { badge: 'b-all',   label: 'TECH',  grad: 'linear-gradient(90deg,transparent,#00e5ff,transparent)', icon: '🔍' },
  gpu:   { badge: 'b-gpu',   label: 'GPU',   grad: 'linear-gradient(90deg,transparent,#ff007f,transparent)', icon: '🎮' },
  ecran: { badge: 'b-ecran', label: 'ÉCRAN', grad: 'linear-gradient(90deg,transparent,#00ff99,transparent)', icon: '🖥️' },
  ssd:   { badge: 'b-ssd',   label: 'SSD',   grad: 'linear-gradient(90deg,transparent,#ff6a00,transparent)', icon: '💾' },
  cpu:   { badge: 'b-cpu',   label: 'CPU',   grad: 'linear-gradient(90deg,transparent,#ffe040,transparent)', icon: '⚡' },
};

// ─── SPECS PAR CATÉGORIE ──────────────────────────────────────────────────────
const CAT_SPECS = {
  all:   [{ k:'DISPONIBILITÉ', v:'En stock' },{ k:'LIVRAISON', v:'24–48 h' },{ k:'GARANTIE', v:'2 ans' },{ k:'RETOUR', v:'30 jours' }],
  gpu:   [{ k:'MÉMOIRE VRAM', v:'16–24 Go' },{ k:'INTERFACE', v:'PCIe 4.0' },{ k:'TDP', v:'250–450 W' },{ k:'CONNECTEURS', v:'3× DP, HDMI' }],
  ecran: [{ k:'RÉSOLUTION', v:'3840×2160' },{ k:'RAFRAÎCHISSEMENT', v:'144–240 Hz' },{ k:'DALLE', v:'IPS / OLED' },{ k:'TEMPS RÉPONSE', v:'1 ms GtG' }],
  ssd:   [{ k:'INTERFACE', v:'NVMe PCIe 4.0' },{ k:'LECTURE', v:'7 000 Mo/s' },{ k:'ÉCRITURE', v:'6 500 Mo/s' },{ k:'CAPACITÉS', v:'1 To / 2 To' }],
  cpu:   [{ k:'SOCKET', v:'AM5 / LGA1700' },{ k:'CŒURS', v:'8–24 cœurs' },{ k:'TDP', v:'65–125 W' },{ k:'MÉMOIRE', v:'DDR5 6000+' }],
};

// ─── DESCRIPTIONS PAR SOURCE ──────────────────────────────────────────────────
const SRC_DESCS = {
  google:   q => `Meilleurs résultats Google Shopping pour « ${q} » — comparez les offres de centaines de vendeurs.`,
  amazon:   q => `Résultats Amazon.fr pour « ${q} » — livraison Prime, retour facile, garantie A à Z.`,
  ldlc:     q => `LDLC référence « ${q} » — spécialiste informatique français, garantie et SAV inclus.`,
  materiel: q => `Materiel.net propose « ${q} » — configurateur PC, stock FR, livraison rapide.`,
  ebay:     q => `Offres eBay.fr pour « ${q} » — neuf, occasion et reconditionné au meilleur prix.`,
  rdc:      q => `Rue du Commerce — « ${q} » en stock, paiement sécurisé et retrait en point relais.`,
};

// ─── PRIX FICTIF ──────────────────────────────────────────────────────────────
// En production : remplacer par un vrai appel API (ex: SerpAPI, PriceAPI...)
const _prices = {}; // cache pour garder les prix stables entre renders
function getPrix(key) {
  if (!_prices[key]) _prices[key] = (Math.floor(Math.random() * 900) + 99).toLocaleString('fr-FR') + ' €';
  return _prices[key];
}
function resetPrices() { Object.keys(_prices).forEach(k => delete _prices[k]); }

// ─── INIT GRILLE (état vide / en attente) ────────────────────────────────────
function initGrid() {
  document.getElementById('rCount').textContent = '–';
  document.getElementById('grid').innerHTML = SOURCES.map((src, i) => `
    <div class="card card-idle" id="slot-${src.id}" style="animation-delay:${(i*.06).toFixed(2)}s">
      <div class="card-topline" style="--card-grad:linear-gradient(90deg,transparent,${src.color},transparent)"></div>
      <div class="card-src" style="--sdot:${src.color}">
        <span class="src-dot"></span>${src.label}
      </div>
      <div class="card-idle-body">
        <span class="card-idle-ico">${src.emoji}</span>
        <span class="card-idle-txt">EN ATTENTE</span>
      </div>
    </div>`).join('');
}

// ─── RENDU RÉSULTATS ──────────────────────────────────────────────────────────
// engFilter : 'all' = les 6, sinon l'id du moteur sélectionné
function renderResults(query, cat, catKw, engFilter) {
  const meta      = CAT_META[cat] || CAT_META.all;
  const fullQuery = catKw ? `${catKw} ${query}` : query;

  // Réinitialise les prix à chaque nouvelle query
  resetPrices();

  // Quels slots afficher ?
  const visible = engFilter === 'all'
    ? SOURCES
    : SOURCES.filter(s => s.id === engFilter);

  document.getElementById('rCount').textContent = visible.length;

  // Construire toute la grille
  const html = SOURCES.map((src, i) => {
    const isVisible = engFilter === 'all' || src.id === engFilter;
    const priceKey  = `${src.id}-${query}`;
    const prix      = getPrix(priceKey);
    const url       = ENG_URLS[src.id](fullQuery);
    const cardId    = `slot-${src.id}`;

    if (!isVisible) {
      // Encart grisé / masqué quand filtré
      return `
        <div class="card card-muted" id="${cardId}" style="animation-delay:${(i*.06).toFixed(2)}s;opacity:.25;pointer-events:none">
          <div class="card-topline" style="--card-grad:linear-gradient(90deg,transparent,${src.color},transparent)"></div>
          <div class="card-src" style="--sdot:${src.color}">
            <span class="src-dot"></span>${src.label}
          </div>
          <div class="card-idle-body">
            <span class="card-idle-ico">${src.emoji}</span>
            <span class="card-idle-txt">FILTRÉ</span>
          </div>
        </div>`;
    }

    return `
      <div class="card" id="${cardId}"
           style="animation-delay:${(i*.06).toFixed(2)}s"
           onclick="openDrawer(${JSON.stringify({ query, fullQuery, cat, srcId: src.id, prix, url })})">
        <div class="card-topline" style="--card-grad:${meta.grad}"></div>
        <div class="card-src" style="--sdot:${src.color}">
          <span class="src-dot"></span>${src.label}
        </div>
        <div class="card-title">${query}</div>
        <div class="card-desc">${SRC_DESCS[src.id](query)}</div>
        <div class="card-foot">
          <div class="card-price">${prix}</div>
          <span class="badge ${meta.badge}">${meta.label}</span>
        </div>
        <div class="card-cta-hint">VOIR LES DÉTAILS →</div>
      </div>`;
  }).join('');

  document.getElementById('grid').innerHTML = html;
}

// ─── DRAWER ───────────────────────────────────────────────────────────────────
function openDrawer(data) {
  // data peut arriver en string (onclick inline) ou objet
  if (typeof data === 'string') data = JSON.parse(data);

  const { query, fullQuery, cat, srcId, prix, url } = data;
  const src    = SOURCES.find(s => s.id === srcId);
  const meta   = CAT_META[cat] || CAT_META.all;
  const specs  = CAT_SPECS[cat] || CAT_SPECS.all;

  // Prix alternatifs sur les autres moteurs
  const altPrices = SOURCES
    .filter(s => s.id !== srcId)
    .map(s => ({
      label: s.label,
      color: s.color,
      prix:  getPrix(`${s.id}-${query}`),
      url:   ENG_URLS[s.id](fullQuery)
    }));

  document.getElementById('drawerSource').innerHTML = `
    <span class="drawer-source-dot" style="background:${src.color}"></span>
    ${src.label}`;

  document.getElementById('drawerPreview').innerHTML = `
    <div class="drawer-preview-icon">${src.emoji}</div>
    <div class="drawer-preview-title">${query}</div>
    <span class="drawer-preview-badge ${meta.badge}">${meta.label}</span>
    <div class="drawer-price-big">${prix}</div>
    <div class="drawer-price-sub">PRIX CONSTATÉ SUR ${src.label}</div>
    <div class="drawer-prices">
      ${altPrices.slice(0,3).map(p => `
        <a href="${p.url}" target="_blank" class="drawer-price-chip">
          <div class="drawer-price-chip-src" style="color:${p.color}">${p.label}</div>
          <div class="drawer-price-chip-val">${p.prix}</div>
        </a>`).join('')}
    </div>`;

  document.getElementById('drawerDetails').innerHTML = `
    <div class="drawer-detail-title">DESCRIPTION</div>
    <div class="drawer-desc">${SRC_DESCS[srcId](query)}</div>`;

  document.getElementById('drawerSpecs').innerHTML = `
    <div class="drawer-spec-title">CARACTÉRISTIQUES TYPIQUES</div>
    <div class="spec-grid">
      ${specs.map(s => `
        <div class="spec-item">
          <div class="spec-key">${s.k}</div>
          <div class="spec-val">${s.v}</div>
        </div>`).join('')}
    </div>`;

  document.getElementById('drawerLink').href = url;

  document.getElementById('drawerEngines').innerHTML = SOURCES
    .filter(s => s.id !== srcId)
    .map(s => `
      <a href="${ENG_URLS[s.id](fullQuery)}" target="_blank"
         class="drawer-eng-btn" style="--eng-clr:${s.color}">
        ${s.label}
      </a>`).join('');

  document.getElementById('overlay').classList.add('on');
  document.getElementById('drawer').classList.add('open');
  document.body.classList.add('drawer-open');
}

function closeDrawer() {
  document.getElementById('overlay').classList.remove('on');
  document.getElementById('drawer').classList.remove('open');
  document.body.classList.remove('drawer-open');
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
