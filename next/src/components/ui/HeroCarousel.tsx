import { useEffect, useState } from 'react';
import { heroSlides } from '../../data/demo/media';
import { MediaImage } from './MediaImage';

export function HeroCarousel() {
  const [active, setActive] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [interaction, setInteraction] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const slide = heroSlides[active];

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (reducedMotion || userPaused || interaction) return;
    const timer = window.setInterval(() => setActive((index) => (index + 1) % heroSlides.length), 6500);
    return () => window.clearInterval(timer);
  }, [interaction, reducedMotion, userPaused]);

  const move = (direction: -1 | 1) => setActive((index) => (index + direction + heroSlides.length) % heroSlides.length);

  return <section className="hero-carousel" aria-roledescription="carousel" aria-label="Nursing and learning highlights" onMouseEnter={() => setInteraction(true)} onMouseLeave={() => setInteraction(false)} onFocusCapture={() => setInteraction(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setInteraction(false); }}>
    <div className="hero-slide" aria-live="off">
      <div className="hero-copy" key={`${active}-copy`}>
        <span className="hero-eyebrow">{slide.eyebrow}</span><h2>{slide.title}</h2><p>{slide.body}</p><span className="hero-caption">{slide.label} <span aria-hidden="true">·</span> Demonstration image</span>
      </div>
      <div className="hero-image-wrap" key={`${active}-image`}><MediaImage asset={slide.image} className="hero-image" loading="lazy" sizes="(max-width: 820px) 100vw, 52vw"/><span className="photo-credit">Photo: {slide.image.creator} / Pexels</span></div>
    </div>
    <div className="hero-controls"><div className="carousel-dots" role="group" aria-label="Choose highlight slide">{heroSlides.map((item, index) => <button key={item.label} className={`carousel-dot${active === index ? ' active' : ''}`} type="button" aria-label={`Show slide ${index + 1}: ${item.label}`} aria-current={active === index ? 'true' : undefined} onClick={() => setActive(index)}/>)}</div><div className="carousel-actions"><button type="button" className="carousel-control" aria-label="Previous slide" onClick={() => move(-1)}>‹</button><button type="button" className="carousel-control" aria-label="Next slide" onClick={() => move(1)}>›</button><button type="button" className="carousel-pause" onClick={() => setUserPaused((paused) => !paused)} aria-pressed={userPaused} aria-label={userPaused ? 'Resume automatic slide rotation' : 'Pause automatic slide rotation'}>{userPaused ? 'Play' : 'Pause'}</button></div><span className="sr-only" aria-live={interaction ? 'polite' : 'off'}>Slide {active + 1} of {heroSlides.length}: {slide.label}</span></div>
  </section>;
}
