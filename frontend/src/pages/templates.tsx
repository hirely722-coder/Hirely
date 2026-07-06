import React from 'react';
import { useApp } from '@/context/AppContext';
import TemplatesView from '@/components/TemplatesView';

export default function TemplatesPage() {
  const {
    templates,
    handleAddTemplate,
    handleEditTemplate,
    handleDeleteTemplate
  } = useApp();

  return (
    <TemplatesView
      templates={templates}
      onAddTemplate={handleAddTemplate}
      onEditTemplate={handleEditTemplate}
      onDeleteTemplate={handleDeleteTemplate}
    />
  );
}
