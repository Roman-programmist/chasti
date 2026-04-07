// ===== CAROUSEL =====
const track = document.getElementById('carouselTrack');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const currentEl = document.getElementById('currentSlide');
const totalEl = document.getElementById('totalSlides');

const originalSlides = Array.from(track.querySelectorAll('.carousel-slide'));
const total = originalSlides.length;
totalEl.textContent = total;

// Строим тройную карусель (порядок: S0..S(N-1) → оригиналы → S0..S(N-1))
track.innerHTML = '';
for (let i = 0; i < total; i++) {
    const clone = originalSlides[i].cloneNode(true);
    clone.classList.add('clone');
    track.appendChild(clone);
}
originalSlides.forEach(slide => track.appendChild(slide));
for (let i = 0; i < total; i++) {
    const clone = originalSlides[i].cloneNode(true);
    clone.classList.add('clone');
    track.appendChild(clone);
}

let index = total;
let isAnimating = false;
let pendingDirection = null;

function updateCurrent() {
    let slideNumber = ((index % total) + total) % total;
    currentEl.textContent = slideNumber + 1;
}

function setTransform(withTransition = true) {
    track.style.transition = withTransition
        ? 'transform 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        : 'none';
    track.style.transform = `translateX(-${index * 100}%)`;
}

function correctIndex() {
    if (index >= total * 2) {
        index -= total;
        setTransform(false);
        void track.offsetHeight;
        updateCurrent();
    } else if (index < total) {
        index += total;
        setTransform(false);
        void track.offsetHeight;
        updateCurrent();
    }
}

function move(direction) {
    if (isAnimating) {
        pendingDirection = direction;
        return;
    }

    // Остановить видео при переключении слайда
    stopAllVideos();

    isAnimating = true;
    const newIndex = index + direction;
    index = newIndex;
    setTransform(true);
    updateCurrent();

    const onTransitionEnd = () => {
        track.removeEventListener('transitionend', onTransitionEnd);
        correctIndex();
        isAnimating = false;

        if (pendingDirection !== null) {
            const dir = pendingDirection;
            pendingDirection = null;
            move(dir);
        }
    };
    track.addEventListener('transitionend', onTransitionEnd);
}

prevBtn.addEventListener('click', () => move(-1));
nextBtn.addEventListener('click', () => move(1));

// ===== SWIPE (мобильные) =====
let startX = 0;
let startY = 0;
let wasSwipe = false;
const carouselEl = document.querySelector('.character-carousel');

carouselEl.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    wasSwipe = false;
}, { passive: true });

carouselEl.addEventListener('touchend', e => {
    const diffX = startX - e.changedTouches[0].clientX;
    const diffY = startY - e.changedTouches[0].clientY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 80) {
        wasSwipe = true;
        move(diffX > 0 ? 1 : -1);
    }
}, { passive: true });

document.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') move(-1);
    if (e.key === 'ArrowRight') move(1);
});

setTransform(false);
updateCurrent();

// ===== VIDEO TOGGLE =====
let activeVideoContainer = null;

function stopAllVideos() {
    document.querySelectorAll('.char-video').forEach(v => {
        v.pause();
    });
}

function resetVideoToPhoto(mediaContainer) {
    const photo = mediaContainer.querySelector('.char-photo');
    const video = mediaContainer.querySelector('.char-video');
    const layer = mediaContainer.querySelector('.video-click-layer');
    const watermark = mediaContainer.querySelector('.photo-watermark');
    if (photo && video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
        video.style.display = 'none';
        video.controls = false;
        if (layer) layer.style.display = 'none';
        photo.style.display = 'block';
        if (watermark) watermark.style.display = 'block';
    }
    activeVideoContainer = null;
}

// Отслеживаем выход из fullscreen — сбрасываем на фото
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && activeVideoContainer) {
        // Принудительно восстанавливаем viewport
        const meta = document.querySelector('meta[name="viewport"]');
        if (meta) {
            const content = meta.getAttribute('content');
            meta.setAttribute('content', 'width=device-width, initial-scale=1.0');
            // Небольшой тик чтобы браузер пересчитал layout
            requestAnimationFrame(() => {
                meta.setAttribute('content', content);
            });
        }
        resetVideoToPhoto(activeVideoContainer);
    }
});

// Фото → клик → видео в полный экран
document.addEventListener('click', (e) => {
    if (wasSwipe) {
        wasSwipe = false;
        return;
    }

    // Клик по прозрачному слою поверх видео — выходим из fullscreen
    if (e.target.classList.contains('video-click-layer')) {
        e.preventDefault();
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }
        return;
    }

    // Клик по контейнеру (когда видно фото) → видео в полный экран
    const mediaContainer = e.target.closest('.carousel-media.video-embed');
    if (!mediaContainer) return;

    const photo = mediaContainer.querySelector('.char-photo');
    const video = mediaContainer.querySelector('.char-video');
    const watermark = mediaContainer.querySelector('.photo-watermark');
    if (!photo || !video) return;

    // Если уже видео — игнорируем
    if (video.style.display === 'block') return;

    const slide = mediaContainer.closest('.carousel-slide');
    const videoFile = slide ? slide.dataset.video : null;
    if (!videoFile) return;

    // Подгружаем видео
    if (!video.querySelector('source') && !video.src) {
        video.src = 'video/' + videoFile;
        video.load();
    }

    photo.style.display = 'none';
    video.style.display = 'block';
    video.controls = true;
    if (watermark) watermark.style.display = 'none';

    // Пробуем fullscreen
    const goFullscreen = () => {
        video.play().catch(() => {});
        activeVideoContainer = mediaContainer;
        const requestFullscreen = video.requestFullscreen || video.webkitRequestFullscreen || video.msRequestFullscreen;
        if (requestFullscreen) {
            requestFullscreen.call(video).catch(() => {
                // Если fullscreen недоступен — просто показываем видео
            });
        }
    };

    goFullscreen();
});

// ===== SCROLL TO TOP =====
const scrollTopBtn = document.getElementById('scrollTopBtn');
window.addEventListener('scroll', () => {
    scrollTopBtn.classList.toggle('visible', window.scrollY > 400);
});
scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
