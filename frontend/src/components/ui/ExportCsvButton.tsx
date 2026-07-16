import React from 'react';
import { Download } from 'lucide-react';
import { generateCSV, ExportColumn } from '../../utils/csvExporter';
import { usePermission } from '../../hooks/usePermission';

interface ExportCsvButtonProps<T> {
  data: T[];
  columns: ExportColumn<T>[];
  filename: string;
  className?: string;
  permission?: string;
  onExportSuccess?: () => void;
  onExportError?: (error: any) => void;
  label?: string;
  disabled?: boolean;
}

export function ExportCsvButton<T>({
  data,
  columns,
  filename,
  className = "flex flex-1 sm:flex-initial items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors bg-white shadow-xs cursor-pointer",
  permission,
  onExportSuccess,
  onExportError,
  label = "Export CSV",
  disabled = false
}: ExportCsvButtonProps<T>) {
  const { can } = usePermission();

  const handleExport = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (disabled) return;

    if (permission && !can(permission)) {
      if (onExportError) {
        onExportError(new Error("Access Denied: Insufficient permissions to export."));
      }
      return;
    }

    try {
      generateCSV(data, columns, filename);
      if (onExportSuccess) {
        onExportSuccess();
      }
    } catch (error) {
      if (onExportError) {
        onExportError(error);
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      className={className}
      disabled={disabled}
      title="Export list to CSV sheet"
    >
      <Download className="h-4 w-4 text-slate-400" />
      <span>{label}</span>
    </button>
  );
}
