/* Knitting Records — site behavior */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://mjqwiqjojkzobuysziyv.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcXdpcWpvamt6b2J1eXN6aXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3Nzc4MzMsImV4cCI6MjEwNjM1MzgzMH0.w4zDJdmAOmZBnvfXHZ3YDu2qfiUs_gSOnccY0S2ahG8';
  const BUCKET = 'releases';
  const artists = [
    { id: 'ricardo', nome: 'Ricardo', genero: 'Funk', imagem: 'covers/ricardo/sol.jpeg', spotify: 'https://open.spotify.com/intl-pt/artist/7ES8xIBdUgDCDSzGRNAUfk' },
    { id: 'knitting-cat', nome: 'Knitting Cat', genero: 'Brazilian Phonk / Montagem', imagem: 'covers/knitting_cat/knitting_cat.png', spotify: 'https://open.spotify.com/intl-pt/artist/358ZWEMsgWuPS1TAhsmoTy' }
  ];
  const releases = [
    { id: 'nao-peido-mais-molhado', titulo: 'Não Peido Mais Molhado', artistaId: 'ricardo', capa: 'covers/ricardo/peido/peido.jpeg', spotify: 'https://open.spotify.com/album/3lIf9GUK5ql9aJAb5Ij5Eb', tracks: [] },
    { id: 'montagem-nobody', titulo: 'MONTAGEM NOBODY', artistaId: 'knitting-cat', capa: 'covers/knitting_cat/nobody/nobody.png', spotify: 'https://open.spotify.com/intl-pt/album/7iabqPw3Zh7491B7iZxsXd', tracks: [
      { nome: 'MONTAGEM NOBODY', src: 'audio/knitting_cat/nobody/nobody.mp3' },
      { nome: 'Faixa 2 (Slowed)', src: 'audio/knitting_cat/nobody/slowed.mp3' },
      { nome: 'Faixa 3 (Super Slowed)', src: 'audio/knitting_cat/nobody/super_slowed.mp3' },
      { nome: 'Faixa 4 (Sped Up)', src: 'audio/knitting_cat/nobody/spedup.mp3' }
    ] }
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const artistById = id => artists.find(artist => artist.id === id);
  const assetUrl = path => new URL(path, document.baseURI).href;
  const audio = new Audio();
  audio.preload = 'none';
  let currentTrack = null;
  let supabaseClient = null;

  function setStatus(element, message, type = '') {
    if (!element) return;
    element.textContent = message;
    element.className = `status${type ? ` ${type}` : ''}`;
  }

  function switchContactTab(demo) {
    $('#formContato')?.classList.toggle('hide', demo);
    $('#formDemo')?.classList.toggle('hide', !demo);
    $('#btnContato')?.classList.toggle('active', !demo);
    $('#btnDemo')?.classList.toggle('active', demo);
    $('#btnContato')?.setAttribute('aria-selected', String(!demo));
    $('#btnDemo')?.setAttribute('aria-selected', String(demo));
  }

  function showSection(id) {
    const target = document.getElementById(id);
    if (!target?.classList.contains('section')) return;
    $$('.section').forEach(section => section.classList.toggle('active', section === target));
    if (id === 'contato') switchContactTab(false);
    $('#menuOverlay')?.classList.remove('open');
    $('#hamburger')?.setAttribute('aria-expanded', 'false');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderArtists() {
    const grid = $('#artistGrid');
    if (!grid) return;
    grid.innerHTML = artists.map(artist => `
      <button class="artist-card" type="button" data-artist="${artist.id}" aria-label="Ver catálogo de ${artist.nome}">
        <img src="${assetUrl(artist.imagem)}" alt="${artist.nome}" loading="lazy">
        <h3>${artist.nome}</h3><p class="muted">${artist.genero}</p>
      </button>`).join('');
    $$('.artist-card', grid).forEach(card => card.addEventListener('click', () => openArtistModal(card.dataset.artist)));
  }

  function renderReleases() {
    const grid = $('#releaseGrid');
    if (!grid) return;
    grid.innerHTML = releases.map(release => {
      const artist = artistById(release.artistaId);
      const tracks = release.tracks.length ? release.tracks.map((track, index) => `
        <div class="track"><span class="track-index">${index + 1}</span>
          <button class="track-play" type="button" data-src="${assetUrl(track.src)}" data-track="${release.id}-${index}" aria-label="Tocar ${track.nome}"><i class="fa-solid fa-play"></i></button>
          <span class="track-name">${track.nome}</span></div>`).join('') : '<p class="muted">Ouça este lançamento no Spotify.</p>';
      return `<article class="release-card"><div class="release-head">
        <img src="${assetUrl(release.capa)}" alt="Capa de ${release.titulo}" loading="lazy">
        <div><div class="release-title">${release.titulo}</div><div class="release-artist">${artist?.nome ?? '—'}</div></div>
        </div><div class="tracklist">${tracks}</div>
        <a class="btn btn-spotify" href="${release.spotify}" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-spotify"></i> Spotify</a></article>`;
    }).join('');
    $$('.track-play', grid).forEach(button => button.addEventListener('click', () => toggleTrack(button)));
  }

  function toggleTrack(button) {
    const { track: id, src } = button.dataset;
    const icon = $('i', button);
    if (currentTrack === id) {
      if (audio.paused) audio.play().then(() => { icon.className = 'fa-solid fa-pause'; }).catch(handleAudioError);
      else audio.pause();
      return;
    }
    if (currentTrack) {
      const previousIcon = $(`.track-play[data-track="${CSS.escape(currentTrack)}"] i`);
      if (previousIcon) previousIcon.className = 'fa-solid fa-play';
    }
    currentTrack = id;
    audio.src = src;
    audio.play().then(() => { icon.className = 'fa-solid fa-pause'; }).catch(handleAudioError);
    audio.onended = () => { icon.className = 'fa-solid fa-play'; currentTrack = null; };
  }

  function handleAudioError(error) {
    console.warn('[Knitting] Não foi possível reproduzir o áudio:', error);
    if (currentTrack) {
      const icon = $(`.track-play[data-track="${CSS.escape(currentTrack)}"] i`);
      if (icon) icon.className = 'fa-solid fa-play';
    }
    currentTrack = null;
  }

  function openArtistModal(id) {
    const artist = artistById(id);
    const modal = $('#artistModal');
    if (!artist || !modal) return;
    $('#artistModalImg').src = assetUrl(artist.imagem);
    $('#artistModalImg').alt = artist.nome;
    $('#artistModalTitle').textContent = artist.nome;
    $('#artistModalGenre').textContent = artist.genero;
    $('#artistModalSpotify').href = artist.spotify;
    const catalog = releases.filter(release => release.artistaId === id);
    $('#artistModalReleases').innerHTML = catalog.length ? catalog.map(release => `
      <div class="catalog-item"><img src="${assetUrl(release.capa)}" alt="Capa de ${release.titulo}" loading="lazy">
      <div class="catalog-item-info"><h4>${release.titulo}</h4><p>${release.tracks.length} faixa${release.tracks.length === 1 ? '' : 's'}</p></div>
      <a href="${release.spotify}" target="_blank" rel="noopener noreferrer">Spotify ↗</a></div>`).join('') : '<p class="muted">Nenhum lançamento cadastrado.</p>';
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeArtistModal() {
    $('#artistModal')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  function toText(fields) {
    return Object.entries(fields).map(([key, value]) => `${key}: ${value ?? ''}`).join('\n') + '\n';
  }

  async function submitToStorage(fields, status, form, successMessage) {
    if (!form.reportValidity()) return;
    if (!supabaseClient) {
      setStatus(status, 'Envio indisponível: não foi possível conectar ao serviço de formulários. Tente novamente mais tarde.', 'error');
      return;
    }
    const fileName = `${fields.tipo}/${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomUUID().slice(0, 8)}.txt`;
    const submitButton = $('button[type="submit"]', form);
    if (submitButton) submitButton.disabled = true;
    setStatus(status, 'Enviando…');
    try {
      const { error } = await supabaseClient.storage.from(BUCKET).upload(fileName, new Blob([toText(fields)], { type: 'text/plain;charset=utf-8' }), { contentType: 'text/plain', upsert: false });
      if (error) throw error;
      setStatus(status, successMessage, 'success');
      form.reset();
    } catch (error) {
      console.error('[Knitting] Falha no envio:', error);
      setStatus(status, `Não foi possível enviar agora. ${error.message || 'Tente novamente mais tarde.'}`, 'error');
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  }

  function fixNewsImagePaths() {
    $$('img').forEach(image => {
      if (image.getAttribute('src') === 'peido.jpg') image.src = assetUrl('covers/ricardo/peido/peido.jpeg');
      if (image.getAttribute('src') === 'nobody.png') image.src = assetUrl('covers/knitting_cat/nobody/nobody.png');
    });
  }

  function init() {
    renderArtists();
    renderReleases();
    fixNewsImagePaths();
    try {
      if (window.supabase?.createClient) supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (error) { console.error('[Knitting] Supabase indisponível:', error); }

    $('#hamburger')?.addEventListener('click', () => {
      const overlay = $('#menuOverlay');
      const open = !overlay?.classList.contains('open');
      overlay?.classList.toggle('open', open);
      $('#hamburger')?.setAttribute('aria-expanded', String(open));
    });
    $('#closeMenu')?.addEventListener('click', () => { $('#menuOverlay')?.classList.remove('open'); $('#hamburger')?.setAttribute('aria-expanded', 'false'); });
    $('#menuOverlay')?.addEventListener('click', event => { if (event.target.id === 'menuOverlay') { event.currentTarget.classList.remove('open'); $('#hamburger')?.setAttribute('aria-expanded', 'false'); } });
    $$('[data-section]').forEach(element => element.addEventListener('click', event => { event.preventDefault(); showSection(element.dataset.section); }));
    $('#btnContato')?.addEventListener('click', () => switchContactTab(false));
    $('#btnDemo')?.addEventListener('click', () => switchContactTab(true));
    $('#artistModalClose')?.addEventListener('click', closeArtistModal);
    $('#artistModal')?.addEventListener('click', event => { if (event.target.id === 'artistModal') closeArtistModal(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeArtistModal(); $('#menuOverlay')?.classList.remove('open'); $('#hamburger')?.setAttribute('aria-expanded', 'false'); } });

    $('#contactForm')?.addEventListener('submit', event => {
      event.preventDefault();
      const form = event.currentTarget;
      submitToStorage({ tipo: 'contatos', quando: new Date().toLocaleString('pt-BR'), email: $('#contactEmail').value.trim(), assunto: $('#contactSubject').value.trim(), mensagem: $('#contactMessage').value.trim() }, $('#contactStatus'), form, 'Mensagem enviada! Responderemos em breve.');
    });
    $('#demoForm')?.addEventListener('submit', event => {
      event.preventDefault();
      const form = event.currentTarget;
      submitToStorage({ tipo: 'demos', quando: new Date().toLocaleString('pt-BR'), nome_musica: $('#demoNomeMusica').value.trim(), nome_artistico: $('#demoArtistico').value.trim(), genero: $('#demoGenero').value, nome_completo: $('#demoNomeCompleto').value.trim(), objetivo: $('#demoObjetivo').value, pretende: $('#demoPretende').value.trim(), email: $('#demoEmail').value.trim(), link: $('#demoLink').value.trim() }, $('#demoStatus'), form, 'Obrigado! Sua demo foi enviada.');
    });
    $('#newsletterForm')?.addEventListener('submit', event => {
      event.preventDefault();
      const form = event.currentTarget;
      submitToStorage({ tipo: 'newsletter', quando: new Date().toLocaleString('pt-BR'), email: $('#newsEmail').value.trim() }, $('#newsStatus'), form, 'Obrigado! Você receberá nossas novidades.');
    });

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('./sw.js').catch(error => console.warn('[PWA] Service worker não registrado:', error));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
