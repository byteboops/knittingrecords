/* ============================================================
   KNITTING RECORDS — app.js
   Envio de formulários em .txt para o bucket "releases"
============================================================ */

/* ------------------------------------------------------------
   1) SUPABASE
------------------------------------------------------------ */
const SUPABASE_URL = 'https://mjqwiqjojkzobuysziyv.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcXdpcWpvamt6b2J1eXN6aXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3Nzc4MzMsImV4cCI6MjEwNjM1MzgzM30.w4zDJdmAOmZBnvfXHZ3YDu2qfiUs_gSOnccY0S2ahG8';

const BUCKET = 'releases';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ------------------------------------------------------------
   2) DADOS (mock)
------------------------------------------------------------ */
const ARTISTS = [
  {
    id: 'ricardo',
    nome: 'Ricardo',
    genero: 'Funk',
    imagem: 'covers/ricardo/sol.jpg',
    spotify: 'https://open.spotify.com/intl-pt/artist/7ES8xIBdUgDCDSzGRNAUfk?si=f2fxazB2QaeTGlLk3kKcvw'
  },
  {
    id: 'knitting-cat',
    nome: 'Knitting Cat',
    genero: 'Brazilian Phonk / Montagem',
    imagem: 'covers/knitting_cat/knitting_cat.png',
    spotify: 'https://open.spotify.com/intl-pt/artist/358ZWEMsgWuPS1TAhsmoTy?si=4XjnXwMjSyu0c6jhJkXMQA'
  },
  {
    id: 'davi-luiz',
    nome: 'Davi Luiz',
    genero: 'Em definição',
    imagem: 'https://cdn.imageurlgenerator.com/uploads/497d07b9-cb76-4c9b-9971-cb08d44a5880.png',
    spotify: 'https://open.spotify.com/intl-pt/artist/PREENCHA_AQUI'
  }
];

const RELEASES = [
  {
    id: 'nao-peido-mais-molhado',
    titulo: 'Não Peido Mais Molhado',
    artistaId: 'ricardo',
    capa: 'covers/ricardo/peido/peido.jpg',
    spotify: 'https://open.spotify.com/album/3lIf9GUK5ql9aJAb5Ij5Eb',
    tracks: [
      { nome: 'Não Peido Mais Molhado', src: '' }
    ]
  },
  {
    id: 'montagem-nobody',
    titulo: 'MONTAGEM NOBODY',
    artistaId: 'knitting-cat',
    capa: 'covers/knitting_cat/nobody/nobody.png',
    spotify: 'https://open.spotify.com/intl-pt/album/7iabqPw3Zh7491B7iZxsXd',
    tracks: [
      { nome: 'MONTAGEM NOBODY', src: 'audio/knitting_cat/nobody/nobody.wav' },
      { nome: 'Faixa 2', src: 'audio/knitting_cat/nobody/slowed.wav' },
      { nome: 'Faixa 3', src: 'audio/knitting_cat/nobody/super_slowed.wav' },
      { nome: 'Faixa 4', src: 'audio/knitting_cat/nobody/spedup.wav' }
    ]
  }
];

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const artistById = (id) => ARTISTS.find(a => a.id === id);

/* ------------------------------------------------------------
   3) NAVEGAÇÃO / MENU
------------------------------------------------------------ */
const hamburger = $('#hamburger');
const overlay   = $('#menuOverlay');
const closeBtn  = $('#closeMenu');

function openMenu() {
  overlay.classList.add('open');
  hamburger.setAttribute('aria-expanded', 'true');
}
function closeMenu() {
  overlay.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
}
hamburger.addEventListener('click', () =>
  overlay.classList.contains('open') ? closeMenu() : openMenu()
);
closeBtn.addEventListener('click', closeMenu);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeMenu(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

function showSection(id) {
  $$('.section').forEach(sec => sec.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');

  if (id === 'contato') {
    $('#formContato')?.classList.remove('hide');
    $('#formDemo')?.classList.add('hide');
    $('#btnContato')?.classList.add('active');
    $('#btnDemo')?.classList.remove('active');
  }

  closeMenu();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$$('[data-section]').forEach(el => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    showSection(el.dataset.section);
  });
});

/* ------------------------------------------------------------
   4) TOGGLE CONTATO / DEMO
------------------------------------------------------------ */
$('#btnContato').addEventListener('click', () => {
  $('#formContato').classList.remove('hide');
  $('#formDemo').classList.add('hide');
  $('#btnContato').classList.add('active');
  $('#btnDemo').classList.remove('active');
});
$('#btnDemo').addEventListener('click', () => {
  $('#formDemo').classList.remove('hide');
  $('#formContato').classList.add('hide');
  $('#btnDemo').classList.add('active');
  $('#btnContato').classList.remove('active');
});

/* ------------------------------------------------------------
   5) RENDER: ARTISTAS
------------------------------------------------------------ */
function renderArtists() {
  const grid = $('#artistGrid');
  if (!grid) return;

  grid.innerHTML = ARTISTS.map(a => `
    <div class="artist-card" data-artist="${a.id}" tabindex="0" role="button"
         aria-label="Ver catálogo de ${a.nome}">
      <img src="${a.imagem}" alt="${a.nome}" loading="lazy" />
      <h3>${a.nome}</h3>
      <p class="muted">${a.genero}</p>
    </div>
  `).join('');

  $$('.artist-card', grid).forEach(card => {
    const open = () => openArtistModal(card.dataset.artist);
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });
}

/* ------------------------------------------------------------
   6) RENDER: LANÇAMENTOS + PLAYER
------------------------------------------------------------ */
const audioEl = new Audio();
audioEl.preload = 'none';

function renderReleases() {
  const grid = $('#releaseGrid');
  if (!grid) return;

  grid.innerHTML = RELEASES.map(rel => {
    const artista = artistById(rel.artistaId);
    const tracks = rel.tracks.map((t, i) => `
      <div class="track">
        <span class="track-index">${i + 1}</span>
        <button class="track-play" data-src="${t.src}" data-track="${rel.id}-${i}"
                aria-label="Tocar ${t.nome}">
          <i class="fa-solid fa-play"></i>
        </button>
        <span class="track-name">${t.nome}</span>
      </div>
    `).join('');

    return `
      <article class="release-card">
        <div class="release-head">
          <img src="${rel.capa}" alt="Capa de ${rel.titulo}" loading="lazy" />
          <div>
            <div class="release-title">${rel.titulo}</div>
            <div class="release-artist">${artista ? artista.nome : '—'}</div>
          </div>
        </div>
        <div class="tracklist">${tracks}</div>
        <a class="btn btn-spotify" href="${rel.spotify}" target="_blank" rel="noopener">
          <i class="fa-brands fa-spotify"></i> Spotify
        </a>
      </article>
    `;
  }).join('');

  $$('.track-play', grid).forEach(btn => {
    btn.addEventListener('click', () => toggleTrack(btn));
  });
}

let currentTrackId = null;

function toggleTrack(btn) {
  const id  = btn.dataset.track;
  const src = btn.dataset.src;
  const icon = btn.querySelector('i');

  if (currentTrackId === id) {
    if (audioEl.paused) {
      audioEl.play().catch(onAudioError);
      icon.className = 'fa-solid fa-pause';
    } else {
      audioEl.pause();
      icon.className = 'fa-solid fa-play';
    }
    return;
  }

  if (currentTrackId) {
    const prev = $(`.track-play[data-track="${currentTrackId}"] i`);
    if (prev) prev.className = 'fa-solid fa-play';
  }

  currentTrackId = id;
  audioEl.src = src;
  audioEl.play()
    .then(() => { icon.className = 'fa-solid fa-pause'; })
    .catch(onAudioError);

  audioEl.onended = () => { icon.className = 'fa-solid fa-play'; };
}

function onAudioError(err) {
  console.warn('[Knitting] Falha ao tocar áudio:', err);
  alert('Não foi possível tocar esta faixa. Verifique se o arquivo existe (preenchaaqui.mp3).');
}

/* ------------------------------------------------------------
   7) MODAL ARTISTA
------------------------------------------------------------ */
const artistModal = $('#artistModal');

function openArtistModal(artistId) {
  const a = artistById(artistId);
  if (!a) return;

  $('#artistModalImg').src = a.imagem;
  $('#artistModalImg').alt = a.nome;
  $('#artistModalTitle').textContent = a.nome;
  $('#artistModalGenre').textContent = a.genero;
  $('#artistModalSpotify').href = a.spotify;

  const releasesDoArtista = RELEASES.filter(r => r.artistaId === artistId);
  const catalog = $('#artistModalReleases');

  catalog.innerHTML = releasesDoArtista.length
    ? releasesDoArtista.map(r => `
        <div class="catalog-item">
          <img src="${r.capa}" alt="Capa de ${r.titulo}" loading="lazy" />
          <div class="catalog-item-info">
            <h4>${r.titulo}</h4>
            <p>${r.tracks.length} faixa${r.tracks.length > 1 ? 's' : ''}</p>
          </div>
          <a href="${r.spotify}" target="_blank" rel="noopener">Spotify ↗</a>
        </div>
      `).join('')
    : '<p class="muted">Nenhum release cadastrado ainda.</p>';

  artistModal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeArtistModal() {
  artistModal.classList.remove('open');
  document.body.style.overflow = '';
}
$('#artistModalClose').addEventListener('click', closeArtistModal);
artistModal.addEventListener('click', (e) => {
  if (e.target === artistModal) closeArtistModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeArtistModal();
});

/* ============================================================
   8) SUPABASE — UPLOAD DE TEXTO (.txt) NO BUCKET "releases"
   ------------------------------------------------------------
   - Gera conteúdo em texto puro (chave: valor, uma por linha)
   - Nome do arquivo: tipo/AAAA-MM-DDTHH-MM-SS-xxx.txt
   - Content-Type: text/plain
============================================================ */

function toTxt(obj) {
  // Converte objeto em texto legível, campo por campo
  return Object.entries(obj)
    .map(([k, v]) => `${k}: ${v ?? ''}`)
    .join('\n') + '\n';
}

function txtPath(prefix) {
  const d = new Date().toISOString().replace(/[:.]/g, '-');
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}/${d}-${rand}.txt`;
}

async function uploadTxt(path, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const { error } = await sb.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'text/plain', upsert: false });
  if (error) throw error;
  return path;
}

function setStatus(el, msg, type = 'success') {
  if (!el) return;
  el.textContent = msg;
  el.className = `status ${type}`;
}

/* ------------------------------------------------------------
   9) FORM CONTATO → contatos/*.txt
------------------------------------------------------------ */
$('#contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status  = $('#contactStatus');
  const email   = $('#contactEmail').value.trim();
  const subject = $('#contactSubject').value.trim();
  const message = $('#contactMessage').value.trim();

  if (!email || !subject || !message) {
    return setStatus(status, 'Preencha todos os campos.', 'error');
  }

  const content = toTxt({
    tipo: 'contato',
    quando: new Date().toLocaleString('pt-BR'),
    email,
    assunto: subject,
    mensagem: message
  });

  setStatus(status, 'Enviando…');
  try {
    await uploadTxt(txtPath('contatos'), content);
    setStatus(status, '✅ Mensagem enviada! Responderemos em breve.');
    e.target.reset();
  } catch (err) {
    console.error(err);
    setStatus(status, `Erro ao enviar: ${err.message || 'tente novamente'}`, 'error');
  }
});

/* ------------------------------------------------------------
   10) FORM DEMO → demos/*.txt
------------------------------------------------------------ */
$('#demoForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = $('#demoStatus');

  const data = {
    tipo: 'demo',
    quando: new Date().toLocaleString('pt-BR'),
    nome_musica:   $('#demoNomeMusica').value.trim(),
    nome_artistico: $('#demoArtistico').value.trim(),
    genero:        $('#demoGenero').value,
    nome_completo: $('#demoNomeCompleto').value.trim(),
    objetivo:      $('#demoObjetivo').value,
    pretende:      $('#demoPretende').value.trim(),
    email:         $('#demoEmail').value.trim(),
    link:          $('#demoLink').value.trim()
  };

  const faltando = ['nome_musica','nome_artistico','nome_completo','pretende','email','link']
    .filter(k => !data[k]);
  if (faltando.length) {
    return setStatus(status, 'Preencha todos os campos.', 'error');
  }

  setStatus(status, 'Enviando demo…');
  try {
    await uploadTxt(txtPath('demos'), toTxt(data));
    setStatus(status, '🎉 Obrigado! Nosso A&R irá analisar e responder em até 72h.');
    e.target.reset();
  } catch (err) {
    console.error(err);
    setStatus(status, `Erro ao enviar demo: ${err.message || 'tente novamente'}`, 'error');
  }
});

/* ------------------------------------------------------------
   11) NEWSLETTER → newsletter/*.txt
------------------------------------------------------------ */
$('#newsletterForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = $('#newsStatus');
  const email = $('#newsEmail').value.trim();
  if (!email) return setStatus(status, 'Digite um e-mail válido.', 'error');

  const content = toTxt({
    tipo: 'newsletter',
    quando: new Date().toLocaleString('pt-BR'),
    email
  });

  setStatus(status, 'Inscrevendo…');
  try {
    await uploadTxt(txtPath('newsletter'), content);
    setStatus(status, '📬 Obrigado! Você receberá nossas novidades.');
    e.target.reset();
  } catch (err) {
    console.error(err);
    setStatus(status, `Erro ao inscrever: ${err.message || 'tente novamente'}`, 'error');
  }
});

/* ------------------------------------------------------------
   12) INIT
------------------------------------------------------------ */
function init() {
  renderArtists();
  renderReleases();
}
document.addEventListener('DOMContentLoaded', init);

/* ------------------------------------------------------------
   13) PWA
------------------------------------------------------------ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('assets/sw.js').catch(err => {
      console.warn('[PWA] Falha ao registrar service worker:', err);
    });
  });
}