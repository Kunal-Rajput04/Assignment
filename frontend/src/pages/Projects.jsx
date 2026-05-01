import { useEffect, useState } from 'react';
import {
  FolderKanban, Plus, Trash2, Pencil, Loader2, Search,
  CheckSquare, Users, UserPlus, X, ChevronDown, ChevronRight
} from 'lucide-react';
import { projectApi, taskApi, userApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/Modal';

const emptyForm = { name: '', description: '' };

function MemberAvatars({ members, max = 4 }) {
  const display = members.slice(0, max);
  const extra = members.length - max;
  return (
    <div className="flex -space-x-2">
      {display.map((m, i) => (
        <div
          key={m.user_id || m.id || i}
          className="w-7 h-7 rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold"
          title={m.name || m.profiles?.name || 'Member'}
        >
          {(m.name || m.profiles?.name || 'U').charAt(0).toUpperCase()}
        </div>
      ))}
      {extra > 0 && (
        <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-semibold">
          +{extra}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ completed, total }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">{completed}/{total} tasks</span>
        <span className="text-xs font-medium text-gray-700">{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: pct === 100
              ? 'linear-gradient(90deg, #10b981, #059669)'
              : pct >= 50
                ? 'linear-gradient(90deg, #3b82f6, #2563eb)'
                : 'linear-gradient(90deg, #f59e0b, #d97706)',
          }}
        />
      </div>
    </div>
  );
}

export default function Projects() {
  const { user, isAdmin } = useAuth();
  const [projects, setProjects] = useState([]);
  const [taskStats, setTaskStats] = useState({});
  const [memberMap, setMemberMap] = useState({});
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});
  const [modal, setModal] = useState(false);
  const [memberModal, setMemberModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const projectsData = await projectApi.list();
      setProjects(projectsData || []);

      if (projectsData?.length) {
        const tasks = await taskApi.list();
        const stats = {};

        (tasks || []).forEach(t => {
          const projectId = t.project?.id;
          if (!projectId) return;
          if (!stats[projectId]) stats[projectId] = { total: 0, completed: 0, inProgress: 0, pending: 0 };
          stats[projectId].total++;
          if (t.status === 'completed') stats[projectId].completed++;
          if (t.status === 'in_progress') stats[projectId].inProgress++;
          if (t.status === 'pending') stats[projectId].pending++;
        });
        setTaskStats(stats);

        const mMap = {};
        (projectsData || []).forEach(project => {
          mMap[project.id] = project.members || [];
        });
        setMemberMap(mMap);
      }

      const profiles = await userApi.list();
      setAllMembers(profiles || []);
    } catch (err) {
      console.error('Projects load error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (user) load(); }, [user]);

  function openNew() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setModal(true);
  }

  function openEdit(project) {
    setEditing(project);
    setForm({ name: project.name, description: project.description || '' });
    setError('');
    setModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await projectApi.update(editing.id, {
          name: form.name.trim(),
          description: form.description.trim(),
        });
      } else {
        await projectApi.create({
          name: form.name.trim(),
          description: form.description.trim(),
        });
      }
      setModal(false);
      await load();
    } catch (err) {
      setError(err.message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this project? All tasks and member associations will be removed.')) return;
    await projectApi.remove(id);
    await load();
  }

  async function addMember(projectId, userId) {
    await projectApi.addMember(projectId, userId);
    await load();
  }

  async function removeMember(projectId, userId) {
    await projectApi.removeMember(projectId, userId);
    await load();
  }

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        {isAdmin && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        )}
      </div>

      {/* Project Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <FolderKanban className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">{search ? 'No projects match your search' : 'No projects yet'}</p>
          {isAdmin && !search && (
            <button onClick={openNew} className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
              Create First Project
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(project => {
            const stats = taskStats[project.id] || { total: 0, completed: 0, inProgress: 0, pending: 0 };
            const members = memberMap[project.id] || [];
            const isExpanded = expanded[project.id];

            return (
              <div key={project.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                {/* Project Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FolderKanban className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                          {project.description || 'No description'}
                        </p>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEdit(project)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    <div className="bg-gray-50 rounded-lg px-3 py-2 text-center">
                      <p className="text-lg font-bold text-gray-900">{stats.total}</p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg px-3 py-2 text-center">
                      <p className="text-lg font-bold text-amber-700">{stats.pending}</p>
                      <p className="text-xs text-amber-600">Pending</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg px-3 py-2 text-center">
                      <p className="text-lg font-bold text-blue-700">{stats.inProgress}</p>
                      <p className="text-xs text-blue-600">Active</p>
                    </div>
                    <div className="bg-green-50 rounded-lg px-3 py-2 text-center">
                      <p className="text-lg font-bold text-green-700">{stats.completed}</p>
                      <p className="text-xs text-green-600">Done</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <ProgressBar completed={stats.completed} total={stats.total} />
                  </div>

                  {/* Members & Expand */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                      <MemberAvatars members={members} />
                      <span className="text-xs text-gray-500">{members.length} member{members.length !== 1 ? 's' : ''}</span>
                    </div>
                    <button
                      onClick={() => toggleExpand(project.id)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
                    >
                      {isExpanded ? 'Hide' : 'Details'}
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded: Members List */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-4 animate-in">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                        <Users className="w-4 h-4" /> Team Members
                      </h4>
                      {isAdmin && (
                        <button
                          onClick={() => setMemberModal(project)}
                          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Add Member
                        </button>
                      )}
                    </div>
                    {members.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">No members added yet</p>
                    ) : (
                      <div className="space-y-2">
                        {members.map(m => (
                          <div key={m.user_id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-100">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                                {(m.name || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{m.name || 'Unknown'}</p>
                                <p className="text-xs text-gray-400">{m.email}</p>
                              </div>
                            </div>
                            {isAdmin && m.user_id !== user.id && (
                              <button
                                onClick={() => removeMember(project.id, m.user_id)}
                                className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Project Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Project' : 'New Project'}>
        <form onSubmit={handleSave} className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name</label>
            <input
              type="text" required value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="My Awesome Project"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What is this project about?" rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>
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

      {/* Add Member Modal */}
      {memberModal && (
        <AddMemberModal
          project={memberModal}
          existingMembers={memberMap[memberModal.id] || []}
          allMembers={allMembers}
          onAdd={addMember}
          onClose={() => setMemberModal(null)}
        />
      )}
    </div>
  );
}

function AddMemberModal({ project, existingMembers, allMembers, onAdd, onClose }) {
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);

  const existingIds = new Set(existingMembers.map(m => m.user_id));
  const available = allMembers.filter(m =>
    !existingIds.has(m.id) &&
    (m.name.toLowerCase().includes(search.toLowerCase()) ||
     m.email.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleAdd(userId) {
    setAdding(true);
    await onAdd(project.id, userId);
    setAdding(false);
  }

  return (
    <Modal open={true} onClose={onClose} title={`Add Member to ${project.name}`}>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text" placeholder="Search people..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
      {available.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No available members to add</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-auto">
          {available.map(m => (
            <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{m.name}</p>
                  <p className="text-xs text-gray-400">{m.email}</p>
                </div>
              </div>
              <button
                onClick={() => handleAdd(m.id)}
                disabled={adding}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" /> Add
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
