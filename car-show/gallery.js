'use strict';
const grid = document.querySelector('#photo-grid');
const search = document.querySelector('#search');
const modal = document.querySelector('#lightbox');
let photos = [];
let opener;
function safeLocalPath(value) {
  if (!value) return null;
  const url = new URL(value, location.href);
  return url.origin === location.origin && /^https?:$/.test(url.protocol) ? url.href : null;
}
function openPhoto(photo, button) {
  opener = button;
  const img = document.querySelector('#large-photo');
  img.src = safeLocalPath(photo.src);
  img.alt = photo.sample ? `Illustration placeholder for ${photo.title}` : `${photo.title} — ${photo.color}`;
  document.querySelector('#photo-title').textContent = `${photo.title} · #${photo.id}`;
  document.querySelector('#photo-description').textContent = photo.sample ? 'Sample photo card — actual show photographs coming soon.' : photo.color;
  const link = document.querySelector('#download');
  const download = !photo.sample && safeLocalPath(photo.download || photo.src);
  link.hidden = !download;
  link.removeAttribute('href');
  if(download) { link.href = download; link.download = new URL(download).pathname.split('/').pop(); }
  document.querySelector('#sample-note').hidden = !!download;
  modal.showModal();
  document.body.style.overflow = 'hidden';
}
modal.addEventListener('close', () => { document.body.style.overflow = ''; opener?.focus(); });
document.querySelector('#close-modal').addEventListener('click', () => modal.close());
modal.addEventListener('click', e => { if(e.target === modal) { const r=modal.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) modal.close(); } });
document.querySelector('#modal-giveaway').addEventListener('click', () => modal.close());
document.querySelector('#preview-form').addEventListener('submit', e => e.preventDefault());
function render() {
  const term = search.value.trim().toLowerCase();
  const matches = photos.filter(p => `${p.id} ${p.title} ${p.color} ${p.tags || ''}`.toLowerCase().includes(term));
  grid.replaceChildren();
  for (const p of matches) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'photo-card';
    button.setAttribute('aria-label', `View ${p.title}, ${p.color}, photo ${p.id}${p.sample ? ', sample' : ''}`);
    const img = document.createElement('img');
    img.src = safeLocalPath(p.thumbnail || p.src); img.alt = p.sample ? 'Car illustration placeholder' : `${p.color} ${p.title}`; img.loading = 'lazy'; img.width = 600; img.height = 400;
    if(p.sample) img.style.filter = `hue-rotate(${Number(p.id)*25-25}deg)`;
    const meta = document.createElement('span'); meta.className = 'card-meta';
    const copy = document.createElement('span');
    const title = document.createElement('strong'); title.textContent = p.title;
    const note = document.createElement('small'); note.textContent = `#${p.id} · ${p.color}${p.sample ? ' · SAMPLE' : ''}`;
    const arrow = document.createElement('span'); arrow.className = 'arrow'; arrow.textContent = '↗'; arrow.setAttribute('aria-hidden','true');
    copy.append(title,note); meta.append(copy,arrow); button.append(img,meta);
    button.addEventListener('click', () => openPhoto(p,button)); grid.append(button);
  }
  document.querySelector('#count').textContent = `${matches.length} ${matches.every(p=>p.sample) && matches.length ? 'sample ' : ''}photo${matches.length === 1 ? '' : 's'}`;
  document.querySelector('#empty').hidden = matches.length !== 0;
}
search.addEventListener('input', render);
fetch('gallery.json', {cache:'no-store'}).then(r => { if(!r.ok) throw Error('Gallery unavailable'); return r.json(); }).then(data => {
  photos = data.photos.filter(p => safeLocalPath(p.src));
  if(!data.preview) {
    document.querySelector('.preview')?.setAttribute('hidden', '');
    document.querySelector('.gallery-note').textContent = photos.length ? 'A few photographs of my dad and his cars. Car-show photos will be added here after the event.' : 'The show gallery is on its way. Check back after the event.';
  }
  if(!data.preview && data.entryFormUrl) {
    const url = new URL(data.entryFormUrl);
    if(url.protocol !== 'https:' || url.hostname !== 'link.disruptormarketing.io' || !url.pathname.startsWith('/widget/form/')) throw Error('Unsupported entry form');
    const frame = document.createElement('iframe'); frame.src = url.href; frame.title = 'Car show giveaway entry form';
    document.querySelector('#live-entry').append(frame);
    document.querySelector('#preview-form').hidden = true;
    document.querySelector('#entry-status').textContent = 'Enter your details below for a chance to win.';
  }
  render();
}).catch(() => { document.querySelector('#count').textContent = 'Gallery unavailable'; document.querySelector('.gallery-note').textContent = 'The gallery could not load. Please refresh this page or contact Mark for help.'; });
document.querySelector('#year').textContent = new Date().getFullYear();
