import { CalendarCheck2, ShieldCheck, UsersRound, type LucideIcon } from 'lucide-react';

/** Los tres valores del tablero de marca (portada y pantallas de acceso). */
export const VALORES_MARCA: readonly { readonly icono: LucideIcon; readonly titulo: string; readonly texto: string }[] = [
  { icono: CalendarCheck2, titulo: 'Agenda fácil', texto: 'En pocos pasos' },
  { icono: ShieldCheck, titulo: 'Seguro y confiable', texto: 'Tus datos protegidos' },
  { icono: UsersRound, titulo: 'Para todos', texto: 'Diseñado para ti' },
];
