export const email = 'danielroytel@gmail.com';

export const socialMedia = [
  { name: 'Linkedin', url: 'https://www.linkedin.com/in/danielroytel' },
  { name: 'GitHub', url: 'https://github.com/danielroytel' },
] as const;

export const navLinks = [
  { name: 'About', url: '/#about' },
  { name: 'Experience', url: '/#jobs' },
  { name: 'Contact', url: '/#contact' },
] as const;

export const colors = {
  green: '#64ffda',
  navy: '#cc0000',
  darkNavy: '#020c1b',
} as const;

export interface SrConfigOptions {
  delay?: number;
  viewFactor?: number;
}

export const srConfig = ({ delay = 200, viewFactor = 0.25 }: SrConfigOptions = {}) => ({
  origin: 'bottom',
  distance: '20px',
  duration: 500,
  delay,
  rotate: { x: 0, y: 0, z: 0 },
  opacity: 0,
  scale: 1,
  easing: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  mobile: true,
  reset: false,
  useDelay: 'always',
  viewFactor,
  viewOffset: { top: 0, right: 0, bottom: 0, left: 0 },
});
