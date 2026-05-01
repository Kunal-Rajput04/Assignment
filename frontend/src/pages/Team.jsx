import { useEffect, useState } from 'react';
import {
  Users, Loader2, Search, Shield, User, FolderKanban,
  CheckSquare, TrendingUp, Mail
} from 'lucide-react';
import { projectApi, taskApi, userApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

function RoleBadge({ role }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border
      ${role === 'admin'
        ? 'bg-blue-50 text-blue-700 border-blue-200'
        : 'bg-gray-100 text-gray-600 border-gray-200'
      }`}
    >
      {role === 'admin' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
      {role === 'admin' ? 'Admin' : 'Member'}
    </span>
  );
}

export default function Team() {
  const { user: currentUser } = useAuth();
  const [members, setMembers] = useState([]);
  const [taskCounts, setTaskCounts] = useState({});
  const [projectMap, setProjectMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [profiles, tasks, projects] = await Promise.all([
          userApi.list(),
          taskApi.list(),
          projectApi.list(),
        ]);

        setMembers(profiles || []);

        const counts = {};
        (tasks || []).forEach(t => {
          const userId = t.assignedTo?.id;
          if (!userId) return;
          if (!counts[userId]) counts[userId] = { total: 0, completed: 0, inProgress: 0, pending: 0 };
          counts[userId].total++;
          if (t.status === 'completed') counts[userId].completed++;
          if (t.status === 'in_progress') counts[userId].inProgress++;
          if (t.status === 'pending') counts[userId].pending++;
        });
        setTaskCounts(counts);

        const pMap = {};
        (projects || []).forEach(project => {
          (project.members || []).forEach(member => {
            if (!pMap[member.userId]) pMap[member.userId] = [];
            if (!pMap[member.userId].find(p => p.project_id === project.id)) {
              pMap[member.userId].push({ project_id: project.id, name: project.name });
            }
          });
        });
        setProjectMap(pMap);
      } catch (err) {
        console.error('Team load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const admins = filtered.filter(m => m.role === 'admin');
  const regularMembers = filtered.filter(m => m.role === 'member');

  function MemberCard({ member }) {
    const tc = taskCounts[member.id] || { total: 0, completed: 0, inProgress: 0, pending: 0 };
    const pct = tc.total > 0 ? Math.round((tc.completed / tc.total) * 100) : 0;
    const isCurrentUser = member.id === currentUser?.id;
    const projects = projectMap[member.id] || [];

    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md shadow-blue-200">
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 truncate">{member.name}</p>
              {isCurrentUser && <span className="text-xs text-blue-600 font-medium">(you)</span>}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3 h-3 text-gray-400" />
              <p className="text-xs text-gray-400 truncate">{member.email}</p>
            </div>
          </div>
          <RoleBadge role={member.role} />
        </div>

        {/* Task Stats */}
        <div className="grid grid-cols-4 gap-2 text-center mb-4">
          <div className="bg-gray-50 rounded-lg p-2">
            <p className="text-base font-bold text-gray-900">{tc.total}</p>
            <p className="text-[10px] text-gray-500">Total</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-2">
            <p className="text-base font-bold text-amber-700">{tc.pending}</p>
            <p className="text-[10px] text-amber-600">Pending</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-2">
            <p className="text-base font-bold text-blue-700">{tc.inProgress}</p>
            <p className="text-[10px] text-blue-600">Active</p>
          </div>
          <div className="bg-green-50 rounded-lg p-2">
            <p className="text-base font-bold text-green-700">{tc.completed}</p>
            <p className="text-[10px] text-green-600">Done</p>
          </div>
        </div>

        {/* Progress */}
        {tc.total > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Completion</span>
              <span className="text-xs font-medium text-gray-700">{pct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Projects */}
        {projects.length > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
              <FolderKanban className="w-3 h-3" /> Projects
            </p>
            <div className="flex flex-wrap gap-1.5">
              {projects.map(p => (
                <span key={p.project_id} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Total Members', value: members.length, color: 'text-gray-900', bg: 'bg-gray-50' },
          { icon: Shield, label: 'Admins', value: members.filter(m => m.role === 'admin').length, color: 'text-blue-700', bg: 'bg-blue-50' },
          { icon: User, label: 'Members', value: members.filter(m => m.role === 'member').length, color: 'text-gray-700', bg: 'bg-gray-50' },
          {
            icon: CheckSquare, label: 'Tasks Assigned',
            value: Object.values(taskCounts).reduce((a, b) => a + b.total, 0),
            color: 'text-emerald-700', bg: 'bg-emerald-50'
          },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl border border-gray-100 p-4 text-center`}>
            <Icon className={`w-5 h-5 mx-auto mb-1.5 ${color}`} />
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text" placeholder="Search team members..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Admins */}
      {admins.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Admins
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {admins.map(m => <MemberCard key={m.id} member={m} />)}
          </div>
        </div>
      )}

      {/* Members */}
      {regularMembers.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> Members
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {regularMembers.map(m => <MemberCard key={m.id} member={m} />)}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No team members found</p>
        </div>
      )}
    </div>
  );
}
