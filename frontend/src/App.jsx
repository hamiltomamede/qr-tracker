import { useState, useEffect, createContext, useContext } from 'react';
import axios from 'axios';
import './App.css';

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
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  return useContext(AuthContext);
}

function LoginPage() {
  const { login } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const res = await axios.post(`${API}${endpoint}`, { email, password });
      login(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>QR Tracker</h1>
        <p className="auth-subtitle">{isRegister ? 'Crie sua conta' : 'Faça login'}</p>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder={isRegister ? 'Mínimo 6 caracteres' : 'Sua senha'} minLength={6} />
          </div>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Aguarde...' : isRegister ? 'Registrar' : 'Entrar'}
          </button>
        </form>
        <button className="btn-link" onClick={() => { setIsRegister(!isRegister); setError(''); }}>
          {isRegister ? 'Já tem conta? Entrar' : 'Não tem conta? Registrar'}
        </button>
      </div>
    </div>
  );
}

function LinksList({ onView, onEdit, onDelete, onDownload }) {
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
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [search, page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="links-list">
      <div className="list-header">
        <h2>Seus Links</h2>
        <span className="total-badge">{total} link{total !== 1 ? 's' : ''}</span>
      </div>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Pesquisar por empresa ou URL..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>
      {links.length === 0 ? (
        <p className="empty">Nenhum link encontrado.</p>
      ) : (
        <table className="links-table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>URL Destino</th>
              <th>Scans</th>
              <th>Criado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr key={link.id}>
                <td className="company-cell">{link.company_name}</td>
                <td className="url-cell">{link.destination_url}</td>
                <td><span className="badge">{link.scan_count}</span></td>
                <td>{new Date(link.created_at).toLocaleDateString('pt-BR')}</td>
                <td className="actions-cell">
                  <button className="btn-action btn-view" onClick={() => onView(link)} title="Visualizar">
                    👁
                  </button>
                  <button className="btn-action btn-download" onClick={() => onDownload(link)} title="Baixar PNG">
                    ⬇️
                  </button>
                  <button className="btn-action btn-edit" onClick={() => onEdit(link)} title="Editar">
                    ✏️
                  </button>
                  <button className="btn-action btn-delete" onClick={() => onDelete(link)} title="Excluir">
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
          <span>Página {page} de {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Próxima</button>
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
    setError('');
    setLoading(true);
    try {
      if (link) {
        await axios.put(`${API}/links/${link.id}`, { company_name: companyName, destination_url: destinationUrl });
      } else {
        await axios.post(`${API}/links`, { company_name: companyName, destination_url: destinationUrl });
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{link ? 'Editar Link' : 'Novo Link'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome da Empresa</label>
            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>URL de Destino</label>
            <input type="url" value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} required />
          </div>
          {error && <p className="error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : link ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LinkDetailsModal({ link, onClose, onBack }) {
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
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [link.id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <button className="btn-back" onClick={onBack}>← Voltar</button>
          <h3>{link.company_name}</h3>
        </div>
        {loading ? (
          <p className="empty">Carregando...</p>
        ) : (
          <>
            <div className="qr-section">
              <img src={qrData?.qr_code} alt="QR Code" />
              <p className="scan-url">{qrData?.scan_url}</p>
            </div>
            <div className="summary-cards">
              <div className="summary-item">
                <span className="summary-value">{analytics?.total_scans || 0}</span>
                <span className="summary-label">Total Scans</span>
              </div>
              <div className="summary-item">
                <span className="summary-value">{analytics?.first_scan ? new Date(analytics.first_scan).toLocaleDateString('pt-BR') : '-'}</span>
                <span className="summary-label">Primeiro Scan</span>
              </div>
              <div className="summary-item">
                <span className="summary-value">{analytics?.last_scan ? new Date(analytics.last_scan).toLocaleDateString('pt-BR') : '-'}</span>
                <span className="summary-label">Último Scan</span>
              </div>
            </div>
            <div className="tabs">
              <button className={`tab ${activeTab === 'scans' ? 'active' : ''}`} onClick={() => setActiveTab('scans')}>Histórico</button>
              <button className={`tab ${activeTab === 'devices' ? 'active' : ''}`} onClick={() => setActiveTab('devices')}>Dispositivos</button>
              <button className={`tab ${activeTab === 'browsers' ? 'active' : ''}`} onClick={() => setActiveTab('browsers')}>Navegadores</button>
              <button className={`tab ${activeTab === 'os' ? 'active' : ''}`} onClick={() => setActiveTab('os')}>Sistemas</button>
              <button className={`tab ${activeTab === 'hours' ? 'active' : ''}`} onClick={() => setActiveTab('hours')}>Por Horário</button>
            </div>
            <div className="tab-content">
              {activeTab === 'scans' && (
                scans.length === 0 ? <p className="empty">Nenhum scan.</p> :
                <table className="scans-table">
                  <thead><tr><th>#</th><th>Data/Hora</th><th>Device</th><th>Browser</th><th>SO</th><th>IP</th></tr></thead>
                  <tbody>
                    {scans.map((s) => (
                      <tr key={s.id}>
                        <td>{s.id}</td>
                        <td>{new Date(s.scanned_at).toLocaleString('pt-BR')}</td>
                        <td><span className={`device-tag ${s.is_mobile ? 'mobile' : s.is_tablet ? 'tablet' : 'desktop'}`}>{s.is_mobile ? 'Mobile' : s.is_tablet ? 'Tablet' : 'Desktop'}</span></td>
                        <td>{s.browser || '-'}</td>
                        <td>{s.os || '-'}</td>
                        <td>{s.ip || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {activeTab === 'devices' && (
                <div className="metrics-grid">
                  {['mobile', 'tablet', 'desktop'].map((d) => (
                    <div className="metric-bar" key={d}>
                      <span className="metric-label">{d.charAt(0).toUpperCase() + d.slice(1)}</span>
                      <div className="bar-bg"><div className="bar-fill" style={{ width: `${analytics?.total_scans ? (analytics.by_device[d] / analytics.total_scans) * 100 : 0}%` }} /></div>
                      <span className="metric-value">{analytics?.by_device[d] || 0}</span>
                    </div>
                  ))}
                </div>
              )}
              {activeTab === 'browsers' && (
                <div className="metrics-grid">
                  {(analytics?.by_browser || []).map((b) => (
                    <div className="metric-bar" key={b.browser}>
                      <span className="metric-label">{b.browser}</span>
                      <div className="bar-bg"><div className="bar-fill" style={{ width: `${analytics?.total_scans ? (b.count / analytics.total_scans) * 100 : 0}%` }} /></div>
                      <span className="metric-value">{b.count}</span>
                    </div>
                  ))}
                  {analytics?.by_browser?.length === 0 && <p className="empty">Sem dados.</p>}
                </div>
              )}
              {activeTab === 'os' && (
                <div className="metrics-grid">
                  {(analytics?.by_os || []).map((o) => (
                    <div className="metric-bar" key={o.os}>
                      <span className="metric-label">{o.os}</span>
                      <div className="bar-bg"><div className="bar-fill" style={{ width: `${analytics?.total_scans ? (o.count / analytics.total_scans) * 100 : 0}%` }} /></div>
                      <span className="metric-value">{o.count}</span>
                    </div>
                  ))}
                  {analytics?.by_os?.length === 0 && <p className="empty">Sem dados.</p>}
                </div>
              )}
              {activeTab === 'hours' && (
                <div className="hours-grid">
                  {Array.from({ length: 24 }, (_, i) => {
                    const h = analytics?.by_hour?.find((x) => x.hour === i);
                    const c = h?.count || 0;
                    const max = Math.max(...(analytics?.by_hour?.map((x) => x.count) || [1]), 1);
                    return (
                      <div className="hour-item" key={i}>
                        <div className="hour-bar-bg"><div className="hour-bar-fill" style={{ height: `${(c / max) * 100}%` }} /></div>
                        <span className="hour-label">{String(i).padStart(2, '0')}</span>
                        <span className="hour-count">{c}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Dashboard() {
  const { user, logout } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [viewingLink, setViewingLink] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSave = () => {
    setShowForm(false);
    setEditingLink(null);
    setRefreshKey((k) => k + 1);
  };

  const handleDelete = async (link) => {
    if (!confirm(`Excluir link "${link.company_name}"?`)) return;
    try {
      await axios.delete(`${API}/links/${link.id}`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert('Erro ao excluir');
    }
  };

  const handleDownload = async (link) => {
    try {
      const res = await axios.get(`${API}/qr/${link.id}/png`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'image/png' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${link.company_name.replace(/\s+/g, '-').toLowerCase()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Erro ao baixar QR Code');
    }
  };

  return (
    <div className="dashboard">
      <header className="dash-header">
        <h1>QR Tracker</h1>
        <div className="dash-user">
          <span>{user?.email}</span>
          <button className="btn-logout" onClick={logout}>Sair</button>
        </div>
      </header>
      <main className="dash-main">
        <div className="dash-actions">
          <button className="btn-primary" onClick={() => setShowForm(true)}>+ Novo Link</button>
        </div>
        <LinksList
          key={refreshKey}
          onView={setViewingLink}
          onEdit={setEditingLink}
          onDelete={handleDelete}
          onDownload={handleDownload}
        />
      </main>
      {showForm && <LinkFormModal onSave={handleSave} onClose={() => setShowForm(false)} />}
      {editingLink && <LinkFormModal link={editingLink} onSave={handleSave} onClose={() => setEditingLink(null)} />}
      {viewingLink && <LinkDetailsModal link={viewingLink} onClose={() => setViewingLink(null)} onBack={() => setViewingLink(null)} />}
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
