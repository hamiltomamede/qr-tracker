import { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';
import './index.css';

const API = '/api';
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const savedToken = localStorage.getItem('qr_token');
  if (savedToken) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
  }

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('qr_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => savedToken || null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (res) => res,
      (err) => {
        const url = err.config?.url || '';
        if (err.response?.status === 401 && !url.includes('/auth/')) {
          setUser(null);
          setToken(null);
          localStorage.removeItem('qr_user');
          localStorage.removeItem('qr_token');
          delete axios.defaults.headers.common['Authorization'];
        }
        return Promise.reject(err);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  const login = (userData, authToken) => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('qr_user', JSON.stringify(userData));
    localStorage.setItem('qr_token', authToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('qr_user');
    localStorage.removeItem('qr_token');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, sidebarOpen, setSidebarOpen }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  return useContext(AuthContext);
}

function Sidebar({ activeSection, setActiveSection }) {
  const { user, logout, sidebarOpen, setSidebarOpen } = useAuth();

  const navItems = [
    { id: 'links', label: 'Links', icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H16a1 1 0 110 2h-1.47l-.56 2.243a1 1 0 11-1.94-.486L12.47 8H9.53l-.56 2.243a1 1 0 11-1.94-.486L7.47 8H6a1 1 0 010-2h1.47l.56-2.243a1 1 0 011.213-.727zM4.5 11a1 1 0 011 1v1.07l3.5 3.5V14a1 1 0 112 0v3.586l2.207-2.207a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4A1 1 0 014.5 14v-2a1 1 0 011-1z" /></svg>
    )},
    { id: 'whatsapp', label: 'WhatsApp', icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.342-1.652c1.852.948 3.952 1.431 6.115 1.461h.001a11.816 11.816 0 0010.941-5.947c-.002-6.462-5.238-11.89-10.941-11.878z"/></svg>
    )},
    { id: 'users', label: 'Usuários', icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
    )},
  ];

  return (
    <>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-gray-900/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`fixed top-0 left-0 z-40 w-64 h-screen transition-transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`} aria-label="Sidebar">
        <div className="h-full px-3 py-4 overflow-y-auto bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <a href="#" className="flex items-center ps-2.5 mb-6">
            <svg className="h-7 w-7 me-3 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm13 0a4 4 0 100 8 4 4 0 000-8z" /></svg>
            <span className="text-xl font-bold text-gray-900 dark:text-white">QR Tracker</span>
          </a>
          <ul className="space-y-1 font-medium">
            {navItems.filter(n => n.id !== 'users' || user?.role === 'admin').map((item) => (
              <li key={item.id}>
                <button onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}
                  className={`flex items-center w-full p-3 rounded-lg group ${activeSection === item.id ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                  {item.icon}
                  <span className="ms-3">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="absolute bottom-4 left-0 right-0 px-3">
            <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.name || user?.email}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${user?.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{user?.role}</span>
            </div>
            <button onClick={logout} className="mt-2 flex items-center w-full p-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
              <svg className="w-5 h-5 me-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Sair
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password });
      login(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-center mb-6">
            <svg className="h-10 w-10 text-blue-600 me-2" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm13 0a4 4 0 100 8 4 4 0 000-8z" /></svg>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">QR Tracker</h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-center mb-6">Faça login para continuar</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com"
                className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">Senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="••••••••"
                className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" />
            </div>
            {error && <p className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 disabled:opacity-50">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/users`);
      setUsers(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    try {
      await axios.post(`${API}/users`, { name: newName, email: newEmail, password: newPassword, role: newRole });
      setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('user'); setShowForm(false);
      setSuccess('Usuário criado!'); fetchUsers();
    } catch (err) { setError(err.response?.data?.error || 'Erro ao criar'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Excluir este usuário e todos os seus links?')) return;
    try { await axios.delete(`${API}/users/${id}`); setSuccess('Usuário excluído!'); fetchUsers(); }
    catch (err) { setError(err.response?.data?.error || 'Erro ao excluir'); }
  };

  const handleRoleChange = async (id, role) => {
    try { await axios.put(`${API}/users/${id}/role`, { role }); setSuccess('Role atualizada!'); fetchUsers(); }
    catch (err) { setError(err.response?.data?.error || 'Erro ao atualizar'); }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await axios.put(`${API}/users/${editingUser.id}`, { name: newName, role: newRole });
      if (newPassword && newPassword.length >= 6) {
        await axios.put(`${API}/users/${editingUser.id}/password`, { password: newPassword });
      }
      setNewName(''); setNewPassword(''); setEditingUser(null); setSuccess('Usuário atualizado!'); fetchUsers();
    } catch (err) { setError(err.response?.data?.error || 'Erro ao atualizar'); }
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Gerenciar Usuários</h2>
        <button onClick={() => { setShowForm(true); setNewName(''); setNewEmail(''); setNewPassword(''); setNewRole('user'); setError(''); }}
          className="text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-lg text-sm px-4 py-2">
          + Novo Usuário
        </button>
      </div>
      {success && <p className="mb-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 p-2 rounded-lg">{success}</p>}
      {error && <p className="mb-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-2 rounded-lg">{error}</p>}
      <div className="relative overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th className="px-6 py-3">Nome</th>
              <th className="px-6 py-3">Email</th>
              <th className="px-6 py-3">Role</th>
              <th className="px-6 py-3">Criado em</th>
              <th className="px-6 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{u.name || '-'}</td>
                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{u.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${u.role === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'}`}>{u.role}</span>
                </td>
                <td className="px-6 py-4">{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                <td className="px-6 py-4 flex gap-2">
                  <button onClick={() => { setEditingUser(u); setNewName(u.name || ''); setNewRole(u.role); setNewPassword(''); setError(''); }} className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400" title="Editar">✏️</button>
                  <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:text-red-900 dark:hover:text-red-400" title="Excluir">🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Novo Usuário</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">Nome</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} required placeholder="Nome do usuário"
                  className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">Email</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required placeholder="email@exemplo.com"
                  className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">Senha</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres"
                  className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">Role</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Criar</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {editingUser && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={() => setEditingUser(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Editar Usuário</h3>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">Nome</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do usuário"
                  className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">Email</label>
                <input type="email" value={editingUser.email} disabled
                  className="bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-lg block w-full p-2.5 cursor-not-allowed" />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">Nova Senha</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} placeholder="Deixe vazio para não alterar"
                  className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">Role</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function LinksList({ onView, onEdit, onDelete, onDownload, isAdmin }) {
  const [links, setLinks] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchLinks = async () => {
    try {
      const res = await axios.get(`${API}/links`, { params: { search, page, limit } });
      setLinks(res.data.links);
      setTotal(res.data.total);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchLinks(); }, [search, page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{isAdmin ? 'Todos os Links' : 'Seus Links'}</h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">{total} link{total !== 1 ? 's' : ''}</span>
      </div>
      <div className="mb-4">
        <input type="text" placeholder="Pesquisar por empresa ou URL..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" />
      </div>
      {links.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">Nenhum link encontrado.</div>
      ) : (
        <div className="relative overflow-x-auto bg-white dark:bg-gray-800 rounded-xl shadow">
          <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3">Empresa</th>
                <th className="px-6 py-3">URL Destino</th>
                {isAdmin && <th className="px-6 py-3">Usuário</th>}
                <th className="px-6 py-3">Scans</th>
                <th className="px-6 py-3">Criado em</th>
                <th className="px-6 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{link.company_name}</td>
                  <td className="px-6 py-4 max-w-[200px] truncate">{link.destination_url}</td>
                  {isAdmin && <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{link.owner_email || '-'}</td>}
                  <td className="px-6 py-4">
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">{link.scan_count}</span>
                  </td>
                  <td className="px-6 py-4">{new Date(link.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-6 py-4 flex gap-2">
                    <button onClick={() => onView(link)} className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400" title="Visualizar">👁</button>
                    <button onClick={() => onDownload(link)} className="text-green-600 hover:text-green-900 dark:hover:text-green-400" title="Baixar PNG">⬇️</button>
                    <button onClick={() => onEdit(link)} className="text-yellow-600 hover:text-yellow-900 dark:hover:text-yellow-400" title="Editar">✏️</button>
                    <button onClick={() => onDelete(link)} className="text-red-600 hover:text-red-900 dark:hover:text-red-400" title="Excluir">🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-4">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">Anterior</button>
          <span className="text-sm text-gray-500 dark:text-gray-400">Página {page} de {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">Próxima</button>
        </div>
      )}
    </div>
  );
}

function LinkFormModal({ link, onSave, onClose }) {
  const [companyName, setCompanyName] = useState(link?.company_name || '');
  const [destinationUrl, setDestinationUrl] = useState(link?.destination_url || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (link) {
        await axios.put(`${API}/links/${link.id}`, { company_name: companyName, destination_url: destinationUrl });
      } else {
        await axios.post(`${API}/links`, { company_name: companyName, destination_url: destinationUrl });
      }
      onSave();
    } catch (err) { setError(err.response?.data?.error || 'Erro ao salvar'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{link ? 'Editar Link' : 'Novo Link'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">Nome da Empresa</label>
            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required
              className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">URL de Destino</label>
            <input type="url" value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} required
              className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300">Cancelar</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">{loading ? 'Salvando...' : link ? 'Salvar' : 'Criar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LinkDetailsModal({ link, onClose }) {
  const [activeTab, setActiveTab] = useState('scans');
  const [scans, setScans] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [scansRes, analyticsRes, qrRes] = await Promise.all([
          axios.get(`${API}/links/${link.id}/scans`),
          axios.get(`${API}/links/${link.id}/analytics`),
          axios.get(`${API}/qr/${link.id}`),
        ]);
        setScans(scansRes.data.scans);
        setAnalytics(analyticsRes.data);
        setQrData(qrRes.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    loadData();
  }, [link.id]);

  const tabs = [
    { id: 'scans', label: 'Histórico' },
    { id: 'devices', label: 'Dispositivos' },
    { id: 'browsers', label: 'Navegadores' },
    { id: 'os', label: 'Sistemas' },
    { id: 'hours', label: 'Por Horário' },
  ];

  return (
    <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <button onClick={onClose} className="text-blue-600 hover:text-blue-800 dark:hover:text-blue-400 text-sm font-medium">← Voltar</button>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{link.company_name}</h3>
          <div />
        </div>
        {loading ? (
          <div className="p-6 text-center text-gray-500">Carregando...</div>
        ) : (
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
              <img src={qrData?.qr_code} alt="QR Code" className="rounded-lg max-w-[180px]" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 break-all">{qrData?.scan_url}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{analytics?.total_scans || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Scans</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{analytics?.first_scan ? new Date(analytics.first_scan).toLocaleDateString('pt-BR') : '-'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Primeiro Scan</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{analytics?.last_scan ? new Date(analytics.last_scan).toLocaleDateString('pt-BR') : '-'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Último Scan</p>
              </div>
            </div>
            <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
              <ul className="flex flex-wrap gap-2">
                {tabs.map((t) => (
                  <li key={t.id}>
                    <button onClick={() => setActiveTab(t.id)}
                      className={`inline-block px-3 py-2 text-sm font-medium rounded-t-lg ${activeTab === t.id ? 'text-blue-600 bg-blue-50 dark:bg-gray-700 dark:text-blue-400 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                      {t.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4">
              {activeTab === 'scans' && (
                scans.length === 0 ? <p className="text-center text-gray-500 py-4">Nenhum scan.</p> :
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                      <tr><th className="px-4 py-2">#</th><th className="px-4 py-2">Data/Hora</th><th className="px-4 py-2">Device</th><th className="px-4 py-2">Browser</th><th className="px-4 py-2">SO</th><th className="px-4 py-2">Localização</th><th className="px-4 py-2">IP</th></tr>
                    </thead>
                      <tbody>
                      {scans.map((s) => (
                        <tr key={s.id} className="border-b dark:border-gray-700">
                          <td className="px-4 py-2">{s.id}</td>
                          <td className="px-4 py-2">{new Date(s.scanned_at).toLocaleString('pt-BR')}</td>
                          <td className="px-4 py-2"><span className={`px-2 py-0.5 text-xs rounded-full ${s.is_mobile ? 'bg-green-100 text-green-800' : s.is_tablet ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>{s.is_mobile ? 'Mobile' : s.is_tablet ? 'Tablet' : 'Desktop'}</span></td>
                          <td className="px-4 py-2">{s.browser || '-'}</td>
                          <td className="px-4 py-2">{s.os || '-'}</td>
                          <td className="px-4 py-2 text-xs">{[s.city, s.region, s.country].filter(Boolean).join(', ') || '-'}</td>
                          <td className="px-4 py-2 font-mono text-xs">{s.ip || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {activeTab === 'devices' && (
                <div className="space-y-3">
                  {['mobile', 'tablet', 'desktop'].map((d) => (
                    <div key={d} className="flex items-center gap-3">
                      <span className="w-20 text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{d}</span>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4"><div className="bg-blue-600 h-4 rounded-full" style={{ width: `${analytics?.total_scans ? (analytics.by_device[d] / analytics.total_scans) * 100 : 0}%` }} /></div>
                      <span className="w-8 text-sm font-medium text-gray-900 dark:text-white text-right">{analytics?.by_device[d] || 0}</span>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'browsers' && (
                <div className="space-y-3">
                  {(analytics?.by_browser || []).length === 0 ? <p className="text-center text-gray-500 py-4">Sem dados.</p> :
                    analytics.by_browser.map((b) => (
                      <div key={b.browser} className="flex items-center gap-3">
                        <span className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300">{b.browser}</span>
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4"><div className="bg-blue-600 h-4 rounded-full" style={{ width: `${analytics?.total_scans ? (b.count / analytics.total_scans) * 100 : 0}%` }} /></div>
                        <span className="w-8 text-sm font-medium text-gray-900 dark:text-white text-right">{b.count}</span>
                      </div>
                    ))}
                </div>
              )}
              {activeTab === 'os' && (
                <div className="space-y-3">
                  {(analytics?.by_os || []).length === 0 ? <p className="text-center text-gray-500 py-4">Sem dados.</p> :
                    analytics.by_os.map((o) => (
                      <div key={o.os} className="flex items-center gap-3">
                        <span className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300">{o.os}</span>
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4"><div className="bg-blue-600 h-4 rounded-full" style={{ width: `${analytics?.total_scans ? (o.count / analytics.total_scans) * 100 : 0}%` }} /></div>
                        <span className="w-8 text-sm font-medium text-gray-900 dark:text-white text-right">{o.count}</span>
                      </div>
                    ))}
                </div>
              )}
              {activeTab === 'hours' && (
                <div className="flex items-end gap-1 h-32">
                  {Array.from({ length: 24 }, (_, i) => {
                    const h = analytics?.by_hour?.find((x) => x.hour === i);
                    const c = h?.count || 0;
                    const max = Math.max(...(analytics?.by_hour?.map((x) => x.count) || [1]), 1);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-t-sm flex items-end" style={{ height: '80px' }}>
                          <div className="w-full bg-blue-600 rounded-t-sm" style={{ height: `${(c / max) * 100}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-500">{String(i).padStart(2, '0')}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WhatsAppGenerator() {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  const generateLink = () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return;
    const waLink = message 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/${cleanPhone}`;
    setGeneratedLink(waLink);
    setCopied(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 lg:p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Gerador de Link WhatsApp</h2>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-6 max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">Número do WhatsApp</label>
            <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5511999999999"
              className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-900 dark:text-white">Mensagem (opcional)</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Olá, tudo bem?"
              className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5" />
          </div>
          <button type="button" onClick={generateLink} className="w-full text-white bg-green-600 hover:bg-green-700 font-medium rounded-lg text-sm px-4 py-2.5">
            Gerar Link
          </button>
          {generatedLink && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Link gerado:</p>
              <p className="text-sm text-gray-900 dark:text-white break-all font-mono">{generatedLink}</p>
              <button type="button" onClick={copyLink} className="mt-3 w-full text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-lg text-sm px-4 py-2">
                {copied ? 'Copiado!' : 'Copiar Link'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { user, logout, setSidebarOpen } = useAuth();
  const [activeSection, setActiveSection] = useState('links');
  const [showForm, setShowForm] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [viewingLink, setViewingLink] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSave = () => { setShowForm(false); setEditingLink(null); setRefreshKey((k) => k + 1); };
  const handleDelete = async (link) => {
    if (!confirm(`Excluir link "${link.company_name}"?`)) return;
    try { await axios.delete(`${API}/links/${link.id}`); setRefreshKey((k) => k + 1); }
    catch (err) { alert('Erro ao excluir'); }
  };
  const handleDownload = async (link) => {
    try {
      const res = await axios.get(`${API}/qr/${link.id}/png`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'image/png' }));
      const a = document.createElement('a'); a.href = url;
      a.download = `qr-${link.company_name.replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch (err) { alert('Erro ao baixar QR Code'); }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      <div className="lg:ml-64">
        <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-gray-600 dark:text-gray-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex items-center gap-3 ms-auto">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">{user?.name || user?.email?.split('@')[0]}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
              </div>
            </div>
            <button onClick={logout} className="text-sm text-red-600 hover:text-red-800 dark:hover:text-red-400 font-medium">Sair</button>
          </div>
        </nav>
        <main>
          {activeSection === 'links' && (
            <>
              <div className="p-4 lg:p-6 pb-0">
                <button onClick={() => setShowForm(true)} className="text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-lg text-sm px-4 py-2">+ Novo Link</button>
              </div>
              <LinksList key={refreshKey} onView={setViewingLink} onEdit={setEditingLink} onDelete={handleDelete} onDownload={handleDownload} isAdmin={user?.role === 'admin'} />
            </>
          )}
          {activeSection === 'whatsapp' && <WhatsAppGenerator />}
          {activeSection === 'users' && user?.role === 'admin' && <UsersManagement />}
        </main>
      </div>
      {showForm && <LinkFormModal onSave={handleSave} onClose={() => setShowForm(false)} />}
      {editingLink && <LinkFormModal link={editingLink} onSave={handleSave} onClose={() => setEditingLink(null)} />}
      {viewingLink && <LinkDetailsModal link={viewingLink} onClose={() => setViewingLink(null)} />}
    </div>
  );
}

function App() {
  const { user } = useAuth();
  return user ? <Dashboard /> : <LoginPage />;
}

export default function AppWithAuth() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
