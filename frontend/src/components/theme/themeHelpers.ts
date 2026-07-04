import { CustomTheme } from '../../types';

// Helper function to inject custom theme CSS variables into document root
export function injectThemeCSS(theme: CustomTheme) {
  const root = document.documentElement;
  
  // Set color CSS variables
  root.style.setProperty('--primary', theme.colors.primary);
  root.style.setProperty('--secondary', theme.colors.secondary);
  root.style.setProperty('--accent', theme.colors.accent);
  root.style.setProperty('--bg-app', theme.colors.background);
  root.style.setProperty('--sidebar-bg', theme.colors.sidebarBackground);
  root.style.setProperty('--navbar-bg', theme.colors.navbarBackground);
  root.style.setProperty('--bg-panel', theme.colors.cardBackground);
  root.style.setProperty('--btn-color', theme.colors.buttonColor);
  root.style.setProperty('--btn-hover-color', theme.colors.buttonHoverColor);
  root.style.setProperty('--text-primary', theme.colors.textColor);
  root.style.setProperty('--text-secondary', theme.colors.secondaryText);
  root.style.setProperty('--border-color', theme.colors.borderColor);
  root.style.setProperty('--success', theme.colors.success);
  root.style.setProperty('--warning', theme.colors.warning);
  root.style.setProperty('--error', theme.colors.error);
  root.style.setProperty('--info', theme.colors.info);
  root.style.setProperty('--link-color', theme.colors.linkColor);
  root.style.setProperty('--hover-color', theme.colors.hoverColor);
  root.style.setProperty('--selection-color', theme.colors.selectionColor);
  root.style.setProperty('--focus-ring', theme.colors.focusRing);
  root.style.setProperty('--badges-bg', theme.colors.badges);
  root.style.setProperty('--tags-color', theme.colors.tags);
  root.style.setProperty('--progress-bg', theme.colors.progressBars);

  // Layout parameters
  root.style.setProperty('--border-radius', `${theme.layout.borderRadius}px`);
  root.style.setProperty('--sidebar-width', theme.layout.sidebarWidth === 'compact' ? '72px' : theme.layout.sidebarWidth === 'wide' ? '280px' : '240px');

  // Animation durations
  const animSpeed = theme.layout.animationSpeed === 'none' ? '0s' : theme.layout.animationSpeed === 'fast' ? '150ms' : theme.layout.animationSpeed === 'smooth' ? '500ms' : '300ms';
  root.style.setProperty('--animation-duration', animSpeed);

  // Layout density
  root.style.setProperty('--density-padding', theme.layout.density === 'compact' ? '8px' : '16px');

  // Inject charts and pipeline colors
  if (theme.colors.charts && Array.isArray(theme.colors.charts)) {
    theme.colors.charts.forEach((color, i) => {
      root.style.setProperty(`--chart-${i + 1}`, color);
    });
  }
  if (theme.colors.pipelineColors && Array.isArray(theme.colors.pipelineColors)) {
    theme.colors.pipelineColors.forEach((color, i) => {
      root.style.setProperty(`--pipeline-${i + 1}`, color);
    });
  }

  // Fonts
  root.style.setProperty('--font-family', theme.typography.fontFamily || 'Inter, sans-serif');
}

// Contrast Accessibility Checking (WCAG 2.1 compliance check)
export function calculateContrast(hex1: string, hex2: string): number {
  const getRGB = (hex: string) => {
    let h = hex.replace('#', '');
    if (h.length === 3) {
      h = h.split('').map(x => x + x).join('');
    }
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return [r, g, b];
  };

  const getLuminance = (r: number, g: number, b: number) => {
    const a = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  };

  try {
    const rgb1 = getRGB(hex1);
    const rgb2 = getRGB(hex2);
    const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
    const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
    const bright = Math.max(l1, l2);
    const dark = Math.min(l1, l2);
    return (bright + 0.05) / (dark + 0.05);
  } catch (e) {
    return 4.5; // fallback neutral
  }
}

export function getContrastStatus(ratio: number) {
  if (ratio >= 7) return { label: 'AAA PASS', bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', desc: 'Enhanced contrast ratio (Excellent legibility)' };
  if (ratio >= 4.5) return { label: 'AA PASS', bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20', desc: 'Compliant contrast ratio (Standard legibility)' };
  return { label: 'LOW WARNING', bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20', desc: 'Contrast below 4.5:1 (Difficulty reading on small devices)' };
}
