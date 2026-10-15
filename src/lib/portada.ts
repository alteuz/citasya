/**
 * Póster del video de la portada: su primer cuadro (el logo de frente), en WebP
 * de 15 KB. Vive en /public con un nombre estable para que el HTML
 * prerenderizado lo precargue en el <head> (scripts/prerender.mjs). Es el
 * elemento LCP de la portada: se pinta con el HTML, sin esperar al JavaScript
 * ni al video (ADR-0007).
 */
export const POSTER_PORTADA = '/portada-poster.webp';
