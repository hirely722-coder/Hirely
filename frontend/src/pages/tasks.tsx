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
    setEmailComposePreselectedJob
  } = useApp();

  return (
    <TasksView
      tasks={tasks}
      candidates={candidates}
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
