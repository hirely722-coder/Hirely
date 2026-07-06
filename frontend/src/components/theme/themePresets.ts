import { CustomTheme } from '../../types';

export const THEME_PRESETS: CustomTheme[] = [
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    isPreset: true,
    colors: {
      primary: '#0284c7',
      secondary: '#0369a1',
      accent: '#bae6fd',
      background: '#f0f9ff',
      sidebarBackground: '#0c4a6e',
      navbarBackground: '#ffffff',
      cardBackground: '#ffffff',
      buttonColor: '#0284c7',
      buttonHoverColor: '#0369a1',
      textColor: '#0f172a',
      secondaryText: '#475569',
      borderColor: '#e2e8f0',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#06b6d4',
      linkColor: '#0284c7',
      hoverColor: '#0369a1',
      selectionColor: '#bae6fd',
      focusRing: '#38bdf8',
      charts: ['#0284c7', '#06b6d4', '#3b82f6', '#10b981'],
      badges: '#e0f2fe',
      tags: '#0284c7',
      pipelineColors: ['#0ea5e9', '#3b82f6', '#8b5cf6', '#10b981'],
      progressBars: '#0284c7'
    },
    typography: {
      fontFamily: 'Inter',
      fontSize: 'md',
      fontWeight: 'medium'
    },
    layout: {
      borderRadius: 12,
      density: 'comfortable',
      sidebarWidth: 'standard',
      sidebarStyle: 'dark',
      cardShadow: 'soft',
      animationSpeed: 'medium'
    },
    branding: {
      logoUrl: '',
      faviconUrl: ''
    }
  },
  {
    id: 'emerald-forest',
    name: 'Deep Emerald',
    isPreset: true,
    colors: {
      primary: '#059669',
      secondary: '#047857',
      accent: '#a7f3d0',
      background: '#f0fdf4',
      sidebarBackground: '#064e3b',
      navbarBackground: '#ffffff',
      cardBackground: '#ffffff',
      buttonColor: '#059669',
      buttonHoverColor: '#047857',
      textColor: '#064e3b',
      secondaryText: '#374151',
      borderColor: '#d1fae5',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#06b6d4',
      linkColor: '#059669',
      hoverColor: '#047857',
      selectionColor: '#a7f3d0',
      focusRing: '#34d399',
      charts: ['#059669', '#10b981', '#34d399', '#6ee7b7'],
      badges: '#d1fae5',
      tags: '#059669',
      pipelineColors: ['#10b981', '#059669', '#047857', '#064e3b'],
      progressBars: '#059669'
    },
    typography: {
      fontFamily: 'Inter',
      fontSize: 'md',
      fontWeight: 'medium'
    },
    layout: {
      borderRadius: 10,
      density: 'comfortable',
      sidebarWidth: 'standard',
      sidebarStyle: 'dark',
      cardShadow: 'soft',
      animationSpeed: 'medium'
    },
    branding: {
      logoUrl: '',
      faviconUrl: ''
    }
  },
  {
    id: 'royal-indigo',
    name: 'Royal Indigo',
    isPreset: true,
    colors: {
      primary: '#6d28d9',
      secondary: '#5b21b6',
      accent: '#ddd6fe',
      background: '#faf5ff',
      sidebarBackground: '#2e1065',
      navbarBackground: '#ffffff',
      cardBackground: '#ffffff',
      buttonColor: '#6d28d9',
      buttonHoverColor: '#5b21b6',
      textColor: '#2e1065',
      secondaryText: '#4b5563',
      borderColor: '#e9d5ff',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#06b6d4',
      linkColor: '#6d28d9',
      hoverColor: '#5b21b6',
      selectionColor: '#ddd6fe',
      focusRing: '#a78bfa',
      charts: ['#6d28d9', '#8b5cf6', '#a78bfa', '#c4b5fd'],
      badges: '#f3e8ff',
      tags: '#6d28d9',
      pipelineColors: ['#8b5cf6', '#7c3aed', '#6d28d9', '#4c1d95'],
      progressBars: '#6d28d9'
    },
    typography: {
      fontFamily: 'Poppins',
      fontSize: 'md',
      fontWeight: 'medium'
    },
    layout: {
      borderRadius: 14,
      density: 'comfortable',
      sidebarWidth: 'standard',
      sidebarStyle: 'dark',
      cardShadow: 'soft',
      animationSpeed: 'medium'
    },
    branding: {
      logoUrl: '',
      faviconUrl: ''
    }
  },
  {
    id: 'nord',
    name: 'Nord Arctic',
    isPreset: true,
    colors: {
      primary: '#88c0d0',
      secondary: '#81a1c1',
      accent: '#8fbcbb',
      background: '#2e3440',
      sidebarBackground: '#242933',
      navbarBackground: '#2e3440',
      cardBackground: '#3b4252',
      buttonColor: '#88c0d0',
      buttonHoverColor: '#81a1c1',
      textColor: '#eceff4',
      secondaryText: '#d8dee9',
      borderColor: '#434c5e',
      success: '#a3be8c',
      warning: '#ebcb8b',
      error: '#bf616a',
      info: '#88c0d0',
      linkColor: '#88c0d0',
      hoverColor: '#81a1c1',
      selectionColor: '#434c5e',
      focusRing: '#88c0d0',
      charts: ['#88c0d0', '#81a1c1', '#a3be8c', '#ebcb8b'],
      badges: '#434c5e',
      tags: '#88c0d0',
      pipelineColors: ['#81a1c1', '#88c0d0', '#8fbcbb', '#a3be8c'],
      progressBars: '#88c0d0'
    },
    typography: {
      fontFamily: 'JetBrains Mono',
      fontSize: 'sm',
      fontWeight: 'normal'
    },
    layout: {
      borderRadius: 6,
      density: 'compact',
      sidebarWidth: 'standard',
      sidebarStyle: 'dark',
      cardShadow: 'flat',
      animationSpeed: 'fast'
    },
    branding: {
      logoUrl: '',
      faviconUrl: ''
    }
  },
  {
    id: 'dracula',
    name: 'Dracula',
    isPreset: true,
    colors: {
      primary: '#bd93f9',
      secondary: '#ff79c6',
      accent: '#8be9fd',
      background: '#282a36',
      sidebarBackground: '#1e1f29',
      navbarBackground: '#282a36',
      cardBackground: '#44475a',
      buttonColor: '#bd93f9',
      buttonHoverColor: '#ff79c6',
      textColor: '#f8f8f2',
      secondaryText: '#6272a4',
      borderColor: '#44475a',
      success: '#50fa7b',
      warning: '#ffb86c',
      error: '#ff5555',
      info: '#8be9fd',
      linkColor: '#8be9fd',
      hoverColor: '#50fa7b',
      selectionColor: '#44475a',
      focusRing: '#bd93f9',
      charts: ['#bd93f9', '#ff79c6', '#8be9fd', '#50fa7b'],
      badges: '#6272a4',
      tags: '#bd93f9',
      pipelineColors: ['#bd93f9', '#ff79c6', '#8be9fd', '#50fa7b'],
      progressBars: '#bd93f9'
    },
    typography: {
      fontFamily: 'JetBrains Mono',
      fontSize: 'sm',
      fontWeight: 'normal'
    },
    layout: {
      borderRadius: 8,
      density: 'comfortable',
      sidebarWidth: 'standard',
      sidebarStyle: 'dark',
      cardShadow: 'none',
      animationSpeed: 'medium'
    },
    branding: {
      logoUrl: '',
      faviconUrl: ''
    }
  },
  {
    id: 'github-dark',
    name: 'GitHub Dark',
    isPreset: true,
    colors: {
      primary: '#2f81f7',
      secondary: '#216e39',
      accent: '#388bfd',
      background: '#0d1117',
      sidebarBackground: '#161b22',
      navbarBackground: '#0d1117',
      cardBackground: '#161b22',
      buttonColor: '#238636',
      buttonHoverColor: '#2ea44f',
      textColor: '#c9d1d9',
      secondaryText: '#8b949e',
      borderColor: '#30363d',
      success: '#3fb950',
      warning: '#d29922',
      error: '#f85149',
      info: '#58a6ff',
      linkColor: '#58a6ff',
      hoverColor: '#2f81f7',
      selectionColor: '#388bfd',
      focusRing: '#1f6feb',
      charts: ['#58a6ff', '#3fb950', '#d29922', '#f85149'],
      badges: '#21262d',
      tags: '#2f81f7',
      pipelineColors: ['#161b22', '#21262d', '#30363d', '#238636'],
      progressBars: '#238636'
    },
    typography: {
      fontFamily: 'Inter',
      fontSize: 'sm',
      fontWeight: 'normal'
    },
    layout: {
      borderRadius: 6,
      density: 'compact',
      sidebarWidth: 'standard',
      sidebarStyle: 'dark',
      cardShadow: 'none',
      animationSpeed: 'none'
    },
    branding: {
      logoUrl: '',
      faviconUrl: ''
    }
  },
  {
    id: 'slack',
    name: 'Slack Active',
    isPreset: true,
    colors: {
      primary: '#4a154b',
      secondary: '#36c5f0',
      accent: '#ecb22e',
      background: '#f8f8fa',
      sidebarBackground: '#4a154b',
      navbarBackground: '#ffffff',
      cardBackground: '#ffffff',
      buttonColor: '#36c5f0',
      buttonHoverColor: '#2eb67d',
      textColor: '#1d1c1d',
      secondaryText: '#616061',
      borderColor: '#e2e8f0',
      success: '#2eb67d',
      warning: '#ecb22e',
      error: '#e01e5a',
      info: '#36c5f0',
      linkColor: '#1264a3',
      hoverColor: '#1264a3',
      selectionColor: '#e01e5a30',
      focusRing: '#4a154b',
      charts: ['#36c5f0', '#2eb67d', '#ecb22e', '#e01e5a'],
      badges: '#f8f8fa',
      tags: '#4a154b',
      pipelineColors: ['#36c5f0', '#ecb22e', '#2eb67d', '#e01e5a'],
      progressBars: '#36c5f0'
    },
    typography: {
      fontFamily: 'Poppins',
      fontSize: 'md',
      fontWeight: 'medium'
    },
    layout: {
      borderRadius: 8,
      density: 'comfortable',
      sidebarWidth: 'standard',
      sidebarStyle: 'colored',
      cardShadow: 'soft',
      animationSpeed: 'medium'
    },
    branding: {
      logoUrl: '',
      faviconUrl: ''
    }
  },
  {
    id: 'notion-minimal',
    name: 'Notion Paper',
    isPreset: true,
    colors: {
      primary: '#37352f',
      secondary: '#5c5b57',
      accent: '#9f9f9c',
      background: '#fcfcfc',
      sidebarBackground: '#f1f1ef',
      navbarBackground: '#ffffff',
      cardBackground: '#ffffff',
      buttonColor: '#37352f',
      buttonHoverColor: '#4f4e4a',
      textColor: '#37352f',
      secondaryText: '#787774',
      borderColor: '#e3e2e0',
      success: '#0f7b56',
      warning: '#dfab01',
      error: '#d43d3d',
      info: '#0b6e99',
      linkColor: '#245a80',
      hoverColor: '#37352f',
      selectionColor: '#f1f1ef',
      focusRing: '#37352f',
      charts: ['#37352f', '#787774', '#e3e2e0', '#f1f1ef'],
      badges: '#f1f1ef',
      tags: '#37352f',
      pipelineColors: ['#f1f1ef', '#e3e2e0', '#c1c0bd', '#37352f'],
      progressBars: '#37352f'
    },
    typography: {
      fontFamily: 'Inter',
      fontSize: 'md',
      fontWeight: 'medium'
    },
    layout: {
      borderRadius: 4,
      density: 'comfortable',
      sidebarWidth: 'standard',
      sidebarStyle: 'light',
      cardShadow: 'none',
      animationSpeed: 'none'
    },
    branding: {
      logoUrl: '',
      faviconUrl: ''
    }
  }
];

export const DEFAULT_THEME: CustomTheme = {
  id: 'slate',
  name: 'Classic Slate',
  colors: {
    primary: '#2563eb',
    secondary: '#1d4ed8',
    accent: '#eff6ff',
    background: '#f8fafc',
    sidebarBackground: '#1e293b',
    navbarBackground: '#ffffff',
    cardBackground: '#ffffff',
    buttonColor: '#2563eb',
    buttonHoverColor: '#1d4ed8',
    textColor: '#0f172a',
    secondaryText: '#64748b',
    borderColor: 'rgba(226, 232, 240, 0.8)',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    linkColor: '#2563eb',
    hoverColor: '#1d4ed8',
    selectionColor: '#eff6ff',
    focusRing: '#3b82f6',
    charts: ['#2563eb', '#3b82f6', '#10b981', '#f59e0b'],
    badges: '#f1f5f9',
    tags: '#334155',
    pipelineColors: ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981'],
    progressBars: '#2563eb'
  },
  typography: {
    fontFamily: 'Inter',
    fontSize: 'md',
    fontWeight: 'medium'
  },
  layout: {
    borderRadius: 8,
    density: 'comfortable',
    sidebarWidth: 'standard',
    sidebarStyle: 'dark',
    cardShadow: 'soft',
    animationSpeed: 'medium'
  },
  branding: {
    logoUrl: '',
    faviconUrl: ''
  }
};
