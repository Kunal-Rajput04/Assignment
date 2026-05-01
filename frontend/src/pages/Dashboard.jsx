import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban, CheckSquare, Clock, AlertTriangle,
  TrendingUp, ArrowRight, Users, BarChart3, Zap
} from 'lucide-react';
import { projectApi, taskApi } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';

function StatCard({ icon: Icon, label, value, color, sub, accent }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

function ProjectProgressCard({ project, stats }) {
  const pct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <FolderKanban className="w-4 h-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{project.name}</p>
          <p className="text-xs text-gray-400">{stats.total} task{stats.total !== 1 ? 's' : ''}</p>
        </div>
        <span className="text-sm font-bold text-gray-700">{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
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
      <div className="flex gap-3 mt-2 text-xs text-gray-400">
        <span className="text-amber-600">{stats.pending} pending</span>
        <span className="text-blue-600">{stats.inProgress} active</span>
        <span className="text-green-600">{stats.completed} done</span>
      </div>
    </div>
  );
}

function getTaskStatus(task) {
  const today = new Date().toISOString().split('T')[0];
  if (task.status !== 'completed' && task.due_date && task.due_date < today) return 'overdue';
  return task.status;
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState({ projects: 0, tasks: 0, inProgress: 0, overdue: 0, completed: 0, pending: 0 });
  const [recentTasks, setRecentTasks] = useState([]);
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [projectStats, setProjectStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const today = new Date().toISOString().split('T')[0];

        const [projects, tasks] = await Promise.all([
          projectApi.list(),
          taskApi.list(),
        ]);

        const visibleTasks = isAdmin
          ? tasks || []
          : (tasks || []).filter(t => t.assignedTo?.id === user.id);

        const projectCount = projects?.length || 0;
        const allTasks = visibleTasks;
        const inProgress = allTasks.filter(t => t.status === 'in_progress').length;
        const completed = allTasks.filter(t => t.status === 'completed').length;
        const pending = allTasks.filter(t => t.status === 'pending').length;
        const overdue = allTasks.filter(t =>
          t.due_date && t.due_date < today && t.status !== 'completed'
        ).length;

        setStats({
          projects: projectCount || 0,
          tasks: allTasks.length,
          inProgress, completed, pending, overdue,
        });

        setRecentTasks(allTasks.slice(0, 8));
        setOverdueTasks(allTasks.filter(t => getTaskStatus(t) === 'overdue').slice(0, 5));

        if (projects?.length && allTasks.length) {
          const pStats = projects.map(p => {
            const pTasks = allTasks.filter(t => t.project?.id === p.id);
            return {
              project: p,
              stats: {
                total: pTasks.length,
                completed: pTasks.filter(t => t.status === 'completed').length,
                inProgress: pTasks.filter(t => t.status === 'in_progress').length,
                pending: pTasks.filter(t => t.status === 'pending').length,
              },
            };
          }).filter(p => p.stats.total > 0);
          setProjectStats(pStats);
        }
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    if (user) load();
  }, [user, isAdmin]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const completionRate = stats.tasks > 0 ? Math.round((stats.completed / stats.tasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={FolderKanban} label="Total Projects" value={stats.projects} color="bg-blue-500" />
        <StatCard icon={CheckSquare} label="Total Tasks" value={stats.tasks} color="bg-emerald-500" sub={`${completionRate}% completion rate`} />
        <StatCard icon={TrendingUp} label="In Progress" value={stats.inProgress} color="bg-amber-500" sub={`${stats.pending} pending`} />
        <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdue} color="bg-red-500" sub={stats.overdue > 0 ? 'Needs attention' : 'All on track'} />
      </div>

      {/* Overdue Tasks Section */}
      {overdueTasks.length > 0 && (
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 bg-red-50 border-b border-red-100">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-800">Overdue Tasks</h3>
            <span className="ml-auto text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
              {overdueTasks.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {overdueTasks.map(task => (
              <div key={task.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-red-50/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {task.project?.name || 'No project'}
                    {task.assignedTo?.name && ` · Assigned to ${task.assignedTo.name}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {task.due_date && (
                    <span className="text-xs text-red-600 font-medium">
                      Due {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  <StatusBadge status="overdue" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two-column: Recent Tasks + Project Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              <h3 className="font-semibold text-gray-900">Recent Tasks</h3>
            </div>
            <Link to="/tasks" className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {recentTasks.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <CheckSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No tasks yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentTasks.map(task => (
                <div key={task.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {task.project?.name || 'No project'}
                      {task.assignedTo?.name && ` · ${task.assignedTo.name}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {task.due_date && (
                      <span className="text-xs text-gray-400">
                        {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                    <StatusBadge status={getTaskStatus(task)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project Progress */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-400" />
              <h3 className="font-semibold text-gray-900">Project Progress</h3>
            </div>
            <Link to="/projects" className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {projectStats.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <FolderKanban className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No projects with tasks yet</p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {projectStats.map(({ project, stats }) => (
                <ProjectProgressCard key={project.id} project={project} stats={stats} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/projects"
          className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 text-white hover:from-blue-700 hover:to-blue-800 transition-all group">
          <FolderKanban className="w-7 h-7 mb-3 opacity-80" />
          <p className="font-semibold">Manage Projects</p>
          <p className="text-blue-200 text-sm mt-0.5">Create and organize projects</p>
          <ArrowRight className="mt-3 w-5 h-5 opacity-60 group-hover:translate-x-1 transition-transform" />
        </Link>
        <Link to="/tasks"
          className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-5 text-white hover:from-emerald-700 hover:to-emerald-800 transition-all group">
          <CheckSquare className="w-7 h-7 mb-3 opacity-80" />
          <p className="font-semibold">Manage Tasks</p>
          <p className="text-emerald-200 text-sm mt-0.5">Track and update progress</p>
          <ArrowRight className="mt-3 w-5 h-5 opacity-60 group-hover:translate-x-1 transition-transform" />
        </Link>
        {isAdmin && (
          <Link to="/team"
            className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-2xl p-5 text-white hover:from-slate-800 hover:to-slate-900 transition-all group">
            <Users className="w-7 h-7 mb-3 opacity-80" />
            <p className="font-semibold">Manage Team</p>
            <p className="text-slate-300 text-sm mt-0.5">Add members and assign roles</p>
            <ArrowRight className="mt-3 w-5 h-5 opacity-60 group-hover:translate-x-1 transition-transform" />
          </Link>
        )}
      </div>
    </div>
  );
}
