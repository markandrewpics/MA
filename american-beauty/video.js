{
  const video = document.getElementById('studio-video');
  const cover = document.getElementById('studio-video-play');
  if (video && cover) {
    cover.hidden = false;
    video.controls = false;
    cover.addEventListener('click', () => {
      video.controls = true;
      video.focus({preventScroll: true});
      cover.hidden = true;
      video.play().catch(() => {}); // Keep native controls if autoplay is blocked.
    });
  }
}
