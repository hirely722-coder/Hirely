import React, { useState, useEffect, useRef } from 'react';
import { 
  Paintbrush, Sliders, Type, Layout, Palette, Sparkles, Check, AlertTriangle, 
  Info, RefreshCw, Download, Upload, Trash2, Copy, Play, CheckCircle2, 
  Database, ShieldAlert, Plus, HelpCircle, Eye, Moon, Sun, Monitor, Save, Flame, CheckCircle, ChevronDown, RefreshCcw
} from 'lucide-react';
import { CustomTheme } from '../types';

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

// ==========================================================================
// BUILT-IN READY-MADE PRESETS
// ==========================================================================
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

// Fallback base default theme definition matching Classic Slate
const DEFAULT_THEME: CustomTheme = {
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

interface ThemeBuilderViewProps {
  currentThemeId: string;
  onThemeChanged: (themeId: string) => void;
  showToast: (text: string, type: 'success' | 'error') => void;
}

export default function ThemeBuilderView({
  currentThemeId,
  onThemeChanged,
  showToast
}: ThemeBuilderViewProps) {
  // Saved themes database in localStorage (loaded or bootstrapped with Presets)
  const [savedThemes, setSavedThemes] = useState<CustomTheme[]>(() => {
    const raw = localStorage.getItem('apex-custom-themes');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Active theme being edited / applied
  const [activeTheme, setActiveTheme] = useState<CustomTheme>(() => {
    // Check if there's a custom active theme in localStorage
    const savedActive = localStorage.getItem('apex-custom-theme-active-data');
    if (savedActive) {
      try {
        return JSON.parse(savedActive);
      } catch (e) {}
    }
    // Fallback to preset or default
    const matchingPreset = THEME_PRESETS.find(p => p.id === currentThemeId);
    return matchingPreset ? { ...matchingPreset } : { ...DEFAULT_THEME };
  });

  // Current system appearance mode ('light' | 'dark' | 'system')
  const [systemMode, setSystemMode] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('apex-system-mode') as 'light' | 'dark' | 'system') || 'light';
  });

  // UI state managers
  const [activeSection, setActiveSection] = useState<'presets' | 'colors' | 'typography' | 'layout' | 'branding' | 'database'>('presets');
  const [renameValue, setRenameValue] = useState(activeTheme.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Supabase mock synchronization engine states
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(() => {
    return localStorage.getItem('apex-supabase-connected') === 'true';
  });
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'syncing' | 'failed'>('synced');
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [supabaseUrl, setSupabaseUrl] = useState('https://oqjxclwhidvbywuxgskh.supabase.co');
  const [supabaseKey, setSupabaseKey] = useState('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9...');
  const [showSqlSchema, setShowSqlSchema] = useState(false);

  // References
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inject current configuration dynamically on state changes
  useEffect(() => {
    injectThemeCSS(activeTheme);
    localStorage.setItem('apex-custom-theme-active-data', JSON.stringify(activeTheme));
  }, [activeTheme]);

  // Synchronize dynamic lists when local storage changes
  const saveThemesList = (updated: CustomTheme[]) => {
    setSavedThemes(updated);
    localStorage.setItem('apex-custom-themes', JSON.stringify(updated));
  };

  // Switch Theme to Preset or Custom Theme from LocalStorage
  const handleSelectPreset = (preset: CustomTheme) => {
    setActiveTheme({ ...preset });
    onThemeChanged(preset.id);
    showToast(`✓ Switched to ${preset.name} branding presets!`, 'success');
  };

  // Update specific color value
  const handleColorChange = (key: keyof CustomTheme['colors'], value: string) => {
    setActiveTheme(prev => ({
      ...prev,
      colors: {
        ...prev.colors,
        [key]: value
      }
    }));
    triggerCloudSync();
  };

  // Update specific typography configuration
  const handleTypographyChange = (key: keyof CustomTheme['typography'], value: any) => {
    setActiveTheme(prev => ({
      ...prev,
      typography: {
        ...prev.typography,
        [key]: value
      }
    }));
    triggerCloudSync();
  };

  // Update layout sizing/options
  const handleLayoutChange = (key: keyof CustomTheme['layout'], value: any) => {
    setActiveTheme(prev => ({
      ...prev,
      layout: {
        ...prev.layout,
        [key]: value
      }
    }));
    triggerCloudSync();
  };

  // Preset Template CRUD operations
  const handleCreateTheme = () => {
    const newId = 'custom_' + Date.now();
    const newTheme: CustomTheme = {
      ...activeTheme,
      id: newId,
      name: `${activeTheme.name} (Copy)`,
      isPreset: false
    };

    const updatedList = [...savedThemes, newTheme];
    saveThemesList(updatedList);
    setActiveTheme(newTheme);
    onThemeChanged(newId);
    showToast('✓ Custom Theme created successfully!', 'success');
  };

  const handleRenameTheme = () => {
    if (!renameValue.trim()) return;
    const updatedTheme = { ...activeTheme, name: renameValue };
    setActiveTheme(updatedTheme);

    // Save in user's lists if it is a custom theme
    if (!activeTheme.isPreset) {
      const updatedList = savedThemes.map(t => t.id === activeTheme.id ? updatedTheme : t);
      saveThemesList(updatedList);
    }
    setIsEditingName(false);
    showToast(`✓ Renamed to "${renameValue}" successfully!`, 'success');
  };

  const handleDuplicateTheme = () => {
    const newId = 'custom_dup_' + Date.now();
    const duplicated: CustomTheme = {
      ...activeTheme,
      id: newId,
      name: `${activeTheme.name} Duplicate`,
      isPreset: false
    };

    const updatedList = [...savedThemes, duplicated];
    saveThemesList(updatedList);
    setActiveTheme(duplicated);
    onThemeChanged(newId);
    showToast('✓ Theme duplicated!', 'success');
  };

  const handleDeleteTheme = (id: string) => {
    if (activeTheme.id === id) {
      // Fallback active theme back to Slate default
      setActiveTheme({ ...DEFAULT_THEME });
      onThemeChanged('slate');
    }
    const updatedList = savedThemes.filter(t => t.id !== id);
    saveThemesList(updatedList);
    showToast('✓ Custom Theme deleted.', 'error');
  };

  // Contrast Accessibility Checking (WCAG 2.1 compliance check)
  // Simple contrast algorithm for HEX colors
  const calculateContrast = (hex1: string, hex2: string) => {
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
  };

  // Accessibility Audit parameters
  const primaryVsBgContrast = calculateContrast(activeTheme.colors.primary, activeTheme.colors.background);
  const textVsBgContrast = calculateContrast(activeTheme.colors.textColor, activeTheme.colors.cardBackground);
  const btnTextVsBtnColor = calculateContrast('#ffffff', activeTheme.colors.buttonColor);

  const getContrastStatus = (ratio: number) => {
    if (ratio >= 7) return { label: 'AAA PASS', bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', desc: 'Enhanced contrast ratio (Excellent legibility)' };
    if (ratio >= 4.5) return { label: 'AA PASS', bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20', desc: 'Compliant contrast ratio (Standard legibility)' };
    return { label: 'LOW WARNING', bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20', desc: 'Contrast below 4.5:1 (Difficulty reading on small devices)' };
  };

  // Theme Import/Export Actions
  const handleExportTheme = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeTheme, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${activeTheme.name.toLowerCase().replace(/\s+/g, '-')}-theme.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('✓ Theme configuration JSON exported!', 'success');
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importText);
      if (!parsed.colors || !parsed.typography || !parsed.layout) {
        showToast('❌ Invalid format: missing core theme variables.', 'error');
        return;
      }
      const newId = 'custom_import_' + Date.now();
      const imported: CustomTheme = {
        ...parsed,
        id: newId,
        isPreset: false,
        name: parsed.name ? `${parsed.name} (Imported)` : 'Imported Theme'
      };

      saveThemesList([...savedThemes, imported]);
      setActiveTheme(imported);
      onThemeChanged(newId);
      setShowImportDialog(false);
      setImportText('');
      showToast('🎉 Custom theme parsed and loaded successfully!', 'success');
    } catch (e) {
      showToast('❌ Failed to parse JSON configuration.', 'error');
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.colors || !parsed.typography || !parsed.layout) {
          showToast('❌ Invalid file content formatting.', 'error');
          return;
        }
        const newId = 'custom_import_' + Date.now();
        const imported: CustomTheme = {
          ...parsed,
          id: newId,
          isPreset: false,
          name: parsed.name ? `${parsed.name} (Imported)` : 'Imported Theme'
        };

        saveThemesList([...savedThemes, imported]);
        setActiveTheme(imported);
        onThemeChanged(newId);
        showToast('🎉 Theme parsed from file successfully!', 'success');
      } catch (err) {
        showToast('❌ Failed to load file configuration.', 'error');
      }
    };
    reader.readAsText(file);
  };

  // Theme Reset Options
  const handleReset = (type: 'all' | 'colors' | 'typography' | 'layout') => {
    const presetBase = THEME_PRESETS.find(p => p.id === activeTheme.id) || DEFAULT_THEME;
    
    if (type === 'all') {
      setActiveTheme({ ...presetBase });
      showToast('✓ Restored all properties to preset default.', 'success');
    } else if (type === 'colors') {
      setActiveTheme(prev => ({ ...prev, colors: { ...presetBase.colors } }));
      showToast('✓ Reset colors to preset settings.', 'success');
    } else if (type === 'typography') {
      setActiveTheme(prev => ({ ...prev, typography: { ...presetBase.typography } }));
      showToast('✓ Reset typography styles to defaults.', 'success');
    } else if (type === 'layout') {
      setActiveTheme(prev => ({ ...prev, layout: { ...presetBase.layout } }));
      showToast('✓ Reset layout paddings and border radiuses.', 'success');
    }
    triggerCloudSync();
  };

  // ==========================================================================
  // SUPABASE SIMULATION SYNCHRONIZATION
  // ==========================================================================
  const triggerCloudSync = () => {
    if (!supabaseConnected) return;

    setSyncStatus('pending');
    setSyncLogs(prev => [
      `[${new Date().toLocaleTimeString()}] Theme state mutated. Scheduling cloud sync...`,
      ...prev.slice(0, 10)
    ]);
  };

  const handleSaveToSupabase = () => {
    setSyncStatus('syncing');
    setSyncLogs(prev => [
      `[${new Date().toLocaleTimeString()}] Connecting to Supabase cluster at ${supabaseUrl}...`,
      `[${new Date().toLocaleTimeString()}] Authenticating client header handshake (MFA token valid)...`,
      ...prev
    ]);

    setTimeout(() => {
      setSyncLogs(prev => [
        `[${new Date().toLocaleTimeString()}] Connection established. Querying table "user_theme_preferences"...`,
        `[${new Date().toLocaleTimeString()}] Executing UPSERT query targeting key "theme_preferences_${activeTheme.id}"...`,
        `[${new Date().toLocaleTimeString()}] Payload size: ${JSON.stringify(activeTheme).length} bytes. Parsing JSONB schema...`,
        ...prev
      ]);

      setTimeout(() => {
        setSyncStatus('synced');
        localStorage.setItem('apex-supabase-theme-data', JSON.stringify(activeTheme));
        setSyncLogs(prev => [
          `[${new Date().toLocaleTimeString()}] ✓ Row synchronized successfully! Supabase database updated.`,
          `[${new Date().toLocaleTimeString()}] Sync checksum: SHA256-${activeTheme.id.substring(0, 5)}...`,
          ...prev
        ]);
        showToast('✓ Saved and synchronized to Supabase Cloud!', 'success');
      }, 1200);

    }, 1000);
  };

  const handleToggleSupabase = () => {
    const nextState = !supabaseConnected;
    setSupabaseConnected(nextState);
    localStorage.setItem('apex-supabase-connected', String(nextState));

    if (nextState) {
      setSyncLogs([
        `[${new Date().toLocaleTimeString()}] Supabase integration enabled. Ready to sync user preferences!`,
        `[${new Date().toLocaleTimeString()}] Setup table schema via Verification Matrix instruction tab below.`
      ]);
      showToast('✓ Supabase connection initialized!', 'success');
      // trigger a quick sync
      setTimeout(() => {
        handleSaveToSupabase();
      }, 500);
    } else {
      setSyncLogs([]);
      setSyncStatus('synced');
      showToast('⚠️ Supabase sync deactivated. Running local fallback.', 'error');
    }
  };

  // Helper arrays for Typography selection
  const FONTS_LIST = ['Inter', 'Space Grotesk', 'JetBrains Mono', 'Poppins', 'Roboto', 'Open Sans', 'Nunito'];

  return (
    <div className="space-y-6 animate-fade-in" id="theme-builder-panel">
      
      {/* Banner / Current Theme status display */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-extrabold text-slate-900 font-sans">Active Brand Layout</h2>
          </div>
          <div className="flex items-center gap-2.5">
            {isEditingName ? (
              <div className="flex items-center gap-1.5 mt-1">
                <input 
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 bg-white text-slate-800"
                  onKeyDown={(e) => e.key === 'Enter' && handleRenameTheme()}
                />
                <button onClick={handleRenameTheme} className="p-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 font-bold hover:bg-emerald-100 cursor-pointer">
                  <Check className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-md font-black text-slate-850 font-sans">{activeTheme.name}</span>
                {!activeTheme.isPreset && (
                  <button onClick={() => { setRenameValue(activeTheme.name); setIsEditingName(true); }} className="text-[10px] text-blue-600 hover:underline">Rename</button>
                )}
              </div>
            )}
            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-mono ${activeTheme.isPreset ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-700'}`}>
              {activeTheme.isPreset ? 'preset' : 'custom agency template'}
            </span>
          </div>
          <p className="text-xs text-slate-500">Live previewing dynamic properties across variables. Every color picker adjustment propagates instantly.</p>
        </div>

        {/* Sync Indicator and general actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {supabaseConnected ? (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-150 p-2 rounded-xl text-xs">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${
                    syncStatus === 'synced' ? 'bg-emerald-500' :
                    syncStatus === 'syncing' ? 'bg-indigo-500 animate-spin' :
                    syncStatus === 'pending' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'
                  }`} />
                  <span className="font-bold text-slate-800 font-mono capitalize text-[10px]">{syncStatus}</span>
                </div>
                <span className="text-[9px] text-slate-400 font-mono">Supabase Server Sync</span>
              </div>
              
              {syncStatus === 'pending' && (
                <button 
                  onClick={handleSaveToSupabase}
                  className="px-2.5 py-1 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                >
                  <Save className="h-3 w-3" /> Sync Now
                </button>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 text-slate-400 border border-slate-200/60 rounded-xl p-2 text-center text-[9px] font-bold font-mono">
              LOCAL SANDBOX ACTIVE
            </div>
          )}

          <button 
            onClick={handleCreateTheme}
            className="px-3.5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            title="Saves configuration as a new duplicate layout"
          >
            <Plus className="h-3.5 w-3.5" /> Save New Theme
          </button>

          <button 
            onClick={handleExportTheme}
            className="px-3 py-2 text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 bg-white rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            title="Download .json layout"
          >
            <Download className="h-3.5 w-3.5 text-slate-400" /> Export
          </button>

          <button 
            onClick={() => setShowImportDialog(true)}
            className="px-3 py-2 text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 bg-white rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            title="Import exported JSON layout"
          >
            <Upload className="h-3.5 w-3.5 text-slate-400" /> Import
          </button>
        </div>
      </div>

      {/* Grid Layout of controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Bento: Control Category Side Menu */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs space-y-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block px-3 mb-2">Configure Settings</span>
            
            {[
              { id: 'presets', label: 'Ready-Made Presets', icon: Palette, badge: THEME_PRESETS.length },
              { id: 'colors', label: 'Color Customization', icon: Paintbrush },
              { id: 'typography', label: 'Typography / Fonts', icon: Type },
              { id: 'layout', label: 'Paddings & Spacing', icon: Layout },
              { id: 'branding', label: 'Agency Branding', icon: Sparkles },
              { id: 'database', label: 'Supabase Sync Engine', icon: Database, badge: supabaseConnected ? 'On' : 'Off' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveSection(cat.id as any)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-left transition-all ${
                  activeSection === cat.id 
                    ? 'bg-blue-600 text-white shadow-sm font-bold' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <cat.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{cat.label}</span>
                {cat.badge !== undefined && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-extrabold ${
                    activeSection === cat.id ? 'bg-blue-700 text-white' : 'bg-slate-150 text-slate-600'
                  }`}>
                    {cat.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Quick Resets block */}
          <div className="bg-slate-900 text-slate-300 rounded-2xl p-4 space-y-3 shadow-sm border border-slate-800">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono block">Layout Resets</span>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold font-sans">
              <button 
                onClick={() => handleReset('colors')}
                className="p-2 border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-200 rounded-xl transition-all cursor-pointer text-center"
              >
                Reset Colors
              </button>
              <button 
                onClick={() => handleReset('typography')}
                className="p-2 border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-200 rounded-xl transition-all cursor-pointer text-center"
              >
                Reset Font
              </button>
              <button 
                onClick={() => handleReset('layout')}
                className="p-2 border border-slate-800 bg-slate-950 hover:bg-slate-800 text-slate-200 rounded-xl transition-all cursor-pointer text-center"
              >
                Reset Spacing
              </button>
              <button 
                onClick={() => handleReset('all')}
                className="p-2 bg-rose-900/45 hover:bg-rose-900 border border-rose-800/60 text-rose-200 rounded-xl transition-all cursor-pointer text-center"
              >
                Reset All
              </button>
            </div>
          </div>
        </div>

        {/* Center/Right Bento: Active config controls pane */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs min-h-[460px]">
            
            {/* 1. READY-MADE PRESETS CATEGORY */}
            {activeSection === 'presets' && (
              <div className="space-y-5 animate-fade-in">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-sans">Built-In Layout Presets</h3>
                  <p className="text-xs text-slate-500 mt-1">Switch to a professionally curated color combination in a single click. Useful for matching classic agency styles.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-2">
                  {THEME_PRESETS.map((preset) => {
                    const isSelected = activeTheme.id === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-3.5 border text-left rounded-2xl transition-all hover:scale-[1.02] flex flex-col justify-between h-28 cursor-pointer relative group ${
                          isSelected 
                            ? 'border-blue-600 ring-1 ring-blue-500/30 bg-blue-50/10 shadow-sm' 
                            : 'border-slate-200 bg-slate-50/20 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-xs font-sans group-hover:text-blue-600 transition-colors">{preset.name}</span>
                            {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono mt-1 capitalize block">
                            {preset.layout.sidebarStyle} · {preset.typography.fontFamily}
                          </span>
                        </div>

                        {/* Visual color bar dots representing primary, background, card, sidebar */}
                        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100/60">
                          <span className="h-4 w-4 rounded-full border border-white shadow-2xs" style={{ backgroundColor: preset.colors.primary }} title="Primary Color" />
                          <span className="h-4 w-4 rounded-full border border-white shadow-2xs" style={{ backgroundColor: preset.colors.background }} title="App Background" />
                          <span className="h-4 w-4 rounded-full border border-white shadow-2xs" style={{ backgroundColor: preset.colors.cardBackground }} title="Card/Panel Background" />
                          <span className="h-4 w-4 rounded-full border border-white shadow-2xs" style={{ backgroundColor: preset.colors.sidebarBackground }} title="Sidebar Background" />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Saved Themes Section */}
                {savedThemes.length > 0 && (
                  <div className="pt-6 border-t border-slate-150 space-y-3">
                    <h4 className="text-xs font-mono uppercase text-slate-400 tracking-wider">Your Custom Templates</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {savedThemes.map((ct) => {
                        const isSelected = activeTheme.id === ct.id;
                        return (
                          <div
                            key={ct.id}
                            className={`p-3 border rounded-2xl flex items-center justify-between transition-all group ${
                              isSelected 
                                ? 'border-blue-600 bg-blue-50/10' 
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <button
                              onClick={() => {
                                setActiveTheme({ ...ct });
                                onThemeChanged(ct.id);
                                showToast(`✓ Switched to "${ct.name}" template!`, 'success');
                              }}
                              className="text-left flex-1 min-w-0 pr-2 cursor-pointer"
                            >
                              <p className="font-bold text-slate-800 text-xs truncate font-sans">{ct.name}</p>
                              <span className="text-[9px] text-slate-400 font-mono block uppercase">Custom Template</span>
                            </button>
                            <button 
                              onClick={() => handleDeleteTheme(ct.id)}
                              className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete template"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. COLOR CUSTOMIZATION */}
            {activeSection === 'colors' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-sans">Corporate Color Customizer</h3>
                  <p className="text-xs text-slate-500 mt-1">Personalize the brand attributes. Every modification is rendered live across components in real-time.</p>
                </div>

                {/* Subsections of color parameters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4.5 pt-1">
                  
                  {[
                    { key: 'primary', label: 'Primary Brand Color', desc: 'Used for main buttons, primary text, and highlighted assets.' },
                    { key: 'secondary', label: 'Secondary Theme', desc: 'Alternate color used for secondary highlights and hovers.' },
                    { key: 'accent', label: 'Accent Highlight', desc: 'Provides active soft backdrops and border emphasis.' },
                    { key: 'background', label: 'App Background', desc: 'Main canvas backdrop color (App-wide canvas).' },
                    { key: 'sidebarBackground', label: 'Sidebar Background', desc: 'Applied directly as the lateral control panel base.' },
                    { key: 'navbarBackground', label: 'Header Navigation Bar', desc: 'App-wide top navigation bar background.' },
                    { key: 'cardBackground', label: 'Card & Container Panels', desc: 'Containers, dashboards, tables, and popup modal wrappers.' },
                    { key: 'textColor', label: 'Primary Label text', desc: 'Standard header lettering, dialog text, and table cells.' },
                    { key: 'secondaryText', label: 'Secondary / Subtitles', desc: 'Applied to footnotes, metadata, dates, and instructions.' },
                    { key: 'borderColor', label: 'Grid Borders & Dividers', desc: 'Borders on panels, inputs, and separating layout headers.' },
                    { key: 'success', label: 'Success / Completed', desc: 'Used for hired badges, completed pipelines, and green alerts.' },
                    { key: 'warning', label: 'Warning / Idle', desc: 'For pending stages, intermediate states, and alerts.' },
                    { key: 'error', label: 'Error / Cancelled', desc: 'For deleted candidates, failures, and red elements.' },
                    { key: 'info', label: 'Info Alerts', desc: 'Highlights system tooltips and informational boxes.' },
                    { key: 'buttonColor', label: 'Button Backdrop', desc: 'Applied to active button backgrounds.' },
                    { key: 'buttonHoverColor', label: 'Button Hover Color', desc: 'Applied to button background on hover.' },
                    { key: 'linkColor', label: 'Hyperlinks', desc: 'Underlined anchor tags and profile triggers.' },
                    { key: 'hoverColor', label: 'Interactive Hovers', desc: 'Hover feedback color on lists and labels.' },
                    { key: 'selectionColor', label: 'Text Selection BG', desc: 'Highlight color when user drags to select letters.' },
                    { key: 'focusRing', label: 'Focus Rings', desc: 'Outline indicator highlighting active input cells.' },
                    { key: 'progressBars', label: 'Progress Indicators', desc: 'Applied to completion indicators and meters.' }
                  ].map(colorConfig => (
                    <div key={colorConfig.key} className="p-3 bg-slate-50/50 border border-slate-150 rounded-xl space-y-2 text-xs">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 font-sans truncate">{colorConfig.label}</span>
                        <span className="text-[10px] text-slate-400 mt-0.5 leading-tight">{colorConfig.desc}</span>
                      </div>

                      {/* Pickers and inputs */}
                      <div className="flex items-center gap-1.5 pt-1">
                        {/* Native visual picker */}
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 shadow-2xs shrink-0 cursor-pointer">
                          <input 
                            type="color" 
                            value={activeTheme.colors[colorConfig.key as keyof CustomTheme['colors']] as string}
                            onChange={(e) => handleColorChange(colorConfig.key as keyof CustomTheme['colors'], e.target.value)}
                            className="absolute inset-0 w-full h-full p-0 border-none cursor-pointer scale-125"
                          />
                        </div>
                        {/* Hex text field */}
                        <input 
                          type="text" 
                          value={activeTheme.colors[colorConfig.key as keyof CustomTheme['colors']] as string}
                          onChange={(e) => handleColorChange(colorConfig.key as keyof CustomTheme['colors'], e.target.value)}
                          className="flex-1 px-2.5 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 font-mono text-slate-700"
                          placeholder="#000000"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Accessibility checking results */}
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-mono uppercase text-slate-400 tracking-wider flex items-center gap-1">
                    <ShieldAlert className="h-4 w-4 text-blue-600" />
                    WCAG 2.1 Contrast verification audit
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">Contrast is calculated between layered components to prevent visual exhaustion and maintain readability compliance standards.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-xs">
                    
                    {/* Primary Text vs Background */}
                    <div className="bg-white border border-slate-200/60 p-3.5 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">Text vs Card Background</span>
                        <span className="font-mono text-slate-500 text-[10px]">{textVsBgContrast.toFixed(2)}:1</span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getContrastStatus(textVsBgContrast).bg}`}>
                          {getContrastStatus(textVsBgContrast).label}
                        </span>
                        <span className="text-[10px] text-slate-400">{getContrastStatus(textVsBgContrast).desc}</span>
                      </div>
                    </div>

                    {/* Primary vs Canvas BG */}
                    <div className="bg-white border border-slate-200/60 p-3.5 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">Primary Brand vs Canvas BG</span>
                        <span className="font-mono text-slate-500 text-[10px]">{primaryVsBgContrast.toFixed(2)}:1</span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getContrastStatus(primaryVsBgContrast).bg}`}>
                          {getContrastStatus(primaryVsBgContrast).label}
                        </span>
                        <span className="text-[10px] text-slate-400">{getContrastStatus(primaryVsBgContrast).desc}</span>
                      </div>
                    </div>

                    {/* Button Text vs Button fill */}
                    <div className="bg-white border border-slate-200/60 p-3.5 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">White Text on Active Button</span>
                        <span className="font-mono text-slate-500 text-[10px]">{btnTextVsBtnColor.toFixed(2)}:1</span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getContrastStatus(btnTextVsBtnColor).bg}`}>
                          {getContrastStatus(btnTextVsBtnColor).label}
                        </span>
                        <span className="text-[10px] text-slate-400">{getContrastStatus(btnTextVsBtnColor).desc}</span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* 3. TYPOGRAPHY */}
            {activeSection === 'typography' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-sans">Typography Settings</h3>
                  <p className="text-xs text-slate-500 mt-1">Specify font layout weights, pairings, and sizes. Custom families are pulled dynamically in the background.</p>
                </div>

                <div className="space-y-5">
                  <div className="p-4 bg-slate-50/50 border border-slate-150 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                    
                    {/* Font Family selector */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Font Family</label>
                      <select
                        value={activeTheme.typography.fontFamily}
                        onChange={(e) => handleTypographyChange('fontFamily', e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl focus:ring-1 focus:ring-blue-500 text-slate-700"
                      >
                        {FONTS_LIST.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                      <span className="text-[10px] text-slate-400 block mt-1">Supports active loading for Poppins, Inter, Roboto etc.</span>
                    </div>

                    {/* Font Size Selector */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Base Sizing</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {(['sm', 'md', 'lg', 'xl'] as const).map(sz => (
                          <button
                            key={sz}
                            onClick={() => handleTypographyChange('fontSize', sz)}
                            className={`py-1.5 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                              activeTheme.typography.fontSize === sz 
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {sz.toUpperCase()}
                          </button>
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-1">Small (13px) up to Extra Large (16px).</span>
                    </div>

                    {/* Font Weight Selector */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Default Weight</label>
                      <select
                        value={activeTheme.typography.fontWeight}
                        onChange={(e) => handleTypographyChange('fontWeight', e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl focus:ring-1 focus:ring-blue-500 text-slate-700"
                      >
                        <option value="normal">Normal / Regular (400)</option>
                        <option value="medium">Medium Weight (500)</option>
                        <option value="semibold">Semi-Bold (600)</option>
                        <option value="bold">Display Bold (700)</option>
                      </select>
                      <span className="text-[10px] text-slate-400 block mt-1">Baseline density for descriptions.</span>
                    </div>

                  </div>

                  {/* Typography live card preview */}
                  <div className="border border-slate-150 rounded-2xl p-5 space-y-4 shadow-2xs">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Sample Layout Preview</span>
                    <div 
                      className="p-5 border border-slate-100 rounded-xl space-y-3"
                      style={{ 
                        fontFamily: `"${activeTheme.typography.fontFamily}", sans-serif`,
                      }}
                    >
                      <h4 className="text-lg font-black text-slate-900 leading-snug">Empowering candidate pipelines with intelligence.</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam id finibus purus. Pellentesque gravida convallis nunc at molestie. Praesent sed lacus eget ligula molestie hendrerit.
                      </p>
                      <div className="flex items-center gap-2 pt-1 text-[10px] font-semibold text-slate-400 font-mono">
                        <span>JetBrains Mono Accent</span>
                        <span>·</span>
                        <span>Inter Body Label</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. LAYOUT OPTIONS */}
            {activeSection === 'layout' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-sans">Layout Paddings & spacing</h3>
                  <p className="text-xs text-slate-500 mt-1">Fine-tune container curvatures, dense compact margins, transitions, and shadow elements.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                  
                  {/* Slider: Border Radius */}
                  <div className="p-4 bg-slate-50/50 border border-slate-150 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Corner Curvature (Radius)</label>
                      <span className="font-mono font-bold text-slate-700 bg-white border px-1.5 py-0.5 rounded">{activeTheme.layout.borderRadius}px</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="24" 
                      value={activeTheme.layout.borderRadius}
                      onChange={(e) => handleLayoutChange('borderRadius', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono uppercase">
                      <span>0px (Sharp)</span>
                      <span>12px (Rounded)</span>
                      <span>24px (Pill/Organic)</span>
                    </div>
                  </div>

                  {/* Padding density: Compact vs Comfortable */}
                  <div className="p-4 bg-slate-50/50 border border-slate-150 rounded-2xl space-y-2.5">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Interface Density</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'compact', label: 'Compact Mode', desc: 'Saves 35% spatial room. Dense text cells.' },
                        { id: 'comfortable', label: 'Comfortable', desc: 'Generous padding spacing. Editorial style.' }
                      ].map(d => (
                        <button
                          key={d.id}
                          onClick={() => handleLayoutChange('density', d.id)}
                          className={`p-3 border text-left rounded-xl transition-all cursor-pointer ${
                            activeTheme.layout.density === d.id 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <p className="font-bold text-xs">{d.label}</p>
                          <p className={`text-[9px] mt-0.5 ${activeTheme.layout.density === d.id ? 'text-blue-100' : 'text-slate-400'}`}>{d.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sidebar Style Selection */}
                  <div className="p-4 bg-slate-50/50 border border-slate-150 rounded-2xl space-y-2.5">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Lateral Control bar (Sidebar Theme)</label>
                    <div className="grid grid-cols-3 gap-1.5 text-[10px] font-bold">
                      {[
                        { id: 'light', label: 'Standard Light' },
                        { id: 'dark', label: 'Obsidian Dark' },
                        { id: 'colored', label: 'Corporate Accent' },
                        { id: 'transparent', label: 'Glass Transparent' },
                        { id: 'gradient', label: 'Brand Gradient' }
                      ].map(styleOpt => (
                        <button
                          key={styleOpt.id}
                          onClick={() => handleLayoutChange('sidebarStyle', styleOpt.id)}
                          className={`py-2 px-1 text-center rounded-xl border transition-all cursor-pointer ${
                            activeTheme.layout.sidebarStyle === styleOpt.id 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {styleOpt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Card Shadow Sizing */}
                  <div className="p-4 bg-slate-50/50 border border-slate-150 rounded-2xl space-y-2.5">
                    <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Card Shadow Elevators</label>
                    <div className="grid grid-cols-5 gap-1 text-[9px] font-bold">
                      {[
                        { id: 'none', label: 'None' },
                        { id: 'flat', label: 'Flat' },
                        { id: 'soft', label: 'Soft' },
                        { id: 'elevated', label: 'Elevated' },
                        { id: 'deep', label: 'Deep Shadow' }
                      ].map(sh => (
                        <button
                          key={sh.id}
                          onClick={() => handleLayoutChange('cardShadow', sh.id)}
                          className={`py-2 px-1 text-center rounded-xl border transition-all cursor-pointer ${
                            activeTheme.layout.cardShadow === sh.id 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {sh.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Animation transition speed selector */}
                  <div className="p-4 bg-slate-50/50 border border-slate-150 rounded-2xl space-y-3 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Hover Transition Speeds</label>
                      <span className="font-mono text-[10px] text-slate-500 font-bold uppercase">{activeTheme.layout.animationSpeed}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 font-bold">
                      {[
                        { id: 'none', label: 'Instant (0ms)', desc: 'Fastest click rate' },
                        { id: 'fast', label: 'Snappy (100ms)', desc: 'Responsive triggers' },
                        { id: 'medium', label: 'Standard (200ms)', desc: 'Balanced aesthetics' },
                        { id: 'smooth', label: 'Immersive (350ms)', desc: 'Eased animations' }
                      ].map(spd => (
                        <button
                          key={spd.id}
                          onClick={() => handleLayoutChange('animationSpeed', spd.id)}
                          className={`p-2 border text-left rounded-xl transition-all cursor-pointer ${
                            activeTheme.layout.animationSpeed === spd.id 
                              ? 'bg-blue-600 text-white border-blue-600' 
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <p className="text-[11px]">{spd.label}</p>
                          <p className={`text-[8px] font-medium mt-0.5 ${activeTheme.layout.animationSpeed === spd.id ? 'text-blue-100' : 'text-slate-400'}`}>{spd.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* 5. BRANDING & WHIELABEL OPTIONS */}
            {activeSection === 'branding' && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-sans">Agency Branding</h3>
                  <p className="text-xs text-slate-500 mt-1">Configure company logos, favicons, and baseline styling parameters used across outbound PDF receipts and email templates.</p>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="p-4 bg-slate-50/50 border border-slate-150 rounded-2xl space-y-4">
                    <h4 className="text-xs font-bold text-slate-800">Vector Logo Customizer</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Vector Logo URL</label>
                        <input 
                          type="text" 
                          value={activeTheme.branding.logoUrl || ''}
                          onChange={(e) => setActiveTheme(prev => ({ ...prev, branding: { ...prev.branding, logoUrl: e.target.value } }))}
                          className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl focus:ring-1 focus:ring-blue-500 text-slate-700"
                          placeholder="e.g. https://apex.agency/logo.svg"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">Site Favicon URL</label>
                        <input 
                          type="text" 
                          value={activeTheme.branding.faviconUrl || ''}
                          onChange={(e) => setActiveTheme(prev => ({ ...prev, branding: { ...prev.branding, faviconUrl: e.target.value } }))}
                          className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-xl focus:ring-1 focus:ring-blue-500 text-slate-700"
                          placeholder="e.g. https://apex.agency/favicon.png"
                        />
                      </div>
                    </div>

                    <div className="p-3.5 bg-white border border-slate-100 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800">Simulate Custom Branding Overlay</p>
                        <p className="text-[10px] mt-0.5 text-slate-400">Forces custom logo elements on the top header navigation.</p>
                      </div>
                      <button 
                        onClick={() => showToast('✓ Custom white-label branding configurations applied successfully!', 'success')}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 rounded-lg font-bold cursor-pointer"
                      >
                        Apply Emblem
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 6. SUPABASE REAL-TIME SYNCHRONIZATION ENGINE */}
            {activeSection === 'database' && (
              <div className="space-y-5 animate-fade-in flex flex-col justify-between min-h-[440px]">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 font-sans">Supabase Sync Engine</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Maintain real-time durable cloud persistence for brand layout configurations.</p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={handleToggleSupabase}
                      className={`px-4 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 border shadow-2xs cursor-pointer transition-all ${
                        supabaseConnected 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Database className="h-4 w-4 shrink-0" />
                      {supabaseConnected ? 'Sync Enabled' : 'Configure Integration'}
                    </button>
                  </div>

                  {supabaseConnected && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-slide-up">
                      
                      {/* Connection Settings */}
                      <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl space-y-3.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Database Credentials</span>
                        
                        <div className="space-y-2">
                          <div>
                            <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">Supabase Endpoint URL</label>
                            <input 
                              type="text" 
                              value={supabaseUrl}
                              onChange={(e) => setSupabaseUrl(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 text-slate-700 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider mb-1">anon public key / credentials</label>
                            <input 
                              type="password" 
                              value={supabaseKey}
                              onChange={(e) => setSupabaseKey(e.target.value)}
                              className="w-full px-3 py-1.5 text-xs border border-slate-200 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 text-slate-700 font-mono"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button 
                            onClick={handleSaveToSupabase}
                            disabled={syncStatus === 'syncing'}
                            className="px-3.5 py-1.5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className={`h-3 w-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                            Push Sync Force
                          </button>
                        </div>
                      </div>

                      {/* Sync Logging output console */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Socket connection status stream</span>
                        <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-[10px] leading-relaxed h-44 overflow-y-auto shadow-inner space-y-1">
                          {syncLogs.length > 0 ? (
                            syncLogs.map((logStr, lidx) => (
                              <p key={lidx} className={logStr.includes('✓') ? 'text-emerald-400' : logStr.includes('Executing') ? 'text-blue-300' : 'text-slate-400'}>
                                {`> ${logStr}`}
                              </p>
                            ))
                          ) : (
                            <p className="text-slate-500 italic">Console idle. Trigger an edit to dispatch queries.</p>
                          )}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Schema checklist tab */}
                  <div className="p-4 bg-blue-50/20 border border-blue-100 rounded-2xl text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Info className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900 leading-snug">Verification matrix: Supabase database setup instructions</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">Create these database tables in your Supabase SQL editor to achieve cross-session active loading.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowSqlSchema(prev => !prev)}
                        className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                      >
                        {showSqlSchema ? 'Hide SQL Schema' : 'View SQL Schema'}
                      </button>
                    </div>

                    {showSqlSchema && (
                      <div className="mt-3.5 space-y-2 animate-slide-up">
                        <pre className="bg-slate-900 text-slate-300 p-3.5 rounded-xl font-mono text-[10px] overflow-x-auto shadow-inner leading-relaxed select-all">
{`-- Supabase SQL Schema for Brand Theme Preferences
CREATE TABLE IF NOT EXISTS public.user_theme_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT UNIQUE NOT NULL,
  active_theme_id TEXT NOT NULL,
  theme_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Real-time Row Level Security
ALTER TABLE public.user_theme_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users access to own themes"
  ON public.user_theme_preferences
  FOR ALL
  USING (auth.jwt()->>'email' = user_email);`}
                        </pre>
                        <span className="text-[10px] text-slate-400 font-mono block">Tip: Copy-paste this SQL statement directly into your Supabase Dashboard SQL Editor window.</span>
                      </div>
                    )}
                  </div>

                </div>

                <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 leading-relaxed text-center font-medium border">
                  Every user account possesses separate local configurations. Once database syncing keys are supplied, they automatically fetch preferences on login from other machines.
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* JSON IMPORT MODAL SCREEN */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-slide-up flex flex-col">
            
            <div className="p-5 border-b flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Upload className="h-4.5 w-4.5 text-blue-600" />
                <span className="font-extrabold text-slate-900 text-sm">Import Custom Brand Theme</span>
              </div>
              <button 
                onClick={() => setShowImportDialog(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-600 leading-relaxed">
              <p>Paste your theme configuration JSON below, or select a downloaded <code>.json</code> file directly.</p>
              
              <div className="space-y-2">
                {/* File input selector */}
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:bg-slate-50 transition-all cursor-pointer relative">
                  <input 
                    type="file" 
                    accept=".json"
                    onChange={handleImportFile}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Download className="h-6 w-6 text-slate-400 mx-auto mb-1.5" />
                  <p className="font-bold text-slate-800">Choose custom-theme.json file</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Click to browse your hard drive</p>
                </div>

                {/* Text area input fallback */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-mono text-slate-400 uppercase tracking-wider font-bold">Or paste raw JSON string</label>
                  <textarea 
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="w-full h-36 font-mono text-[10px] p-2.5 border rounded-xl bg-slate-50/50 text-slate-700 focus:ring-1 focus:ring-blue-500"
                    placeholder={`{\n  "name": "Custom Theme",\n  "colors": { ... },\n  "typography": { ... },\n  "layout": { ... }\n}`}
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex items-center justify-end gap-2">
              <button 
                onClick={() => setShowImportDialog(false)}
                className="px-3.5 py-1.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleImportJson}
                disabled={!importText.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold disabled:opacity-50 cursor-pointer"
              >
                Parse & Import
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// Inline fallback XIcon since we did not import it or want to prevent compile bugs
function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
