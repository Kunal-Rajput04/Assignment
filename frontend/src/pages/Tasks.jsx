import { useEffect, useState } from 'react';
import {
  CheckSquare, Plus, Trash2, Pencil, Loader2, Search,
  CalendarDays, AlertTriangle, FolderKanban
} from 'lucide-react';
import { projectApi, taskApi, userApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const emptyForm = {
  title: '', description: '', status: 'pending',
  due_date: '', project_id: '', assigned_to: '',
};

function getEffectiveStatus(task) {
  const today = new Date().toISOString().split('T')[0];
  if (task.status !== 'completed' && task.due_date && task.due_date < today) return 'overdue';
  return task.status;
}

function TaskCard({ task, onEdit, onDelete, onStatusChange, isAdmin, currentUserId }) {
  const effStatus = getEffectiveStatus(task);
  const isOverdue = effStatus === 'overdue';
  const isAssigned = task.assignedTo?.id === currentUserId;

  const canChangeStatus = isAdmin || isAssigned || memberProjectIds.has(task.project?.id);

  return (
    <div className={`bg-white rounded-xl border shadow-sm p-4 hover:shadow-md transition-all group
      ${isOverdue ? 'border-red-200 shadow-red-100/50' : 'border-gray-100'}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-gray-900 truncate">{task.title}</h4>
            <StatusBadge status={effStatus} />
          </div>
          {task.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-2">{task.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
            {task.project?.name && (
              <span className="inline-flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                <FolderKanban className="w-3 h-3" />{task.project.name}
              </span>
            )}
            {task.assignedTo?.name && (
              <span className="flex items-center gap-1">
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] font-bold">
                  {task.assignedTo.name.charAt(0).toUpperCase()}
                </div>
                {task.assignedTo.name}
              </span>
            )}
            {task.due_date && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                <CalendarDays className="w-3 h-3" />
                {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {canChangeStatus && (
            <select
              value={task.status}
              onChange={e => onStatusChange(task, e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          )}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(task)}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            {isAdmin && (
              <button onClick={() => onDelete(task.id)}
                className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Tasks() {
  const { user, isAdmin } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [viewMode, setViewMode] = useState('board');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const [tasksData, projectsData, membersData] = await Promise.all([
        taskApi.list(),
        projectApi.list(),
        userApi.list(),
      ]);

      const memberProjectIds = new Set(
        (projectsData || [])
          .filter(project => (project.members || []).some(member => member.id === user.id || member.userId === user.id))
          .map(project => project.id)
      );

      const visibleTasks = isAdmin
        ? tasksData || []
        : (tasksData || []).filter(t =>
            t.assignedTo?.id === user.id || memberProjectIds.has(t.project?.id)
          );

      setTasks(visibleTasks);
      setProjects(projectsData || []);
      setMembers(membersData || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
      setLoadError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) load();
  }, [user, isAdmin]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModal(true);
  }

  function openEdit(task) {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      due_date: task.due_date || '',
      project_id: task.project?.id || '',
      assigned_to: task.assignedTo?.id || '',
    });
    setError('');
    setModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        due_date: form.due_date || null,
        projectId: form.project_id || null,
        assignedToId: form.assigned_to || null,
      };

      if (editing) {
        const updatePayload = isAdmin ? payload : { status: form.status };
        await taskApi.update(editing.id, updatePayload);
      } else {
        await taskApi.create(payload);
      }
      setModal(false);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this task?')) return;
    await taskApi.remove(id);
    await load();
  }

  async function quickStatus(task, newStatus) {
    await taskApi.update(task.id, { status: newStatus });
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
  }

  const memberProjectIds = new Set(
    projects
      .filter(project => (project.members || []).some(member => member.id === user.id || member.userId === user.id))
      .map(project => project.id)
  );

  const filtered = tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(search.toLowerCase());
    const effStatus = getEffectiveStatus(t);
    const matchStatus = filterStatus === 'all' || effStatus === filterStatus || t.status === filterStatus;
    const matchProject = filterProject === 'all' || String(t.project?.id) === filterProject;
    return matchSearch && matchStatus && matchProject;
  });

  const overdueCnt = tasks.filter(t => getEffectiveStatus(t) === 'overdue').length;

  const columns = [
    { key: 'pending', label: 'Pending', color: 'border-t-amber-400', bg: 'bg-amber-50' },
    { key: 'in_progress', label: 'In Progress', color: 'border-t-blue-400', bg: 'bg-blue-50' },
    { key: 'completed', label: 'Completed', color: 'border-t-green-400', bg: 'bg-green-50' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
        <AlertTriangle className="w-12 h-12 mx-auto text-red-400 mb-3" />
        <p className="text-gray-700 font-medium">Failed to load tasks</p>
        <p className="text-sm text-gray-400 mt-1">{loadError}</p>
        <button onClick={load} className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {overdueCnt > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">
            {overdueCnt} task{overdueCnt > 1 ? 's are' : ' is'} overdue and need attention.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text" placeholder="Search tasks..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
          <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="all">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-2 text-xs font-medium transition-colors ${viewMode === 'board' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >Board</button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >List</button>
          </div>
          {isAdmin && (
            <button onClick={openNew}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap">
              <Plus className="w-4 h-4" /> New Task
            </button>
          )}
        </div>
      </div>

      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map(col => {
            const colTasks = filtered.filter(t => {
              const eff = getEffectiveStatus(t);
              if (col.key === 'pending') return t.status === 'pending' && eff !== 'overdue';
              return t.status === col.key;
            });
            const overdueTasks = col.key === 'pending' ? filtered.filter(t => getEffectiveStatus(t) === 'overdue') : [];

            return (
              <div key={col.key} className={`rounded-2xl border-t-3 ${col.color} bg-gray-50/50`}>
                <div className={`px-4 py-3 ${col.bg} border-b border-gray-100`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800">{col.label}</h3>
                    <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded-full">
                      {colTasks.length + overdueTasks.length}
                    </span>
                  </div>
                </div>
                <div className="p-3 space-y-3 min-h-[200px]">
                  {overdueTasks.map(task => (
                    <TaskCard key={task.id} task={task} onEdit={openEdit} onDelete={handleDelete}
                      onStatusChange={quickStatus} isAdmin={isAdmin} currentUserId={user.id} />
                  ))}
                  {colTasks.map(task => (
                    <TaskCard key={task.id} task={task} onEdit={openEdit} onDelete={handleDelete}
                      onStatusChange={quickStatus} isAdmin={isAdmin} currentUserId={user.id} />
                  ))}
                  {colTasks.length + overdueTasks.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-8">No tasks</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
            <CheckSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">{search ? 'No tasks match your search' : 'No tasks yet'}</p>
            {isAdmin && !search && (
              <button onClick={openNew} className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                Create First Task
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Task</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 hidden sm:table-cell">Project</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 hidden md:table-cell">Assigned To</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600 hidden lg:table-cell">Due Date</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-gray-600">Status</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(task => {
                    const effStatus = getEffectiveStatus(task);
                    return (
                      <tr key={task.id} className="hover:bg-gray-50/60 transition-colors group">
                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-900 truncate max-w-[220px]">{task.title}</p>
                          {task.description && <p className="text-xs text-gray-400 truncate max-w-[220px] mt-0.5">{task.description}</p>}
                        </td>
                        <td className="px-5 py-4 hidden sm:table-cell"><span className="text-gray-500">{task.project?.name || '—'}</span></td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          {task.assignedTo?.name ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-medium">
                                {task.assignedTo.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-gray-500">{task.assignedTo.name}</span>
                            </div>
                          ) : <span className="text-gray-400">Unassigned</span>}
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell">
                          {task.due_date ? (
                            <div className={`flex items-center gap-1.5 ${effStatus === 'overdue' ? 'text-red-600' : 'text-gray-500'}`}>
                              <CalendarDays className="w-3.5 h-3.5" />
                              {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-5 py-4">
                          {!isAdmin && task.assignedTo?.id === user.id ? (
                            <select value={task.status} onChange={e => quickStatus(task, e.target.value)}
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                          ) : <StatusBadge status={effStatus} />}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            <button onClick={() => openEdit(task)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                              <Pencil className="w-4 h-4" />
                            </button>
                            {isAdmin && (
                              <button onClick={() => handleDelete(task.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? (isAdmin ? 'Edit Task' : 'Update Status') : 'New Task'}>
        <form onSubmit={handleSave} className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}

          {(isAdmin || !editing) && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
                <input type="text" required value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  disabled={!isAdmin && !!editing} placeholder="Task title"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  disabled={!isAdmin && !!editing} placeholder="Task description" rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-50" />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {isAdmin && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Project</label>
                <select value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">No project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Assign To</label>
                <select value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Unassigned</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date</label>
                <input type="date" value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModal(false)}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
