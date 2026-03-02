/* ═══════════════════════════════════════════════════════════════
   SKANNER — script.js
   Logique principale : état global, catégories, quick tags,
   sélection moteur, mise à jour des 6 encarts sans quitter la page
═══════════════════════════════════════════════════════════════ */

'use strict';

// ─── ÉTAT GLOBAL ─────────────────────────────────────────────────────────────
let curEng   = 'all'; // 'all' = 6 encarts, sinon filtre sur 1 moteur
let curKw    = '';    // mot-clé catégorie préfixé
let curCat   = 'all'; // catégorie active
let curQuery = '';    // dernière query tapée

window._curEng = curEng;

// ─── QUICK TAGS ───────────────────────────────────────────────────────────────
const TAGS = {
  all:   ['RTX 4090','RX 7900 XTX','Samsung 4K 27"','SSD 2 To','Ryzen 9 7950X','i9-14900K','LG OLED','NVMe Gen5'],
  gpu:   ['RTX 4090','RTX 4080 Super','RX 7900 XTX','RTX 4070 Ti Super','Arc B580','RTX 3090 Ti occas.','RX 7800 XT','RTX 4060 Ti 16Go'],
  ecran: ['Dell U2724D','LG OLED 27" 4K','Samsung G7 32"','ASUS ROG Swift 4K','BenQ EX3210R','Gigabyte M32U','Samsung Odyssey G9','AOC U27G3X'],
  ssd:   ['Samsung 990 Pro 2To','WD Black SN850X','Crucial T700 2To','Kingston Fury Renegade','Seagate IronWolf 4To','WD Red Pro 6To','Samsung 870 EVO 4To','Corsair MP600 Pro XT'],
  cpu:   ['Ryzen 9 9950X','Intel i9-14900K','Ryzen 7 9800X3D','Intel i7-14700K','Ryzen 5 9600X','Intel i5-14600K','Ryzen 9 7900X3D','Intel Core Ultra 9']
};

function buildTags(cat) {
  const list = TAGS[cat] || TAGS.all;
  document.getElementById('qtags').innerHTML = list
    .map(t => `<span class="qtag" onclick="quickSearch(${JSON.stringify(t)})">${t}</span>`)
    .join('');
}

function quickSearch(term) {
  document.getElementById('q').value = term;
  doSearch();
}

// ─── SÉLECTION MOTEUR ─────────────────────────────────────────────────────────
// Clic sur un moteur → filtre les encarts sur ce moteur uniquement
// Reclic sur le même → revient à "TOUT" (les 6 encarts)
function pickEng(btn) {
  const wasOn = btn.classList.contains('on');

  document.querySelectorAll('.eng').forEach(b => b.classList.remove('on'));

  if (wasOn) {
    // désélection → tout afficher
    curEng = 'all';
    document.querySelector('.eng[data-e="all"]')?.classList.add('on');
  } else {
    btn.classList.add('on');
    curEng = btn.dataset.e;
  }

  window._curEng = curEng;

  if (curQuery) renderResults(curQuery, curCat, curKw, curEng);
}

// ─── SÉLECTION CATÉGORIE ─────────────────────────────────────────────────────
function pickCat(btn) {
  document.querySelectorAll('.cat').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  curKw  = btn.dataset.kw;
  curCat = btn.dataset.c;
  buildTags(curCat);

  if (curQuery) renderResults(curQuery, curCat, curKw, curEng);
}

// ─── RECHERCHE ────────────────────────────────────────────────────────────────
function doSearch() {
  const raw = document.getElementById('q').value.trim();
  if (!raw) return;
  curQuery = raw;
  renderResults(curQuery, curCat, curKw, curEng);
}

// Entrée clavier
document.getElementById('q').addEventListener('keydown', e => {
  if (e.key === 'Enter') doSearch();
});

// Recherche live pendant la frappe (debounce 400ms)
let _dbt;
document.getElementById('q').addEventListener('input', e => {
  clearTimeout(_dbt);
  const val = e.target.value.trim();
  if (!val) { initGrid(); curQuery = ''; return; }
  _dbt = setTimeout(() => {
    curQuery = val;
    renderResults(curQuery, curCat, curKw, curEng);
  }, 400);
});

// ─── INIT ─────────────────────────────────────────────────────────────────────
buildTags('all');
initGrid();
