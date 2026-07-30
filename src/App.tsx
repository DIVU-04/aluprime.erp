import {
  Activity,
  BarChart3,
  Bell,
  Boxes,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Factory,
  FileText,
  HelpCircle,
  Home,
  Layers3,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  PackageCheck,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sun,
  TrendingUp,
  Truck,
  UserRound,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react'

type ModuleId =
  | 'dashboard'
  | 'leads'
  | 'quotations'
  | 'projects'
  | 'inventory'
  | 'production'
  | 'dispatch'
  | 'reports'
  | 'settings'

type RecordRow = {
  id: string
  name: string
  secondary: string
  owner: string
  status: string
  value: string
  date: string
  meta?: string
}

type ModuleConfig = {
  label: string
  eyebrow: string
  description: string
  icon: typeof Home
  action: string
  columns: [string, string, string, string, string]
}

const modules: Record<ModuleId, ModuleConfig> = {
  dashboard: {
    label: 'Overview',
    eyebrow: 'Workspace',
    description: 'Your business at a glance',
    icon: Home,
    action: 'Quick add',
    columns: ['Project', 'Client', 'Owner', 'Status', 'Value'],
  },
  leads: {
    label: 'Leads & CRM',
    eyebrow: 'Sales',
    description: 'Capture, qualify and convert opportunities',
    icon: Users,
    action: 'Add lead',
    columns: ['Lead', 'Company', 'Sales owner', 'Stage', 'Est. value'],
  },
  quotations: {
    label: 'Quotations',
    eyebrow: 'Sales',
    description: 'Create and track customer proposals',
    icon: FileText,
    action: 'New quotation',
    columns: ['Quotation', 'Customer', 'Prepared by', 'Status', 'Amount'],
  },
  projects: {
    label: 'Projects',
    eyebrow: 'Operations',
    description: 'Manage every job from survey to handover',
    icon: BriefcaseBusiness,
    action: 'New project',
    columns: ['Project', 'Customer', 'Project manager', 'Status', 'Value'],
  },
  inventory: {
    label: 'Inventory',
    eyebrow: 'Supply chain',
    description: 'Profiles, glass, hardware and consumables',
    icon: Boxes,
    action: 'Add stock item',
    columns: ['Item', 'Category', 'Location', 'Stock status', 'On hand'],
  },
  production: {
    label: 'Production',
    eyebrow: 'Manufacturing',
    description: 'Plan batches and monitor the shop floor',
    icon: Factory,
    action: 'Create batch',
    columns: ['Batch', 'Project', 'Supervisor', 'Stage', 'Progress'],
  },
  dispatch: {
    label: 'Dispatch',
    eyebrow: 'Logistics',
    description: 'Plan deliveries and installation handovers',
    icon: Truck,
    action: 'Plan dispatch',
    columns: ['Dispatch', 'Destination', 'Driver', 'Status', 'Units'],
  },
  reports: {
    label: 'Reports',
    eyebrow: 'Insights',
    description: 'Performance and operational analytics',
    icon: BarChart3,
    action: 'Export report',
    columns: ['Report', 'Period', 'Owner', 'Status', 'Metric'],
  },
  settings: {
    label: 'Settings',
    eyebrow: 'Administration',
    description: 'Workspace preferences and access',
    icon: Settings,
    action: 'Save changes',
    columns: ['Setting', 'Detail', 'Owner', 'Status', 'Value'],
  },
}

const seedData: Record<Exclude<ModuleId, 'dashboard' | 'reports' | 'settings'>, RecordRow[]> = {
  leads: [
    { id: 'LD-1084', name: 'Coastal Villas Phase II', secondary: 'Meridian Developers', owner: 'Maya Rao', status: 'Qualified', value: '₹24.8L', date: 'Today, 10:42', meta: '74 windows' },
    { id: 'LD-1083', name: 'Orchid Corporate Tower', secondary: 'Horizon Buildtech', owner: 'Vikram Shah', status: 'Proposal', value: '₹18.4L', date: 'Today, 09:15', meta: 'Commercial' },
    { id: 'LD-1082', name: 'Palm Grove Residences', secondary: 'Urban Nest', owner: 'Arjun Mehta', status: 'New', value: '₹9.6L', date: 'Yesterday', meta: '32 windows' },
    { id: 'LD-1081', name: 'Asteria Hotel Renovation', secondary: 'Staywell Group', owner: 'Maya Rao', status: 'Negotiation', value: '₹31.2L', date: '28 Jul 2026', meta: 'Hospitality' },
    { id: 'LD-1080', name: 'Skyline Sample Apartment', secondary: 'Northstar Realty', owner: 'Neha Iyer', status: 'Site visit', value: '₹4.2L', date: '27 Jul 2026', meta: '12 windows' },
  ],
  quotations: [
    { id: 'QT-2026-184', name: 'Coastal Villas — Type A', secondary: 'Meridian Developers', owner: 'Maya Rao', status: 'Sent', value: '₹12.46L', date: '30 Jul 2026', meta: 'Rev 02' },
    { id: 'QT-2026-183', name: 'Orchid Tower — Façade', secondary: 'Horizon Buildtech', owner: 'Vikram Shah', status: 'Draft', value: '₹18.38L', date: '30 Jul 2026', meta: 'Rev 01' },
    { id: 'QT-2026-179', name: 'Asteria Hotel — Rooms', secondary: 'Staywell Group', owner: 'Maya Rao', status: 'Approved', value: '₹28.74L', date: '26 Jul 2026', meta: 'Rev 04' },
    { id: 'QT-2026-175', name: 'Maple Homes — Tower C', secondary: 'Maple Housing', owner: 'Arjun Mehta', status: 'Expired', value: '₹8.92L', date: '22 Jul 2026', meta: 'Rev 01' },
    { id: 'QT-2026-171', name: 'Lakeside Clubhouse', secondary: 'Greenscape Living', owner: 'Neha Iyer', status: 'Approved', value: '₹6.35L', date: '18 Jul 2026', meta: 'Rev 03' },
  ],
  projects: [
    { id: 'PRJ-0428', name: 'Asteria Hotel Renovation', secondary: 'Staywell Group', owner: 'Rohan Kapoor', status: 'In production', value: '₹28.74L', date: 'Due 12 Aug', meta: '128 units' },
    { id: 'PRJ-0427', name: 'Lakeside Clubhouse', secondary: 'Greenscape Living', owner: 'Sana Khan', status: 'Survey', value: '₹6.35L', date: 'Due 18 Aug', meta: '42 units' },
    { id: 'PRJ-0426', name: 'Nova Business Park', secondary: 'Axis Infrastructure', owner: 'Rohan Kapoor', status: 'Installation', value: '₹42.10L', date: 'Due 03 Aug', meta: '214 units' },
    { id: 'PRJ-0424', name: 'Maple Homes — Tower B', secondary: 'Maple Housing', owner: 'Sana Khan', status: 'Design', value: '₹19.82L', date: 'Due 28 Aug', meta: '96 units' },
    { id: 'PRJ-0421', name: 'Solace Private Residence', secondary: 'Amara Estates', owner: 'Dev Patel', status: 'Completed', value: '₹5.42L', date: '24 Jul 2026', meta: '28 units' },
  ],
  inventory: [
    { id: 'AL-PRO-101', name: 'AP 45 Casement Outer Frame', secondary: 'Aluminium profile', owner: 'Rack A-04', status: 'In stock', value: '1,248 m', date: 'Updated 2h ago', meta: 'Silver anodized' },
    { id: 'GL-CLR-006', name: '6mm Clear Toughened Glass', secondary: 'Glass', owner: 'Glass Bay 02', status: 'Low stock', value: '184 m²', date: 'Updated 1h ago', meta: 'Min. 220 m²' },
    { id: 'HW-HND-042', name: 'Premium Casement Handle', secondary: 'Hardware', owner: 'Bin H-18', status: 'In stock', value: '642 pcs', date: '29 Jul 2026', meta: 'Matte black' },
    { id: 'AL-PRO-208', name: 'AP 70 Sliding Interlock', secondary: 'Aluminium profile', owner: 'Rack B-11', status: 'Reorder', value: '82 m', date: 'Updated 4h ago', meta: 'Min. 150 m' },
    { id: 'CON-SIL-011', name: 'Weatherproof Silicone 600ml', secondary: 'Consumable', owner: 'Bin C-07', status: 'In stock', value: '318 pcs', date: '28 Jul 2026', meta: 'Neutral cure' },
  ],
  production: [
    { id: 'BAT-260730-08', name: 'Asteria — Floors 5–6', secondary: 'PRJ-0428', owner: 'Ajay Kumar', status: 'Assembly', value: '72%', date: 'Today, Shift A', meta: '36 units' },
    { id: 'BAT-260730-07', name: 'Nova Park — Block D', secondary: 'PRJ-0426', owner: 'Farah Ali', status: 'Glazing', value: '86%', date: 'Today, Shift A', meta: '42 units' },
    { id: 'BAT-260729-12', name: 'Asteria — Floors 3–4', secondary: 'PRJ-0428', owner: 'Ajay Kumar', status: 'QC', value: '94%', date: 'Started yesterday', meta: '38 units' },
    { id: 'BAT-260729-09', name: 'Maple Tower B — Sample', secondary: 'PRJ-0424', owner: 'Farah Ali', status: 'Cutting', value: '34%', date: 'Started yesterday', meta: '8 units' },
    { id: 'BAT-260728-04', name: 'Nova Park — Block C', secondary: 'PRJ-0426', owner: 'Ajay Kumar', status: 'Completed', value: '100%', date: '28 Jul 2026', meta: '44 units' },
  ],
  dispatch: [
    { id: 'DSP-0742', name: 'Nova Park — Block C', secondary: 'Sector 62, Noida', owner: 'Mahesh / MH12 RX 4481', status: 'In transit', value: '44 units', date: 'ETA 16:30 today', meta: 'Trip 1 of 2' },
    { id: 'DSP-0741', name: 'Asteria — Floors 1–2', secondary: 'Bandra West, Mumbai', owner: 'Rafiq / MH02 AB 1190', status: 'Loading', value: '34 units', date: 'Depart 14:00', meta: 'Priority' },
    { id: 'DSP-0739', name: 'Solace Residence', secondary: 'Alibaug, Maharashtra', owner: 'Mahesh / MH12 RX 4481', status: 'Delivered', value: '28 units', date: '29 Jul 2026', meta: 'POD received' },
    { id: 'DSP-0738', name: 'Lakeside Sample', secondary: 'Whitefield, Bengaluru', owner: 'Southern Logistics', status: 'Scheduled', value: '6 units', date: '01 Aug 2026', meta: 'Fragile' },
  ],
}

const navGroups: { title: string; items: ModuleId[] }[] = [
  { title: 'Workspace', items: ['dashboard'] },
  { title: 'Sales', items: ['leads', 'quotations'] },
  { title: 'Operations', items: ['projects', 'inventory', 'production', 'dispatch'] },
  { title: 'Analytics', items: ['reports'] },
]

const statusClass = (status: string) => {
  const good = ['Approved', 'Completed', 'Delivered', 'In stock']
  const warn = ['Proposal', 'Negotiation', 'Low stock', 'Reorder', 'QC', 'Loading']
  const info = ['Qualified', 'Sent', 'In production', 'Survey', 'Design', 'Assembly', 'Glazing', 'In transit']
  if (good.includes(status)) return 'good'
  if (warn.includes(status)) return 'warn'
  if (info.includes(status)) return 'info'
  return 'neutral'
}

const parseAmount = (value: string) => {
  const number = Number(value.replace(/[^\d.]/g, ''))
  return value.includes('L') ? number : 0
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`}>
      <div className="brand-mark">
        <span />
        <span />
      </div>
      {!compact && (
        <div>
          <strong>AluPrime</strong>
          <small>ERP CLOUD</small>
        </div>
      )}
    </div>
  )
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('demo@aluprime.com')
  const [password, setPassword] = useState('demo123')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!email || !password) return
    setLoading(true)
    window.setTimeout(onLogin, 500)
  }

  return (
    <main className="login-page">
      <div className="login-grid" />
      <div className="login-orb login-orb-one" />
      <div className="login-orb login-orb-two" />
      <section className="login-story">
        <Brand />
        <div className="story-copy">
          <span className="pill pill-light"><Sparkles size={14} /> Built for fenestration teams</span>
          <h1>One clear view of your entire operation.</h1>
          <p>Connect sales, design, inventory, production and installation in a workspace your whole team can use.</p>
          <div className="story-metrics">
            <div><strong>28%</strong><span>Faster quoting</span></div>
            <div><strong>99.2%</strong><span>Stock accuracy</span></div>
            <div><strong>4.8×</strong><span>Team visibility</span></div>
          </div>
        </div>
        <p className="copyright">© 2026 AluPrime Systems</p>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={submit}>
          <div className="mobile-brand"><Brand /></div>
          <div className="login-heading">
            <span className="eyebrow">Welcome back</span>
            <h2>Sign in to your workspace</h2>
            <p>Continue to AluPrime ERP Cloud.</p>
          </div>
          <label>
            Email address
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
          </label>
          <label>
            <span className="label-row"><span>Password</span><button type="button">Forgot password?</button></span>
            <div className="password-field">
              <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button>
            </div>
          </label>
          <label className="check-row">
            <input type="checkbox" defaultChecked />
            <span>Keep me signed in</span>
          </label>
          <button className="primary-button login-button" type="submit" disabled={loading}>
            {loading ? <><span className="spinner" /> Signing in…</> : <>Sign in <ChevronRight size={17} /></>}
          </button>
          <div className="demo-note">
            <Check size={15} />
            <span>Demo access is pre-filled — just select <strong>Sign in</strong>.</span>
          </div>
        </form>
      </section>
    </main>
  )
}

function StatCard({
  icon,
  label,
  value,
  trend,
  accent,
}: {
  icon: ReactNode
  label: string
  value: string
  trend: string
  accent: string
}) {
  return (
    <article className="stat-card">
      <div className={`stat-icon ${accent}`}>{icon}</div>
      <div className="stat-top"><span>{label}</span><MoreHorizontal size={18} /></div>
      <strong>{value}</strong>
      <small><TrendingUp size={13} /> {trend} <span>vs last month</span></small>
    </article>
  )
}

function Dashboard({ goTo }: { goTo: (module: ModuleId) => void }) {
  const recent = seedData.projects.slice(0, 4)
  return (
    <div className="dashboard-content">
      <div className="stats-grid">
        <StatCard icon={<CircleDollarSign />} label="Revenue this month" value="₹86.4L" trend="12.4%" accent="violet" />
        <StatCard icon={<WalletCards />} label="Open quotations" value="₹42.7L" trend="8.1%" accent="blue" />
        <StatCard icon={<BriefcaseBusiness />} label="Active projects" value="24" trend="4.6%" accent="orange" />
        <StatCard icon={<Factory />} label="Units in production" value="186" trend="16.2%" accent="green" />
      </div>

      <div className="dashboard-grid">
        <section className="panel revenue-panel">
          <div className="panel-heading">
            <div><h3>Revenue overview</h3><p>Quotation value vs confirmed orders</p></div>
            <button className="select-button">Last 6 months <ChevronDown size={15} /></button>
          </div>
          <div className="chart-summary">
            <div><span>Total confirmed</span><strong>₹3.84Cr</strong></div>
            <span className="chart-up"><TrendingUp size={14} /> 14.8%</span>
          </div>
          <div className="bar-chart" aria-label="Revenue chart">
            {[42, 54, 46, 69, 63, 84].map((height, index) => (
              <div className="bar-group" key={height + index}>
                <div className="bars">
                  <i style={{ height: `${height * 0.72}%` }} />
                  <i style={{ height: `${height}%` }} />
                </div>
                <span>{['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'][index]}</span>
              </div>
            ))}
          </div>
          <div className="chart-legend"><span><i className="legend-quoted" /> Quoted</span><span><i className="legend-confirmed" /> Confirmed</span></div>
        </section>

        <section className="panel pipeline-panel">
          <div className="panel-heading">
            <div><h3>Sales pipeline</h3><p>₹64.2L weighted value</p></div>
            <button className="icon-button" onClick={() => goTo('leads')}><ChevronRight size={18} /></button>
          </div>
          <div className="pipeline-list">
            {[
              ['New leads', 18, '₹14.6L', 76, 'blue'],
              ['Qualified', 12, '₹21.4L', 62, 'violet'],
              ['Proposal', 8, '₹18.2L', 45, 'orange'],
              ['Negotiation', 5, '₹10.0L', 31, 'green'],
            ].map(([name, count, value, width, color]) => (
              <div className="pipeline-row" key={String(name)}>
                <div><span>{name}</span><strong>{count}</strong></div>
                <div className="progress-track"><i className={String(color)} style={{ width: `${width}%` }} /></div>
                <small>{value}</small>
              </div>
            ))}
          </div>
          <button className="text-button" onClick={() => goTo('leads')}>View complete pipeline <ChevronRight size={15} /></button>
        </section>
      </div>

      <div className="dashboard-grid bottom-grid">
        <section className="panel projects-panel">
          <div className="panel-heading">
            <div><h3>Active projects</h3><p>Jobs requiring your attention</p></div>
            <button className="text-button" onClick={() => goTo('projects')}>View all <ChevronRight size={15} /></button>
          </div>
          <div className="compact-table">
            {recent.map((row, index) => (
              <button key={row.id} onClick={() => goTo('projects')}>
                <span className={`project-monogram mono-${index}`}>{row.secondary.charAt(0)}</span>
                <span className="compact-main"><strong>{row.name}</strong><small>{row.id} · {row.meta}</small></span>
                <span className={`status ${statusClass(row.status)}`}><i />{row.status}</span>
                <span className="due-date"><CalendarDays size={14} />{row.date.replace('Due ', '')}</span>
                <ChevronRight size={16} />
              </button>
            ))}
          </div>
        </section>

        <section className="panel activity-panel">
          <div className="panel-heading"><div><h3>Recent activity</h3><p>Updates across your team</p></div></div>
          <div className="activity-list">
            {[
              ['MR', 'Maya sent quotation QT-2026-184', 'to Meridian Developers', '12 min ago', 'violet'],
              ['AK', 'Batch BAT-260729-12 moved to QC', 'by Ajay Kumar', '38 min ago', 'blue'],
              ['SK', 'Site survey completed', 'Lakeside Clubhouse', '1 hr ago', 'orange'],
              ['DP', 'Dispatch DSP-0739 delivered', 'POD uploaded', '3 hrs ago', 'green'],
            ].map(([initials, title, detail, time, color]) => (
              <div className="activity-item" key={title}>
                <span className={`avatar ${color}`}>{initials}</span>
                <div><strong>{title}</strong><span>{detail}</span></div>
                <time>{time}</time>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function DataModule({
  module,
  rows,
  search,
}: {
  module: Exclude<ModuleId, 'dashboard' | 'reports' | 'settings'>
  rows: RecordRow[]
  search: string
}) {
  const config = modules[module]
  const filtered = rows.filter((row) => Object.values(row).some((value) => value?.toLowerCase().includes(search.toLowerCase())))
  return (
    <section className="panel data-panel">
      <div className="table-toolbar">
        <div className="filter-tabs">
          <button className="active">All <span>{rows.length}</span></button>
          <button>Active</button>
          <button>Needs attention</button>
          <button>Completed</button>
        </div>
        <button className="filter-button"><Layers3 size={15} /> Filter <ChevronDown size={14} /></button>
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th><input type="checkbox" aria-label="Select all" /></th>
              {config.columns.map((column) => <th key={column}>{column}</th>)}
              <th>Updated</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, index) => (
              <tr key={row.id}>
                <td><input type="checkbox" aria-label={`Select ${row.name}`} /></td>
                <td>
                  <div className="record-title">
                    <span className={`record-icon record-${index % 4}`}>{module === 'inventory' ? <Boxes /> : module === 'production' ? <Factory /> : module === 'dispatch' ? <Truck /> : <FileText />}</span>
                    <div><strong>{row.name}</strong><small>{row.id} · {row.meta}</small></div>
                  </div>
                </td>
                <td>{row.secondary}</td>
                <td>{row.owner}</td>
                <td><span className={`status ${statusClass(row.status)}`}><i />{row.status}</span></td>
                <td><strong>{row.value}</strong></td>
                <td><span className="muted-date">{row.date}</span></td>
                <td><button className="icon-button"><MoreHorizontal size={18} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="empty-state"><Search size={30} /><h3>No matching records</h3><p>Try a different search term.</p></div>}
      </div>
      <div className="table-footer">
        <span>Showing {filtered.length} of {rows.length} records</span>
        <div><button disabled>Previous</button><button className="active">1</button><button>Next</button></div>
      </div>
    </section>
  )
}

function Reports() {
  const bars = [48, 66, 54, 82, 74, 92, 85]
  return (
    <div className="reports-grid">
      <section className="panel report-hero">
        <div className="panel-heading">
          <div><h3>Order performance</h3><p>Monthly confirmed revenue</p></div>
          <button className="select-button">FY 2026–27 <ChevronDown size={15} /></button>
        </div>
        <div className="report-value"><span>Confirmed order value</span><strong>₹3.84Cr</strong><small><TrendingUp size={14} /> 14.8% growth</small></div>
        <div className="report-bars">
          {bars.map((height, index) => <div key={height + index}><i style={{ height: `${height}%` }} /><span>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'][index]}</span></div>)}
        </div>
      </section>
      <section className="panel report-card">
        <div className="panel-heading"><div><h3>Project health</h3><p>Across 24 active projects</p></div></div>
        <div className="donut"><div><strong>87%</strong><span>On track</span></div></div>
        <div className="health-legend">
          <span><i className="green-dot" />On track <strong>21</strong></span>
          <span><i className="orange-dot" />At risk <strong>2</strong></span>
          <span><i className="red-dot" />Delayed <strong>1</strong></span>
        </div>
      </section>
      {[
        ['Sales conversion', '34.8%', '+5.2%', <TrendingUp />],
        ['On-time production', '91.2%', '+2.8%', <Factory />],
        ['Inventory turns', '6.4×', '+0.6×', <Boxes />],
        ['First-pass quality', '97.6%', '+1.1%', <ClipboardCheck />],
      ].map(([label, value, trend, icon]) => (
        <section className="panel mini-report" key={String(label)}>
          <span className="mini-report-icon">{icon}</span><p>{label}</p><strong>{value}</strong><small>{trend} this period</small>
        </section>
      ))}
    </div>
  )
}

function SettingsPage({ dark, setDark }: { dark: boolean; setDark: (dark: boolean) => void }) {
  return (
    <div className="settings-grid">
      <section className="panel settings-menu">
        <button className="active"><Building2 />Organization<ChevronRight /></button>
        <button><UserRound />Profile<ChevronRight /></button>
        <button><Users />Team & roles<ChevronRight /></button>
        <button><Bell />Notifications<ChevronRight /></button>
        <button><Settings />Integrations<ChevronRight /></button>
      </section>
      <section className="panel settings-form">
        <div className="panel-heading"><div><h3>Organization details</h3><p>Information shown on quotations and reports</p></div></div>
        <div className="form-grid">
          <label className="wide">Organization name<input defaultValue="AluPrime Windows & Façades" /></label>
          <label>Business email<input defaultValue="hello@aluprime.com" /></label>
          <label>Phone number<input defaultValue="+91 22 4872 1900" /></label>
          <label>GSTIN<input defaultValue="27AAECA1024F1ZP" /></label>
          <label>Currency<select defaultValue="INR"><option value="INR">INR — Indian Rupee</option><option value="USD">USD — US Dollar</option></select></label>
          <label className="wide">Registered address<textarea defaultValue="Unit 18, Meridian Industrial Estate, Navi Mumbai, Maharashtra 400705" /></label>
        </div>
        <div className="setting-toggle">
          <div><strong>Dark mode</strong><span>Use the dark workspace appearance</span></div>
          <button className={dark ? 'toggle active' : 'toggle'} onClick={() => setDark(!dark)}><i /></button>
        </div>
        <div className="settings-actions"><button className="secondary-button">Cancel</button><button className="primary-button">Save changes</button></div>
      </section>
    </div>
  )
}

function AddModal({
  module,
  close,
  add,
}: {
  module: ModuleId
  close: () => void
  add: (row: RecordRow) => void
}) {
  const config = modules[module]
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    add({
      id: `${module.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      name: String(data.get('name')),
      secondary: String(data.get('customer')),
      owner: String(data.get('owner')),
      status: 'New',
      value: String(data.get('value')),
      date: 'Just now',
      meta: 'New record',
    })
  }
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}>
      <form className="modal" onSubmit={submit}>
        <div className="modal-heading">
          <div><span className="eyebrow">{config.eyebrow}</span><h2>{config.action}</h2></div>
          <button type="button" className="icon-button" onClick={close}><X /></button>
        </div>
        <label>Name<input name="name" placeholder={`Enter ${config.label.toLowerCase()} name`} required autoFocus /></label>
        <div className="form-grid">
          <label>Customer / project<input name="customer" placeholder="Select or enter" required /></label>
          <label>Owner<input name="owner" defaultValue="Maya Rao" required /></label>
          <label>Estimated value<input name="value" placeholder="₹0.00L" required /></label>
          <label>Target date<input type="date" required /></label>
        </div>
        <label>Notes<textarea placeholder="Add relevant details for your team…" /></label>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={close}>Cancel</button><button className="primary-button" type="submit">Create record</button></div>
      </form>
    </div>
  )
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(() => localStorage.getItem('aluprime-auth') === 'true')
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard')
  const [mobileNav, setMobileNav] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [dark, setDark] = useState(() => localStorage.getItem('aluprime-theme') === 'dark')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [notifications, setNotifications] = useState(false)
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('aluprime-data')
    return saved ? JSON.parse(saved) as typeof seedData : seedData
  })

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    localStorage.setItem('aluprime-theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => localStorage.setItem('aluprime-data', JSON.stringify(data)), [data])

  const config = modules[activeModule]
  const totalPipeline = useMemo(
    () => data.leads.reduce((total, lead) => total + parseAmount(lead.value), 0).toFixed(1),
    [data.leads],
  )

  const login = () => {
    localStorage.setItem('aluprime-auth', 'true')
    setAuthenticated(true)
  }
  const logout = () => {
    localStorage.removeItem('aluprime-auth')
    setAuthenticated(false)
  }
  const navigate = (module: ModuleId) => {
    setActiveModule(module)
    setSearch('')
    setMobileNav(false)
  }
  const addRecord = (row: RecordRow) => {
    if (activeModule !== 'dashboard' && activeModule !== 'reports' && activeModule !== 'settings') {
      setData({ ...data, [activeModule]: [row, ...data[activeModule]] })
      setToast(`${row.name} was created`)
      window.setTimeout(() => setToast(''), 2800)
    }
    setModalOpen(false)
  }

  if (!authenticated) return <Login onLogin={login} />

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand">
          <Brand compact={collapsed} />
          <button className="mobile-close" onClick={() => setMobileNav(false)}><X /></button>
        </div>
        <nav>
          {navGroups.map((group) => (
            <div className="nav-group" key={group.title}>
              {!collapsed && <span className="nav-heading">{group.title}</span>}
              {group.items.map((item) => {
                const Icon = modules[item].icon
                return (
                  <button className={activeModule === item ? 'active' : ''} onClick={() => navigate(item)} key={item} title={modules[item].label}>
                    <Icon /><span>{modules[item].label}</span>
                    {item === 'leads' && <em>{data.leads.length}</em>}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button onClick={() => navigate('settings')} className={activeModule === 'settings' ? 'active' : ''}><Settings /><span>Settings</span></button>
          <button><HelpCircle /><span>Help & support</span></button>
          <div className="sidebar-profile">
            <span className="avatar violet">MR</span>
            {!collapsed && <div><strong>Maya Rao</strong><small>Sales administrator</small></div>}
            {!collapsed && <button onClick={logout} title="Sign out"><LogOut /></button>}
          </div>
        </div>
        <button className="collapse-button" onClick={() => setCollapsed(!collapsed)}><ChevronRight /></button>
      </aside>
      {mobileNav && <button className="mobile-overlay" aria-label="Close menu" onClick={() => setMobileNav(false)} />}

      <main className="main-content">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileNav(true)}><Menu /></button>
          <div className="global-search">
            <Search />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects, quotations, customers…" />
            <kbd>⌘ K</kbd>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={() => setDark(!dark)} title="Toggle theme">{dark ? <Sun /> : <Moon />}</button>
            <button className="icon-button notification-button" onClick={() => setNotifications(!notifications)}><Bell /><i /></button>
            <div className="topbar-divider" />
            <button className="org-switcher"><span className="org-icon">AP</span><span><strong>AluPrime</strong><small>Mumbai HQ</small></span><ChevronDown /></button>
          </div>
          {notifications && (
            <div className="notifications-popover">
              <div><h3>Notifications</h3><button onClick={() => setNotifications(false)}><X /></button></div>
              <button><span className="notice-icon blue"><FileText /></span><span><strong>Quotation approved</strong><small>QT-2026-179 · Asteria Hotel</small><time>12m</time></span></button>
              <button><span className="notice-icon orange"><Boxes /></span><span><strong>Low stock alert</strong><small>6mm Clear Toughened Glass</small><time>1h</time></span></button>
              <button><span className="notice-icon green"><PackageCheck /></span><span><strong>Dispatch delivered</strong><small>DSP-0739 · POD received</small><time>3h</time></span></button>
              <a>View all notifications</a>
            </div>
          )}
        </header>

        <div className="page">
          <div className="page-heading">
            <div>
              <span className="eyebrow">{config.eyebrow}</span>
              <h1>{activeModule === 'dashboard' ? 'Good afternoon, Maya' : config.label}</h1>
              <p>{activeModule === 'dashboard' ? `Here’s what’s happening today. Your pipeline is worth ₹${totalPipeline}L.` : config.description}</p>
            </div>
            <div className="heading-actions">
              <button className="secondary-button"><CalendarDays /> Today, 30 Jul</button>
              {activeModule !== 'settings' && (
                <button className="primary-button" onClick={() => activeModule === 'reports' ? setToast('Report exported successfully') : setModalOpen(true)}>
                  {activeModule === 'reports' ? <BarChart3 /> : <Plus />}{config.action}
                </button>
              )}
            </div>
          </div>

          {activeModule === 'dashboard' && <Dashboard goTo={navigate} />}
          {activeModule !== 'dashboard' && activeModule !== 'reports' && activeModule !== 'settings' && (
            <DataModule module={activeModule} rows={data[activeModule]} search={search} />
          )}
          {activeModule === 'reports' && <Reports />}
          {activeModule === 'settings' && <SettingsPage dark={dark} setDark={setDark} />}
        </div>
      </main>
      {modalOpen && <AddModal module={activeModule} close={() => setModalOpen(false)} add={addRecord} />}
      {toast && <div className="toast"><Check />{toast}</div>}
    </div>
  )
}
