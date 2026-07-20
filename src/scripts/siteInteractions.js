import { detectExternalPlatform } from '../lib/externalPlatforms.mjs';

const externalLinksHeadingPattern = /^(外部链接|外部連結|外部リンク|external\s+links?)$/i;

export const isExternalLinksHeading = (value) => externalLinksHeadingPattern.test(String(value).trim());

const createPlatformIcon = (ownerDocument, platform) => {
  const badge = ownerDocument.createElement('span');
  badge.className = 'platform-icon';
  badge.dataset.platform = platform.id;
  badge.title = platform.name;
  badge.setAttribute('aria-hidden', 'true');

  const svg = ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('focusable', 'false');

  if (platform.icon) {
    const path = ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', platform.icon.path);
    svg.append(path);
  } else {
    svg.classList.add('platform-icon__globe');
    const circle = ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '8.75');
    const path = ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M3.5 12h17M12 3.25c2.2 2.35 3.3 5.27 3.3 8.75S14.2 18.4 12 20.75C9.8 18.4 8.7 15.48 8.7 12S9.8 5.6 12 3.25Z');
    svg.append(circle, path);
  }

  badge.append(svg);
  return badge;
};

const createExternalArrow = (ownerDocument) => {
  const svg = ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('external-link-card__arrow');
  svg.setAttribute('viewBox', '0 0 20 20');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M6 14 14 6M8 6h6v6');
  svg.append(path);
  return svg;
};

export const enhanceExternalLinkSections = (root) => {
  root.querySelectorAll('.wiki-artist-prose h2').forEach((heading) => {
    if (!isExternalLinksHeading(heading.textContent)) return;

    let list = heading.nextElementSibling;
    while (list && list.tagName !== 'H2' && list.tagName !== 'UL') list = list.nextElementSibling;
    if (!list || list.tagName !== 'UL') return;

    heading.classList.add('wiki-external-links-heading');
    list.classList.add('wiki-external-links');

    Array.from(list.children).forEach((item) => {
      if (!(item instanceof HTMLElement) || item.dataset.externalLinkEnhanced === 'true') return;
      const link = item.querySelector(':scope > a');
      if (!(link instanceof HTMLAnchorElement)) return;

      const label = link.textContent?.trim() || link.href;
      const platform = detectExternalPlatform({ href: link.href, label });
      const ownerDocument = link.ownerDocument;
      const copy = ownerDocument.createElement('span');
      const name = ownerDocument.createElement('span');
      const platformName = ownerDocument.createElement('span');

      copy.className = 'external-link-card__copy';
      name.className = 'external-link-card__label';
      platformName.className = 'external-link-card__platform';
      platformName.textContent = platform.name;
      while (link.firstChild) name.append(link.firstChild);
      copy.append(name, platformName);

      item.classList.add('wiki-external-links__item');
      item.dataset.externalLinkEnhanced = 'true';
      link.classList.add('external-link-card', 'external-link-card--prose');
      link.dataset.platform = platform.id;
      link.style.setProperty('--platform-color', platform.color);
      link.append(createPlatformIcon(ownerDocument, platform), copy, createExternalArrow(ownerDocument));
    });
  });
};

document.addEventListener('DOMContentLoaded', () => {
  document.documentElement.classList.add('has-js');
  enhanceExternalLinkSections(document);

  const preloader = document.getElementById('preloader');
  const bodyWrap = document.getElementById('body-wrap');
  const hasSeenPreloader = window.sessionStorage.getItem('kamitsubaki-preloader-seen') === '1';
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealElements = document.querySelectorAll('.reveal-up');
  let revealsStarted = false;

  const startReveals = () => {
    if (revealsStarted) {
      return;
    }

    revealsStarted = true;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      revealElements.forEach((element) => element.classList.add('active'));
      return;
    }

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
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.01,
      },
    );

    revealElements.forEach((element) => {
      revealObserver.observe(element);
    });
  };

  const hidePreloader = () => {
    preloader?.classList.add('hidden-preloader');
    bodyWrap?.classList.remove('overflow-hidden', 'ui-loading');

    window.setTimeout(startReveals, hasSeenPreloader ? 40 : 180);

    window.setTimeout(() => {
      if (preloader) {
        preloader.style.display = 'none';
      }
    }, 650);
  };

  if (hasSeenPreloader) {
    hidePreloader();
  } else {
    window.setTimeout(() => {
      window.sessionStorage.setItem('kamitsubaki-preloader-seen', '1');
      hidePreloader();
    }, 900);
  }

  const cursor = document.getElementById('cursor');

  if (cursor && window.matchMedia('(pointer: fine)').matches) {
    document.addEventListener('mousemove', (event) => {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
    });

    // Use event delegation to handle dynamically loaded elements (like AI Chat)
    document.addEventListener('mouseover', (event) => {
      const hoverable = event.target instanceof Element && event.target.closest('a, button, summary, [data-hoverable], [role="button"], input[type="button"], input[type="submit"]');
      if (hoverable) {
        cursor.classList.add('hovering');
      } else {
        cursor.classList.remove('hovering');
      }
    });

    document.addEventListener('mouseleave', () => {
      cursor.classList.remove('hovering');
    });
  } else if (cursor) {
    cursor.style.display = 'none';
  }

  const bgContainer = document.getElementById('artist-bg-container');
  const bgImg = document.getElementById('artist-bg-img');
  const artistList = document.getElementById('artist-list');

  if (bgContainer instanceof HTMLElement && bgImg instanceof HTMLImageElement) {
    const bgLayers = Array.from(bgContainer.querySelectorAll('.artist-bg__image')).filter(
      (layer) => layer instanceof HTMLImageElement,
    );
    let activeBgLayer = null;
    let backgroundRequest = 0;

    const showArtistBackground = (row) => {
      const imageUrl = row.getAttribute('data-img');
      if (!imageUrl) return;

      const request = ++backgroundRequest;
      bgContainer.classList.add('is-visible');

      if (activeBgLayer?.dataset.src === imageUrl) {
        activeBgLayer.classList.add('is-active');
        return;
      }

      const nextLayer = bgLayers.find((layer) => layer !== activeBgLayer) ?? bgImg;
      nextLayer.classList.remove('is-active');
      nextLayer.dataset.src = imageUrl;
      nextLayer.src = imageUrl;

      const revealLayer = () => {
        if (request !== backgroundRequest) return;
        activeBgLayer?.classList.remove('is-active');
        nextLayer.classList.add('is-active');
        activeBgLayer = nextLayer;
      };

      if (nextLayer.complete) {
        window.requestAnimationFrame(revealLayer);
      } else {
        nextLayer.addEventListener('load', revealLayer, { once: true });
      }
    };

    const hideArtistBackground = () => {
      backgroundRequest += 1;
      bgContainer.classList.remove('is-visible');
      activeBgLayer?.classList.remove('is-active');
    };

    document.querySelectorAll('.artist-row').forEach((row) => {
      row.addEventListener('mouseenter', () => showArtistBackground(row));
      row.addEventListener('mouseleave', hideArtistBackground);
      row.addEventListener('focusin', () => showArtistBackground(row));
      row.addEventListener('focusout', hideArtistBackground);
      row.setAttribute('data-artist-hover-ready', 'true');
    });
  }

  const heroParallaxElements = document.querySelectorAll('[data-hero-parallax]');

  if (heroParallaxElements.length > 0 && !prefersReducedMotion) {
    let heroFrame = 0;

    const updateHeroParallax = () => {
      heroFrame = 0;
      const offset = Math.min(window.scrollY, 760) * -0.035;

      heroParallaxElements.forEach((element) => {
        element.style.setProperty('--hero-parallax-y', `${offset.toFixed(2)}px`);
      });
    };

    const requestHeroParallax = () => {
      if (!heroFrame) {
        heroFrame = window.requestAnimationFrame(updateHeroParallax);
      }
    };

    updateHeroParallax();
    window.addEventListener('scroll', requestHeroParallax, { passive: true });
  }

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

  // Preload artist hover images in the background on idle to prevent latency/flash
  const preloadArtistImages = () => {
    const rowsToPreload = document.querySelectorAll('.artist-row');
    rowsToPreload.forEach((row) => {
      const imgUrl = row.getAttribute('data-img');
      if (imgUrl) {
        const img = new Image();
        img.src = imgUrl;
      }
    });
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => preloadArtistImages());
  } else {
    window.setTimeout(preloadArtistImages, 1500);
  }

  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element && event.target.closest('[data-lyric-action]');
    if (!(button instanceof HTMLButtonElement)) return;

    const controls = button.closest('.my-lyric-controls');
    const lyricBox = controls?.nextElementSibling;
    if (!(lyricBox instanceof HTMLElement) || !lyricBox.classList.contains('my-lyric-box')) return;

    const action = button.dataset.lyricAction;
    let active = false;

    if (action === 'ruby') active = lyricBox.classList.toggle('hide-ruby');
    else if (action === 'translation') active = lyricBox.classList.toggle('hide-translation');
    else if (action === 'phonetic') active = lyricBox.classList.toggle('show-romaji');
    else return;

    button.setAttribute('aria-pressed', String(active));
    if (action === 'phonetic') {
      button.textContent = active ? button.dataset.alternateLabel || '' : button.dataset.primaryLabel || '';
    } else {
      button.textContent = active ? button.dataset.showLabel || '' : button.dataset.hideLabel || '';
    }
  });

  const toggleSpoiler = (spoiler) => {
    const revealed = spoiler.classList.toggle('is-revealed');
    spoiler.setAttribute('aria-expanded', String(revealed));
  };

  document.addEventListener('click', (event) => {
    const spoiler = event.target instanceof Element && event.target.closest('.wiki-spoiler');
    if (spoiler instanceof HTMLElement) toggleSpoiler(spoiler);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const spoiler = event.target instanceof Element && event.target.closest('.wiki-spoiler');
    if (!(spoiler instanceof HTMLElement)) return;
    event.preventDefault();
    toggleSpoiler(spoiler);
  });

  // ── Artist category expand/collapse ──
  if (artistList instanceof HTMLElement) {
    artistList.addEventListener('click', (event) => {
      const button = event.target instanceof Element && event.target.closest('.artist-expand-btn');
      if (!button) return;

      const collapsibleId = button.getAttribute('aria-controls');
      if (!collapsibleId) return;

      const collapsible = document.getElementById(collapsibleId);
      if (!(collapsible instanceof HTMLElement)) return;

      const copy = button.querySelector('[data-artist-expand-copy]');
      const inner = collapsible.querySelector('.artist-collapsible__inner');
      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      const nextExpanded = !isExpanded;

      if (inner instanceof HTMLElement) {
        collapsible.style.setProperty('--artist-collapsible-height', `${inner.scrollHeight}px`);
      }

      button.setAttribute('aria-expanded', String(nextExpanded));
      collapsible.dataset.expanded = String(nextExpanded);
      collapsible.setAttribute('aria-hidden', String(!nextExpanded));
      collapsible.inert = !nextExpanded;

      if (copy) {
        copy.textContent = nextExpanded
          ? button.getAttribute('data-collapse-label') || ''
          : button.getAttribute('data-expand-label') || '';
      }

      button.setAttribute(
        'aria-label',
        nextExpanded
          ? button.getAttribute('data-collapse-label') || ''
          : button.getAttribute('data-expand-label') || '',
      );
    });
  }
});
