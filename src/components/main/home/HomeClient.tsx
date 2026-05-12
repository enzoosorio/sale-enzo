'use client';
import { useCategoriesStore } from '@/store/categorySection';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { Flip, ScrollTrigger } from 'gsap/all';
import { ReactLenis, useLenis } from 'lenis/react';
import { useEffect } from 'react';

import { finalBackground, initialBackground } from './homeAnimations.constants';

gsap.registerPlugin(useGSAP, ScrollTrigger, Flip);

// Inner component so useLenis() runs inside the ReactLenis context
function HomeScrollAnimations() {
  const { showCategories } = useCategoriesStore();
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;
    showCategories ? lenis.stop() : lenis.start();
  }, [showCategories, lenis]);

  useGSAP(() => {
    const productsWrapper = document.querySelector('.products-wrapper');
    const totalProductsHeight = productsWrapper?.scrollHeight ?? 0;
    const viewportHeight = window.innerHeight;
    const distanceToMove = totalProductsHeight - viewportHeight;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.main-home',
        start: 'top top',
        end: `+=${distanceToMove + viewportHeight * 1.5}`,
        scrub: true,
      },
    });

    tl.to('.mini-navbar-container', { paddingTop: '2rem', paddingBottom: '2.1rem', ease: 'expo.out', duration: 0.3 }, 0);
    tl.to('.super-barra-busqueda', { border: '1px solid rgba(0,0,0,0.9)', ease: 'expo.out', duration: 0.3 }, 0);
    tl.to('.addons-wrapper', { y: '6rem', ease: 'expo.out', duration: 0.1 }, 0.025);
    tl.fromTo(
      '.mini-navbar-container',
      { background: initialBackground },
      { background: finalBackground, backdropFilter: 'blur(10px)', ease: 'elastic.out(1,0.75)', duration: 0.3 },
      0,
    );
  }, []);

  return null;
}

// Renders nothing visible — initializes Lenis on document root and runs GSAP animations
export function HomeClient() {
  return (
    <ReactLenis root>
      <HomeScrollAnimations />
    </ReactLenis>
  );
}
