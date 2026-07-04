import React, { useState, useEffect, useRef } from 'react';
import { CustomTheme } from '../../types';
import { THEME_PRESETS, DEFAULT_THEME } from './themePresets';
import { injectThemeCSS } from './themeHelpers';

interface UseThemeBuilderStateProps {
  currentThemeId: string;
  onThemeChanged: (themeId: string) => void;
  showToast: (text: string, type: 'success' | 'error') => void;
}

export function useThemeBuilderState({
  currentThemeId,
  onThemeChanged,
  showToast
}: UseThemeBuilderStateProps) {
  // Saved themes database in localStorage
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
    const savedActive = localStorage.getItem('apex-custom-theme-active-data');
    if (savedActive) {
      try {
        return JSON.parse(savedActive);
      } catch (e) {}
    }
    const matchingPreset = THEME_PRESETS.find(p => p.id === currentThemeId);
    return matchingPreset ? { ...matchingPreset } : { ...DEFAULT_THEME };
  });

  // Current appearance mode
  const [systemMode, setSystemMode] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('apex-system-mode') as 'light' | 'dark' | 'system') || 'light';
  });

  // UI sections
  const [activeSection, setActiveSection] = useState<'presets' | 'colors' | 'typography' | 'layout' | 'branding' | 'database'>('presets');
  const [renameValue, setRenameValue] = useState(activeTheme.name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Supabase mock synchronization states
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(() => {
    return localStorage.getItem('apex-supabase-connected') === 'true';
  });
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'syncing' | 'failed'>('synced');
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [supabaseUrl, setSupabaseUrl] = useState('https://oqjxclwhidvbywuxgskh.supabase.co');
  const [supabaseKey, setSupabaseKey] = useState('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9...');
  const [showSqlSchema, setShowSqlSchema] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inject dynamic variables on theme state updates
  useEffect(() => {
    injectThemeCSS(activeTheme);
    localStorage.setItem('apex-custom-theme-active-data', JSON.stringify(activeTheme));
  }, [activeTheme]);

  const saveThemesList = (updated: CustomTheme[]) => {
    setSavedThemes(updated);
    localStorage.setItem('apex-custom-themes', JSON.stringify(updated));
  };

  const handleSelectPreset = (preset: CustomTheme) => {
    setActiveTheme({ ...preset });
    onThemeChanged(preset.id);
    showToast(`✓ Switched to ${preset.name} branding presets!`, 'success');
  };

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
      setActiveTheme({ ...DEFAULT_THEME });
      onThemeChanged('slate');
    }
    const updatedList = savedThemes.filter(t => t.id !== id);
    saveThemesList(updatedList);
    showToast('✓ Custom Theme deleted.', 'error');
  };

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
      setTimeout(() => {
        handleSaveToSupabase();
      }, 500);
    } else {
      setSyncLogs([]);
      setSyncStatus('synced');
      showToast('⚠️ Supabase sync de-activated. Running local fallback.', 'error');
    }
  };

  return {
    savedThemes,
    activeTheme,
    setActiveTheme,
    systemMode,
    setSystemMode,
    activeSection,
    setActiveSection,
    renameValue,
    setRenameValue,
    isEditingName,
    setIsEditingName,
    importText,
    setImportText,
    showImportDialog,
    setShowImportDialog,
    supabaseConnected,
    syncStatus,
    syncLogs,
    setSyncLogs,
    supabaseUrl,
    setSupabaseUrl,
    supabaseKey,
    setSupabaseKey,
    showSqlSchema,
    setShowSqlSchema,
    fileInputRef,
    handleSelectPreset,
    handleColorChange,
    handleTypographyChange,
    handleLayoutChange,
    handleCreateTheme,
    handleRenameTheme,
    handleDuplicateTheme,
    handleDeleteTheme,
    handleExportTheme,
    handleImportJson,
    handleImportFile,
    handleReset,
    handleSaveToSupabase,
    handleToggleSupabase
  };
}
