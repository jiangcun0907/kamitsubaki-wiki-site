document.addEventListener('DOMContentLoaded', () => {
  const preloader = document.getElementById('preloader');
  const bodyWrap = document.getElementById('body-wrap');

  setTimeout(() => {
    preloader?.classList.add('hidden-preloader');
    bodyWrap?.classList.remove('overflow-hidden');
    setTimeout(() => {
      if (preloader) {
        preloader.style.display = 'none';
      }
    }, 1500);
  }, 1800);

  const cursor = document.getElementById('cursor');
  const hoverElements = document.querySelectorAll('a, button, .artist-row');

  if (cursor && window.matchMedia('(pointer: fine)').matches) {
    document.addEventListener('mousemove', (event) => {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
    });

    hoverElements.forEach((element) => {
      element.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
      element.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
    });
  } else if (cursor) {
    cursor.style.display = 'none';
  }

  const artistRows = document.querySelectorAll('.artist-row');
  const bgContainer = document.getElementById('artist-bg-container');
  const bgImg = document.getElementById('artist-bg-img');

  artistRows.forEach((row) => {
    row.addEventListener('mouseenter', () => {
      if (!(bgContainer instanceof HTMLElement) || !(bgImg instanceof HTMLImageElement)) {
        return;
      }

      bgImg.src = row.getAttribute('data-img') ?? '';
      bgContainer.style.opacity = '1';
      setTimeout(() => {
        bgImg.style.transform = 'scale(1)';
      }, 50);
    });

    row.addEventListener('mouseleave', () => {
      if (!(bgContainer instanceof HTMLElement) || !(bgImg instanceof HTMLImageElement)) {
        return;
      }

      bgContainer.style.opacity = '0';
      bgImg.style.transform = 'scale(0.95)';
    });
  });

  const revealElements = document.querySelectorAll('.reveal-up');
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      root: null,
      rootMargin: '0px 0px -100px 0px',
      threshold: 0.1,
    },
  );

  revealElements.forEach((element) => {
    revealObserver.observe(element);
  });

  const readingProgressBars = document.querySelectorAll('[data-reading-progress]');

  if (readingProgressBars.length > 0) {
    const updateReadingProgress = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;

      readingProgressBars.forEach((bar) => {
        if (bar instanceof HTMLElement) {
          bar.style.transform = `scaleX(${progress})`;
        }
      });
    };

    updateReadingProgress();
    window.addEventListener('scroll', updateReadingProgress, { passive: true });
    window.addEventListener('resize', updateReadingProgress);
  }
});
