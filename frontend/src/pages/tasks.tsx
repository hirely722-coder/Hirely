import React from 'react';
import { useApp } from '@/context/AppContext';
import TasksView from '@/components/TasksView';

export default function TasksPage() {
  const {
    tasks,
    candidates,
    handleAddTask,
    handleToggleTaskStatus,
    handleUpdateTask,
    handleDeleteTask,
    setEmailComposeCandidate,
    setEmailComposePreselectedJob,
    isLoading
  } = useApp();

  return (
    <TasksView
      tasks={tasks}
      candidates={candidates}
      isLoading={isLoading}
      onAddTask={handleAddTask}
      onToggleTaskStatus={handleToggleTaskStatus}
      onUpdateTask={handleUpdateTask}
      onDeleteTask={handleDeleteTask}
      onComposeEmail={(c) => {
        setEmailComposeCandidate(c);
        setEmailComposePreselectedJob(null);
      }}
    />
  );
}
