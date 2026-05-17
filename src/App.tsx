import { ChangeEvent, FormEvent, ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  Bot,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Clock3,
  CreditCard,
  Filter,
  Headset,
  LayoutDashboard,
  LifeBuoy,
  LineChart,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MoreHorizontal,
  Phone,
  ReceiptText,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Wallet,
  Workflow,
  FolderOpen,
  Target,
  User,
  Users,
  X,
  ChevronDown,
} from "lucide-react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { cn } from "./utils/cn";

type UserRole = "client" | "admin";
type TicketStatus = "Open" | "In Progress" | "Resolved";
type LeadStage = "New Lead" | "Contacted" | "Consultation Booked" | "Proposal Sent" | "Closed";

type UserType = {
  id: string;
  memberCode: string;
  fullName: string;
  email: string;
  password: string;
  company: string;
  role: UserRole;
  avatar?: string | null;
  createdAt: string;
};

type TicketUpdate = {
  by: string;
  role: UserRole;
  message: string;
  createdAt: string;
};

type Ticket = {
  id: string;
  userId: string;
  subject: string;
  category: "Service Request" | "Support";
  priority: "Low" | "Medium" | "High";
  message: string;
  status: TicketStatus;
  createdAt: string;
  updates: TicketUpdate[];
};

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  staffSize: string;
  usesMicrosoft365: "Yes" | "No" | "Not sure";
  needs: string[];
  budgetRange: string;
  urgency: "ASAP" | "This week" | "Just exploring";
  focus: string;
  message: string;
  stage: LeadStage;
  owner: string;
  createdAt: string;
};

type ServiceItem = {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
};

type PlatformState = {
  users: UserType[];
  tickets: Ticket[];
  leads: Lead[];
  services: ServiceItem[];
};

type Session = {
  userId: string;
  token: string;
  expiresAt: string;
};

type PlatformContextType = {
  state: PlatformState;
  session: Session | null;
  currentUser: UserType | null;
  signup: (payload: { fullName: string; email: string; password: string; company: string }) => string | null;
  login: (email: string, password: string) => UserRole | null;
  logout: () => void;
  resetPassword: (email: string) => boolean;
  createTicket: (payload: {
    subject: string;
    category: "Service Request" | "Support";
    priority: "Low" | "Medium" | "High";
    message: string;
  }) => void;
  updateTicketStatus: (ticketId: string, status: TicketStatus) => void;
  addTicketReply: (ticketId: string, message: string) => void;
  submitLead: (payload: Omit<Lead, "id" | "createdAt">) => void;
  updateLeadPipeline: (leadId: string, payload: { stage: LeadStage; owner: string }) => void;
  updateProfile: (payload: { fullName: string; company: string; avatar?: string | null }) => void;
  updatePassword: (payload: { currentPassword: string; newPassword: string }) => string | null;
  toggleService: (serviceId: string) => void;
};

const STORAGE_KEY = "kollrax-platform-state";
const SESSION_KEY = "kollrax-session";

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

const staggerReveal = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.08 },
  },
};

function createMemberCode() {
  return `K-${Math.floor(10000 + Math.random() * 90000)}`;
}

const seededState: PlatformState = {
  users: [
    {
      id: "admin-1",
      memberCode: "K-53522",
      fullName: "KollraX Admin",
      email: "admin@kollrax.com",
      password: "Admin@123",
      company: "KollraX",
      role: "admin",
      avatar: null,
      createdAt: new Date().toISOString(),
    },
    {
      id: "client-1",
      memberCode: "K-78215",
      fullName: "Elena Watson",
      email: "elena@northbridge.co",
      password: "Client@123",
      company: "Northbridge Partners",
      role: "client",
      avatar: null,
      createdAt: new Date().toISOString(),
    },
  ],
  tickets: [
    {
      id: "TK-1001",
      userId: "client-1",
      subject: "Microsoft 365 migration planning",
      category: "Service Request",
      priority: "High",
      message: "Need a staged migration approach for 140 users across three regions.",
      status: "In Progress",
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      updates: [
        {
          by: "KollraX Admin",
          role: "admin",
          message: "Discovery workshop has been scheduled for Thursday 10:00 AM.",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
        },
      ],
    },
  ],
  leads: [
    {
      id: "LD-3001",
      name: "Riley Henderson",
      email: "riley@altitudebio.io",
      phone: "+234 801 234 5678",
      company: "Altitude Bio",
      staffSize: "51-200",
      usesMicrosoft365: "Yes",
      needs: ["Security", "Ongoing support"],
      budgetRange: "₦2m - ₦5m",
      urgency: "This week",
      focus: "Security and compliance",
      message: "We need compliance hardening and managed support for a regulated team.",
      stage: "Contacted",
      owner: "Collins",
      createdAt: new Date(Date.now() - 259200000).toISOString(),
    },
  ],
  services: [
    {
      id: "starter-plan",
      title: "Starter Plan",
      description: "₦50,000/month for small businesses with basic Microsoft 365 admin and email support.",
      enabled: true,
    },
    {
      id: "business-plan",
      title: "Business Plan",
      description: "₦100,000/month for growing teams that need tenant management, baseline security, and faster support.",
      enabled: true,
    },
    {
      id: "enterprise-plan",
      title: "Enterprise Plan",
      description: "₦250,000/month+ for larger organizations that need compliance, migration support, and priority SLA coverage.",
      enabled: true,
    },
  ],
};

const PlatformContext = createContext<PlatformContextType | undefined>(undefined);

const isoDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function normalizeState(state: PlatformState): PlatformState {
  return {
    ...state,
    users: state.users.map((user) => ({
      ...user,
      memberCode: user.memberCode ?? createMemberCode(),
      avatar: user.avatar ?? null,
    })),
    leads: state.leads.map((lead) => {
      const normalizedLead = lead as Partial<Lead>;
      const needs = Array.isArray(normalizedLead.needs)
        ? normalizedLead.needs
        : [normalizedLead.focus ?? "Setup"].filter(Boolean);

      return {
        ...lead,
        phone: normalizedLead.phone ?? "",
        staffSize: normalizedLead.staffSize ?? "1-10",
        usesMicrosoft365: normalizedLead.usesMicrosoft365 ?? "Not sure",
        needs,
        budgetRange: normalizedLead.budgetRange ?? "Not specified",
        urgency: normalizedLead.urgency ?? "Just exploring",
        focus: normalizedLead.focus ?? needs.join(", "),
        message: normalizedLead.message ?? "",
        stage: normalizedLead.stage ?? "New Lead",
        owner: normalizedLead.owner ?? "Unassigned",
      };
    }),
  };
}

function resizeImageFile(file: File, maxSize = 256) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = maxSize;
        canvas.height = maxSize;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Canvas not supported."));
          return;
        }

        const sourceSize = Math.min(image.width, image.height);
        const sourceX = (image.width - sourceSize) / 2;
        const sourceY = (image.height - sourceSize) / 2;

        context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, maxSize, maxSize);
        resolve(canvas.toDataURL("image/jpeg", 0.86));
      };
      image.onerror = () => reject(new Error("Invalid image file."));
      image.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });
}

function PlatformProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PlatformState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normalizeState(JSON.parse(saved) as PlatformState) : seededState;
  });

  const [session, setSession] = useState<Session | null>(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as Session;
    if (new Date(parsed.expiresAt).getTime() < Date.now()) return null;
    return parsed;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (session) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [session]);

  const currentUser = useMemo(
    () => state.users.find((user) => user.id === session?.userId) ?? null,
    [state.users, session?.userId]
  );

  const signup = (payload: { fullName: string; email: string; password: string; company: string }) => {
    const duplicate = state.users.find((user) => user.email.toLowerCase() === payload.email.toLowerCase());
    if (duplicate) return "An account with this email already exists.";

    const newUser: UserType = {
      id: createId("user"),
      memberCode: createMemberCode(),
      fullName: payload.fullName,
      email: payload.email,
      password: payload.password,
      company: payload.company,
      role: "client",
      avatar: null,
      createdAt: new Date().toISOString(),
    };

    setState((prev) => ({ ...prev, users: [...prev.users, newUser] }));
    setSession({
      userId: newUser.id,
      token: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    return null;
  };

  const login = (email: string, password: string) => {
    const user = state.users.find(
      (item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password
    );
    if (!user) return null;
    setSession({
      userId: user.id,
      token: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    return user.role;
  };

  const logout = () => setSession(null);

  const resetPassword = (email: string) => state.users.some((user) => user.email.toLowerCase() === email.toLowerCase());

  const createTicket = (payload: {
    subject: string;
    category: "Service Request" | "Support";
    priority: "Low" | "Medium" | "High";
    message: string;
  }) => {
    if (!currentUser) return;
    const ticket: Ticket = {
      id: createId("TK"),
      userId: currentUser.id,
      subject: payload.subject,
      category: payload.category,
      priority: payload.priority,
      message: payload.message,
      status: "Open",
      createdAt: new Date().toISOString(),
      updates: [
        {
          by: currentUser.fullName,
          role: currentUser.role,
          message: payload.message,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    setState((prev) => ({ ...prev, tickets: [ticket, ...prev.tickets] }));
  };

  const updateTicketStatus = (ticketId: string, status: TicketStatus) => {
    if (!currentUser) return;
    setState((prev) => ({
      ...prev,
      tickets: prev.tickets.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              status,
              updates: [
                {
                  by: currentUser.fullName,
                  role: currentUser.role,
                  message: `Status changed to ${status}.`,
                  createdAt: new Date().toISOString(),
                },
                ...ticket.updates,
              ],
            }
          : ticket
      ),
    }));
  };

  const addTicketReply = (ticketId: string, message: string) => {
    if (!currentUser) return;
    setState((prev) => ({
      ...prev,
      tickets: prev.tickets.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              updates: [
                {
                  by: currentUser.fullName,
                  role: currentUser.role,
                  message,
                  createdAt: new Date().toISOString(),
                },
                ...ticket.updates,
              ],
            }
          : ticket
      ),
    }));
  };

  const submitLead = (payload: Omit<Lead, "id" | "createdAt">) => {
    setState((prev) => ({
      ...prev,
      leads: [{ ...payload, id: createId("LD"), createdAt: new Date().toISOString() }, ...prev.leads],
    }));
  };

  const updateLeadPipeline = (leadId: string, payload: { stage: LeadStage; owner: string }) => {
    setState((prev) => ({
      ...prev,
      leads: prev.leads.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              stage: payload.stage,
              owner: payload.owner,
            }
          : lead
      ),
    }));
  };

  const updateProfile = (payload: { fullName: string; company: string; avatar?: string | null }) => {
    if (!currentUser) return;
    setState((prev) => ({
      ...prev,
      users: prev.users.map((item) =>
        item.id === currentUser.id
          ? {
              ...item,
              fullName: payload.fullName,
              company: payload.company,
              avatar: payload.avatar === undefined ? item.avatar ?? null : payload.avatar,
            }
          : item
      ),
    }));
  };

  const updatePassword = (payload: { currentPassword: string; newPassword: string }) => {
    if (!currentUser) return "No active user session.";
    if (currentUser.password !== payload.currentPassword) return "Current password is incorrect.";
    if (payload.newPassword.length < 8) return "New password must be at least 8 characters.";
    setState((prev) => ({
      ...prev,
      users: prev.users.map((item) =>
        item.id === currentUser.id ? { ...item, password: payload.newPassword } : item
      ),
    }));
    return null;
  };

  const toggleService = (serviceId: string) => {
    setState((prev) => ({
      ...prev,
      services: prev.services.map((service) =>
        service.id === serviceId ? { ...service, enabled: !service.enabled } : service
      ),
    }));
  };

  return (
    <PlatformContext.Provider
      value={{
        state,
        session,
        currentUser,
        signup,
        login,
        logout,
        resetPassword,
        createTicket,
        updateTicketStatus,
        addTicketReply,
        submitLead,
        updateLeadPipeline,
        updateProfile,
        updatePassword,
        toggleService,
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
}

function usePlatform() {
  const context = useContext(PlatformContext);
  if (!context) throw new Error("usePlatform must be used inside PlatformProvider");
  return context;
}

function AppShell() {
  return (
    <BrowserRouter>
      <PlatformProvider>
        <RouteChangeTracker />
        <Routes>
          <Route path="/" element={<MarketingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/signup" element={<Navigate to="/contact" replace />} />
          <Route path="/auth/recover" element={<RecoverPage />} />
          <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PlatformProvider>
    </BrowserRouter>
  );
}

function RouteChangeTracker() {
  const location = useLocation();

  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "KollraX | Microsoft 365 Business Platform",
      "/contact": "KollraX | Smart Intake",
      "/auth/login": "KollraX | Login",
      "/auth/signup": "KollraX | Smart Intake",
      "/auth/recover": "KollraX | Password Recovery",
      "/dashboard": "KollraX | Admin Control",
      "/admin": "KollraX | Admin Control",
    };
    document.title = titles[location.pathname] ?? "KollraX";
  }, [location.pathname]);

  return null;
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { currentUser } = usePlatform();
  if (!currentUser) return <Navigate to="/auth/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { currentUser } = usePlatform();
  if (!currentUser) return <Navigate to="/auth/login" replace />;
  if (currentUser.role !== "admin") return <Navigate to="/auth/login" replace />;
  return <>{children}</>;
}

function TopNav() {
  const { currentUser, logout } = usePlatform();
  const [open, setOpen] = useState(false);
  const isAdmin = currentUser?.role === "admin";

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#10267d] backdrop-blur-xl">
      <nav className="mx-auto flex h-18 w-full max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <img src="/images/kollrax-logo-site.png" alt="KollraX" className="h-11 w-11 object-contain" />
          <div>
            <span className="block text-lg font-semibold tracking-tight text-white">KollraX</span>
            <span className="hidden text-[10px] uppercase tracking-[0.28em] text-white sm:block">Microsoft 365 Operations</span>
          </div>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <a href="#home" className="text-sm font-medium text-white transition hover:text-white/80">
            Home
          </a>
          <a href="#services" className="text-sm font-medium text-white transition hover:text-white/80">
            Services
          </a>
          <a href="#about" className="text-sm font-medium text-white transition hover:text-white/80">
            About
          </a>
          <a href="#contact" className="text-sm font-medium text-white transition hover:text-white/80">
            Contact
          </a>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {isAdmin ? (
            <>
              <Link
                to="/admin"
                className="rounded-2xl border border-white/20 bg-white/8 px-4 py-2.5 text-sm font-medium text-white hover:border-[#74b4d9]"
              >
                Admin Dashboard
              </Link>
              <button
                onClick={logout}
                className="premium-button-primary rounded-2xl px-4 py-2.5 text-sm font-semibold text-white"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth/login"
                className="rounded-2xl border border-white/20 bg-white/8 px-4 py-2.5 text-sm font-medium text-white hover:border-[#74b4d9]"
              >
                Login
              </Link>
              <Link
                to="/contact"
                className="premium-button-primary rounded-2xl px-4 py-2.5 text-sm font-semibold text-white"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <button className="md:hidden" onClick={() => setOpen((prev) => !prev)} aria-label="Open menu">
          {open ? <X className="h-5 w-5 text-white" /> : <Menu className="h-5 w-5 text-white" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-white/10 bg-[#10267d] px-6 py-5 shadow-[0_20px_40px_rgba(16,54,125,0.18)] md:hidden"
          >
            <div className="flex flex-col gap-4">
              <a href="#home" className="text-sm font-medium text-white">
                Home
              </a>
              <a href="#services" className="text-sm font-medium text-white">
                Services
              </a>
              <a href="#about" className="text-sm font-medium text-white">
                About
              </a>
              <a href="#contact" className="text-sm font-medium text-white">
                Contact
              </a>
              <Link to="/auth/login" className="text-sm font-medium text-white">
                Login
              </Link>
              <Link to="/contact" className="text-sm font-medium text-white">
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function MotionBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(29,129,228,0.12),transparent_24%),radial-gradient(circle_at_85%_12%,rgba(20,102,205,0.1),transparent_22%)]" />
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)", backgroundSize: "96px 96px" }} />
    </div>
  );
}

function MarketingPage() {
  const servicePlans = [
    {
      id: "starter",
      name: "Starter Plan",
      price: "₦50,000/month",
      bestFor: "Small businesses (1-10 users)",
      response: "24-48 hrs",
      includes: [
        "Microsoft 365 basic admin support",
        "Email troubleshooting for Exchange Online",
        "User account setup and management",
        "Password reset support",
        "Basic Teams support",
        "Monthly system health check",
        "Email-only support",
      ],
      excludes: ["Advanced security setup", "Migration projects", "On-site support"],
    },
    {
      id: "business",
      name: "Business Plan",
      price: "₦100,000/month",
      bestFor: "Growing businesses (10-50 users)",
      response: "4-12 hrs",
      includes: [
        "Full Microsoft 365 tenant management",
        "Teams and SharePoint configuration",
        "Security baseline setup including MFA and policies",
        "Device and user onboarding or offboarding",
        "Priority support",
        "Monthly optimization report",
        "Basic staff training",
        "Faster incident troubleshooting",
      ],
      excludes: [],
    },
    {
      id: "enterprise",
      name: "Enterprise Plan",
      price: "₦250,000/month+",
      bestFor: "Large organizations (50+ users)",
      response: "1-2 hrs",
      includes: [
        "Dedicated account manager",
        "Advanced security and compliance configuration",
        "Conditional Access policies",
        "Data loss prevention setup",
        "Advanced threat protection monitoring",
        "Priority SLA support",
        "Quarterly IT strategy review",
        "Full migration support",
        "24/7 critical issue escalation",
      ],
      excludes: [],
    },
  ];
  const addOnServices = [
    "Microsoft 365 migration -> ₦100K-₦500K one-time",
    "Security hardening audit -> ₦75K",
    "Teams or SharePoint setup -> ₦50K-₦150K",
    "One-time troubleshooting -> ₦25K+",
    "Staff training session -> ₦30K-₦100K",
  ];
  const partners = [
    { name: "Microsoft Solutions Partner", logo: "/logos/microsoft-solutions-partner.svg" },
    { name: "Azure Integration Alliance", logo: "/logos/azure-integration-alliance.svg" },
    { name: "SentinelOps Security", logo: "/logos/sentinelops-security.svg" },
    { name: "Purview Governance Labs", logo: "/logos/purview-governance-labs.svg" },
    { name: "CloudRoute Migration Group", logo: "/logos/cloudroute-migration-group.svg" },
    { name: "Teams Collaboration Network", logo: "/logos/teams-collaboration-network.svg" },
    {
      name: "TechEera",
      logo: "/logos/techeera-logo.png",
      tileClassName: "min-w-[300px] px-5 py-4",
      imageClassName: "h-16",
    },
  ];
  const heroMetrics = [
    { label: "Secure Migrations", value: "300+" },
    { label: "Support SLA", value: "< 2h" },
    { label: "Governed Workspaces", value: "24/7" },
  ];
  const solutionPillars = [
    {
      icon: ShieldCheck,
      title: "Security-first governance",
      body: "Identity-aware access policies, compliance layering, and operational guardrails from day one.",
    },
    {
      icon: Cloud,
      title: "Cloud-native delivery",
      body: "Structured migrations, change orchestration, and scalable Microsoft 365 foundations.",
    },
    {
      icon: LifeBuoy,
      title: "Continuous service assurance",
      body: "Managed support, operational visibility, and proactive improvement across the workspace lifecycle.",
    },
  ];

  return (
    <div className="bg-white text-[#103678]">
      <TopNav />

      <section id="home" className="enterprise-section relative overflow-hidden border-b border-[#103678]/10 pt-28">
        <MotionBackdrop />

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="relative mx-auto grid min-h-[calc(100vh-6rem)] max-w-7xl items-center gap-12 px-6 pb-18 lg:grid-cols-[minmax(0,1.05fr)_460px] lg:px-8"
        >
          <div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xs font-semibold uppercase tracking-[0.28em] text-[#74b4d9]"
            >
              Microsoft 365 Delivery and Support
            </motion.p>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.05em] text-[#103678] sm:text-6xl xl:text-[4.1rem]">
              Enterprise Microsoft 365 operations with the clarity of a modern SaaS platform.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#103678]/72 sm:text-lg">
              KollraX helps organizations plan migrations, strengthen governance, and run modern workplace services
              with the structure, visibility, and support expected from an enterprise partner.
            </p>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="mt-10 flex flex-wrap gap-4"
            >
              <Link
                to="/contact"
                className="premium-button-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center rounded-2xl border border-[#103678]/12 bg-white px-6 py-3.5 text-sm font-semibold text-[#103678] hover:border-[#74b4d9]"
              >
                See Intake Flow
              </Link>
            </motion.div>
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {heroMetrics.map((item) => (
                <div key={item.label} className="dashboard-panel rounded-2xl px-5 py-4">
                  <p className="text-2xl font-semibold text-[#103678]">{item.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#103678]/55">{item.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs uppercase tracking-[0.2em] text-[#103678]/48">
              <span>Northbridge Partners</span>
              <span>Meridian Logistics</span>
              <span>Arvon Capital</span>
              <span>Norfield Energy</span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="dashboard-panel relative rounded-[1.75rem] p-6"
          >
            <div className="relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[#74b4d9]">Operating Model</p>
                  <h3 className="mt-3 text-2xl font-semibold text-[#103678]">A structured service experience</h3>
                </div>
                <div className="rounded-full border border-[#103678]/12 bg-[#ebebeb] px-3 py-1 text-xs text-[#103678]">
                  Operational
                </div>
              </div>
              <div className="mt-7 grid gap-4">
                <div className="rounded-xl border border-[#103678]/10 bg-[#ebebeb]/50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[#103678]">Project readiness</p>
                    <p className="text-sm text-[#103678]/62">92%</p>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-[#103678]/10">
                    <div className="h-2 w-[92%] rounded-full bg-[#74b4d9]" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-[#103678]/10 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#74b4d9]">Security posture</p>
                    <p className="mt-3 text-3xl font-semibold text-[#103678]">A+</p>
                    <p className="mt-2 text-sm text-[#103678]/68">Conditional access and policy baselines enforced.</p>
                  </div>
                  <div className="rounded-xl border border-[#103678]/10 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#74b4d9]">Support rhythm</p>
                    <p className="mt-3 text-3xl font-semibold text-[#103678]">24/7</p>
                    <p className="mt-2 text-sm text-[#103678]/68">Managed delivery with clear escalation and reporting.</p>
                  </div>
                </div>
                <div className="rounded-xl border border-[#103678]/10 bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#74b4d9]">Core capabilities</p>
                  <div className="mt-4 space-y-3">
                    {solutionPillars.map((item) => (
                      <div key={item.title} className="flex gap-3 rounded-xl border border-[#103678]/10 bg-[#f8fbfe] p-3">
                        <div className="mt-0.5 rounded-lg bg-[#74b4d9]/18 p-2 text-[#103678]">
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#103678]">{item.title}</p>
                          <p className="mt-1 text-sm text-[#103678]/68">{item.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <section className="enterprise-muted overflow-hidden border-y border-[#103678]/10 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          className="mx-auto max-w-7xl px-6 lg:px-8"
        >
          <p className="text-center text-xs uppercase tracking-[0.25em] text-[#103678]/55">Trusted Industry Partners</p>
          <div className="mt-8 overflow-hidden">
            <motion.div
              className="flex w-max gap-5"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 24, ease: "linear", repeat: Infinity }}
            >
              {[...partners, ...partners].map((partner, index) => (
                <div
                  key={`${partner.name}-${index}`}
                  className={cn(
                    "flex min-w-[260px] items-center justify-center rounded-2xl border border-[#103678]/10 bg-white px-5 py-4 shadow-[0_10px_24px_rgba(16,54,120,0.05)]",
                    partner.tileClassName
                  )}
                >
                  <img
                    src={partner.logo}
                    alt={partner.name}
                    className={cn("h-14 w-auto object-contain", partner.imageClassName)}
                  />
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </section>

      <section id="about" className="enterprise-section py-28 text-[#103678]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          variants={staggerReveal}
          className="mx-auto max-w-7xl px-6 lg:px-8"
        >
          <motion.div variants={fadeInUp} className="mb-12 max-w-3xl">
            <p className="text-xs uppercase tracking-[0.25em] text-[#74b4d9]">About KollraX</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight">What KollraX is</h2>
            <p className="mt-4 text-[#103678]/72">
              KollraX is a premium Microsoft 365 technology partner helping businesses modernize collaboration,
              strengthen security posture, and run cloud operations with confidence.
            </p>
          </motion.div>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-6">
              <motion.div variants={fadeInUp} className="premium-panel rounded-[1.75rem] p-7">
                <p className="text-xs uppercase tracking-[0.2em] text-[#74b4d9]">Mission</p>
                <p className="mt-3 text-lg text-[#103678]/74">
                  To deliver secure and scalable Microsoft 365 environments that improve productivity and reduce
                  operational risk.
                </p>
              </motion.div>
              <motion.div variants={fadeInUp} className="premium-panel rounded-[1.75rem] p-7">
                <p className="text-xs uppercase tracking-[0.2em] text-[#74b4d9]">Vision</p>
                <p className="mt-3 text-lg text-[#103678]/74">
                  To become the most trusted cloud productivity and security partner for growth-focused organizations.
                </p>
              </motion.div>
              <motion.div variants={fadeInUp} className="premium-panel rounded-[1.75rem] p-7">
                <h3 className="text-2xl font-semibold">Why KollraX</h3>
                <div className="mt-4 space-y-3 text-[#103678]/78">
                  <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#74b4d9]" /> Security-led architecture and governance</p>
                  <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#74b4d9]" /> Reliable migration and support delivery model</p>
                  <p className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#74b4d9]" /> Deep Microsoft 365 technical expertise</p>
                </div>
              </motion.div>
            </div>

            <div className="grid gap-6">
              <motion.div variants={fadeInUp} className="overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_26px_70px_rgba(0,0,0,0.3)]">
                <motion.img
                  src="/images/kollrax-operations.jpg"
                  alt="KollraX development and operations team"
                  className="h-full w-full object-cover"
                  whileHover={{ scale: 1.04 }}
                  transition={{ duration: 0.5 }}
                />
              </motion.div>
              <motion.div variants={fadeInUp} className="premium-panel rounded-[1.75rem] p-7">
                <p className="text-xs uppercase tracking-[0.2em] text-[#74b4d9]">Development Team</p>
                <p className="mt-3 text-sm text-[#103678]/72">
                  Our founders and engineers combine cloud architecture, security operations, and change-management
                  expertise to execute enterprise rollouts from planning to managed support.
                </p>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

      <section id="services" className="premium-mesh premium-grid bg-gradient-to-b from-[#ebebeb] to-white py-28 text-[#103678]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerReveal}
          className="mx-auto max-w-7xl px-6 lg:px-8"
        >
          <motion.p variants={fadeInUp} className="text-xs font-semibold uppercase tracking-[0.28em] text-[#74b4d9]">
            Services
          </motion.p>
          <motion.h2 variants={fadeInUp} className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Microsoft 365 service plans built to convert
          </motion.h2>
          <motion.p variants={fadeInUp} className="mt-3 max-w-2xl text-[#103678]/75">
            Clear monthly plans for small, growing, and enterprise teams, with add-ons ready for upsell.
          </motion.p>
          <div className="mt-12 grid gap-6 xl:grid-cols-3">
            {servicePlans.map((plan) => (
              <motion.div
                key={plan.id}
                variants={fadeInUp}
                whileHover={{ y: -6 }}
                className="premium-panel group rounded-[1.75rem] p-7 transition-all hover:-translate-y-1 hover:shadow-[0_26px_54px_rgba(29,139,239,0.18)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#74b4d9]">{plan.bestFor}</p>
                    <h3 className="mt-2 text-xl font-semibold">{plan.name}</h3>
                  </div>
                  <span className="rounded-full border border-[#ebebeb] bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#74b4d9]">
                    {plan.response}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold text-[#103678]">{plan.price}</p>
                <div className="mt-5 space-y-3">
                  {plan.includes.map((item) => (
                    <div key={item} className="flex gap-3 rounded-xl border border-[#103678]/10 bg-[#f8fbfe] p-3">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#74b4d9]" />
                      <p className="text-sm text-[#103678]/78">{item}</p>
                    </div>
                  ))}
                </div>
                {plan.excludes.length > 0 && (
                  <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Not included</p>
                    <div className="mt-2 space-y-2">
                      {plan.excludes.map((item) => (
                        <p key={item} className="text-sm text-amber-800/88">{item}</p>
                      ))}
                    </div>
                  </div>
                )}
                <Link
                  to="/contact"
                  className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#103678] transition group-hover:gap-3 group-hover:text-[#74b4d9]"
                >
                  Start with this plan <ChevronRight className="h-4 w-4" />
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.div variants={fadeInUp} className="premium-panel mt-8 rounded-[1.9rem] p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#74b4d9]">Add-On Services</p>
                <h3 className="mt-3 text-2xl font-semibold">Extra revenue streams for upsell</h3>
                <p className="mt-2 max-w-2xl text-sm text-[#103678]/72">
                  Use these as one-time project upgrades after qualification or during ongoing support conversations.
                </p>
              </div>
              <span className="rounded-full border border-[#103678]/10 bg-[#f7fbff] px-4 py-2 text-sm font-medium text-[#103678]">
                Upsell-ready offers
              </span>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {addOnServices.map((item) => (
                <div key={item} className="rounded-[1.2rem] border border-[#103678]/10 bg-white px-4 py-4 text-sm text-[#103678]/82 shadow-[0_10px_24px_rgba(16,54,120,0.05)]">
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      <section className="relative overflow-hidden bg-[#ebebeb] py-28 text-[#103678]">
        <motion.div
          className="pointer-events-none absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-[#74b4d9]/20 blur-3xl"
          animate={{ opacity: [0.35, 0.55, 0.35] }}
          transition={{ repeat: Infinity, duration: 6 }}
        />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2 lg:px-8"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#74b4d9]">Reliability Architecture</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Built for enterprise reliability from day one</h2>
            <p className="mt-4 text-[#103678]/75">
              KollraX combines migration expertise, layered security controls, and managed operations to keep your
              organization stable while it scales.
            </p>
          </div>
          <div className="space-y-6">
            {[
              { icon: ShieldCheck, title: "Security first", body: "Identity-led controls, conditional access, and compliance by design." },
              { icon: Cloud, title: "Cloud-native delivery", body: "Structured deployments and modern automation for operational consistency." },
              { icon: LifeBuoy, title: "Managed continuity", body: "Service desk support and proactive monitoring for business uptime." },
            ].map((item) => (
                <div key={item.title} className="premium-panel flex items-start gap-4 rounded-[1.5rem] p-5">
                <div className="rounded-2xl bg-[#74b4d9]/18 p-3 text-[#103678]">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-sm text-[#103678]/75">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <section id="testimonials" className="bg-gradient-to-b from-[#103678] via-[#103678] to-[#0f326f] py-28">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="mx-auto max-w-7xl px-6 lg:px-8"
        >
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Trusted by growth-stage and enterprise teams</h2>
          <p className="mt-4 max-w-2xl text-[#ebebeb]">
            Long-term partnerships built on consistent response quality, secure execution, and measurable business outcomes.
          </p>
          <div className="mt-14 grid gap-10 lg:grid-cols-3">
            {[
              {
                quote:
                  "KollraX made our Microsoft 365 migration predictable and secure. We moved 300+ users with no major downtime.",
                author: "CTO, Meridian Logistics",
              },
              {
                quote:
                  "Their support model feels like an extension of our internal IT organization. Response quality is consistently high.",
                author: "Operations Director, Arvon Capital",
              },
              {
                quote:
                  "From Teams governance to compliance controls, KollraX gave us a platform we can trust under pressure.",
                author: "Head of Technology, Norfield Energy",
              },
            ].map((item, index) => (
              <motion.div
                key={item.author}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08, duration: 0.5 }}
                whileHover={{ y: -4, borderColor: "rgba(29,139,239,0.6)" }}
                className="premium-panel-dark rounded-[1.75rem] p-8 transition-all"
              >
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#74b4d9]/22 text-sm font-semibold text-[#ebebeb]">
                    {item.author.slice(0, 1)}
                  </div>
                  <div className="h-px flex-1 bg-white/15" />
                </div>
                <p className="text-sm leading-relaxed text-[#ebebeb]">"{item.quote}"</p>
                <p className="mt-5 text-xs uppercase tracking-wide text-[#74b4d9]">{item.author}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      <section id="contact" className="premium-mesh py-28 text-[#103678]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeInUp}
          className="premium-panel mx-auto max-w-5xl rounded-[2rem] px-6 py-14 text-center lg:px-12"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#74b4d9]">Start The Conversation</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Ready to secure your business?</h2>
          <p className="mt-4 text-[#103678]/75">
            Connect with KollraX and get a tailored Microsoft 365 security and productivity roadmap.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              to="/contact"
              className="premium-button-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white"
            >
              Contact Us <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>
      </section>

      <footer className="relative overflow-hidden border-t border-white/10 bg-[#103678]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,102,205,0.25),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(29,139,239,0.22),transparent_42%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-14 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            className="mb-12 border-b border-[#d2d3d6]/20 pb-10"
          >
            <div className="flex items-center gap-4">
              <img src="/images/kollrax-logo-site.png" alt="KollraX" className="h-14 w-14 object-contain" />
              <p className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">KollraX</p>
            </div>
            <p className="mt-4 max-w-2xl text-[#ebebeb]">
              Enterprise Microsoft 365 architecture, migration, and managed support engineered for teams that cannot
              afford operational risk.
            </p>
            <Link
              to="/contact"
              className="premium-button-primary mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-white"
            >
              Talk to Solution Team <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

          <div className="grid gap-10 text-sm text-[#ebebeb] md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="font-medium text-white">Contact</p>
              <div className="mt-4 space-y-3">
                <p className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4" /> enterprise@kollrax.com
                </p>
                <p className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4" /> +1 (415) 555-0148
                </p>
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4" /> 100 Pine Street, San Francisco, CA
                </p>
              </div>
            </div>

            <div>
              <p className="font-medium text-white">Solutions</p>
              <div className="mt-4 space-y-2">
                <p>Starter Plan</p>
                <p>Business Plan</p>
                <p>Enterprise Plan</p>
                <p>Add-On Services</p>
              </div>
            </div>

            <div>
              <p className="font-medium text-white">Platform</p>
              <div className="mt-4 space-y-2">
                <Link to="/auth/login" className="block hover:text-white">
                  Admin Login
                </Link>
                <Link to="/contact" className="block hover:text-white">
                  Start Intake
                </Link>
                <Link to="/contact" className="block hover:text-white">
                  Book Consultation
                </Link>
              </div>
            </div>

            <div>
              <p className="font-medium text-white">Operating Model</p>
              <div className="mt-4 space-y-3">
                <p className="flex items-start gap-2">
                  <Clock3 className="mt-0.5 h-4 w-4" /> Structured delivery windows
                </p>
                <p className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4" /> Security baseline governance
                </p>
                <p className="flex items-start gap-2">
                  <Users className="mt-0.5 h-4 w-4" /> Dedicated support specialists
                </p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-2 border-t border-white/12 pt-6 text-xs text-[#ebebeb] md:flex-row md:items-center md:justify-between">
            <p>2026 KollraX, Inc. All rights reserved.</p>
            <p>Security-forward cloud operations for modern business infrastructure.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ContactPage() {
  const navigate = useNavigate();
  const { submitLead } = usePlatform();
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [submittedLead, setSubmittedLead] = useState<Omit<Lead, "id" | "createdAt"> | null>(null);
  const totalSteps = 4;
  const stepMeta = [
    { id: 1, label: "Contact", hint: "Who should we reply to?" },
    { id: 2, label: "Business", hint: "Tell us about your team." },
    { id: 3, label: "Needs", hint: "What do you want solved?" },
    { id: 4, label: "Qualification", hint: "Help us prioritize follow-up." },
  ];
  const progress = (step / totalSteps) * 100;

  const nextStep = () => setStep((current) => Math.min(totalSteps, current + 1));
  const previousStep = () => setStep((current) => Math.max(1, current - 1));

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const needs = formData.getAll("needs").map(String);
    const leadPayload: Omit<Lead, "id" | "createdAt"> = {
      name: String(formData.get("name")),
      email: String(formData.get("email")),
      phone: String(formData.get("phone")),
      company: String(formData.get("company")),
      staffSize: String(formData.get("staffSize")),
      usesMicrosoft365: String(formData.get("usesMicrosoft365")) as Lead["usesMicrosoft365"],
      needs,
      budgetRange: String(formData.get("budgetRange")),
      urgency: String(formData.get("urgency")) as Lead["urgency"],
      focus: needs.join(", "),
      message: String(formData.get("message")),
      stage: "New Lead",
      owner: "Unassigned",
    };

    submitLead(leadPayload);
    setSubmittedLead(leadPayload);
    setDone(true);
  };

  const whatsappMessage = submittedLead
    ? encodeURIComponent(
        `Hi, I just submitted a request on KollraX. My name is ${submittedLead.name} and I need help with ${submittedLead.needs.join(", ")}.`
      )
    : "";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#103678] px-6 py-20 text-white lg:px-8">
      <MotionBackdrop />
      <div className="relative mx-auto max-w-5xl">
        <button onClick={() => navigate(-1)} className="mb-6 text-sm font-medium text-[#ebebeb] hover:text-white">
          Back
        </button>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_360px]">
          <div className="premium-panel rounded-[2rem] p-8 text-[#103678] sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#74b4d9]">Smart Intake</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#103678]">Let&apos;s qualify your Microsoft 365 project fast</h1>
            <p className="mt-3 max-w-2xl text-[#103678]/72">
              Short steps, clear next action, and no awkward dead-end after submission.
            </p>

            {!done ? (
              <form onSubmit={onSubmit} className="mt-10 grid gap-6">
                <div className="rounded-[1.6rem] border border-[#103678]/10 bg-[#f7fbff] p-4">
                  <div className="flex items-center justify-between gap-3 text-sm text-[#103678]/72">
                    <span>Step {step} of {totalSteps}</span>
                    <span>{Math.round(progress)}% complete</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#103678]/10">
                    <div className="h-full rounded-full bg-[linear-gradient(90deg,#74b4d9,#ffffff)]" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  {stepMeta.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStep(item.id)}
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-left text-sm",
                        step === item.id
                          ? "border-[#74b4d9] bg-[#f3faff] text-[#103678]"
                          : "border-[#103678]/10 bg-white text-[#103678]/72"
                      )}
                    >
                      <span className="block text-[11px] uppercase tracking-[0.24em]">Step {item.id}</span>
                      <span className="mt-1 block font-semibold">{item.label}</span>
                      <span className="mt-1 block text-xs text-[#103678]/55">{item.hint}</span>
                    </button>
                  ))}
                </div>

                {step === 1 && (
                  <div className="grid gap-4">
                    <div>
                      <p className="text-lg font-semibold text-[#103678]">Contact details</p>
                      <p className="mt-1 text-sm text-[#103678]/64">We keep this short so your team can submit quickly.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="text-sm font-medium text-[#103678]">Full name</span>
                        <input required name="name" placeholder="Collins Adeyemi" className="dashboard-input rounded-2xl px-4 py-3.5 text-sm text-[#103678] outline-none placeholder:text-[#103678]/38" />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm font-medium text-[#103678]">Work email</span>
                        <input required type="email" name="email" placeholder="you@company.com" className="dashboard-input rounded-2xl px-4 py-3.5 text-sm text-[#103678] outline-none placeholder:text-[#103678]/38" />
                      </label>
                      <label className="grid gap-2 sm:col-span-2">
                        <span className="text-sm font-medium text-[#103678]">Phone or WhatsApp number</span>
                        <input required name="phone" placeholder="+234 801 234 5678" className="dashboard-input rounded-2xl px-4 py-3.5 text-sm text-[#103678] outline-none placeholder:text-[#103678]/38" />
                        <span className="text-xs text-[#103678]/62">Fast WhatsApp follow-up usually converts better than waiting on email alone.</span>
                      </label>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="grid gap-4">
                    <div>
                      <p className="text-lg font-semibold text-[#103678]">Business context</p>
                      <p className="mt-1 text-sm text-[#103678]/64">A little context helps us recommend the right plan much faster.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="text-sm font-medium text-[#103678]">Company name</span>
                        <input required name="company" placeholder="KollraX Ltd" className="dashboard-input rounded-2xl px-4 py-3.5 text-sm text-[#103678] outline-none placeholder:text-[#103678]/38" />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm font-medium text-[#103678]">Staff size</span>
                        <select required name="staffSize" defaultValue="" className="dashboard-input rounded-2xl px-4 py-3.5 text-sm text-[#103678] outline-none">
                          <option value="" disabled>Select staff size</option>
                          <option value="1-10">1-10</option>
                          <option value="11-50">11-50</option>
                          <option value="51-200">51-200</option>
                          <option value="201-500">201-500</option>
                          <option value="500+">500+</option>
                        </select>
                      </label>
                      <label className="grid gap-2 sm:col-span-2">
                        <span className="text-sm font-medium text-[#103678]">Do you already use Microsoft 365?</span>
                        <select required name="usesMicrosoft365" defaultValue="Yes" className="dashboard-input rounded-2xl px-4 py-3.5 text-sm text-[#103678] outline-none">
                          <option value="Yes">We already use Microsoft 365</option>
                          <option value="No">We do not use Microsoft 365 yet</option>
                          <option value="Not sure">Not sure</option>
                        </select>
                      </label>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="grid gap-4">
                    <div>
                      <p className="text-lg font-semibold text-[#103678]">Project needs</p>
                      <p className="mt-1 text-sm text-[#103678]/64">Choose everything that applies so we can route your request properly.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {["Setup", "Migration", "Security", "Ongoing support"].map((need) => (
                        <label key={need} className="flex items-center gap-3 rounded-2xl border border-[#103678]/10 bg-[#f7fbff] px-4 py-4 text-sm text-[#103678]">
                          <input type="checkbox" name="needs" value={need} defaultChecked={need === "Migration"} className="h-4 w-4 accent-[#74b4d9]" />
                          <span>{need}</span>
                        </label>
                      ))}
                    </div>
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-[#103678]">Extra details</span>
                      <textarea name="message" placeholder="Tell us about your current environment, challenge, target timeline, or anything we should know before we call." rows={5} className="dashboard-input rounded-2xl px-4 py-3.5 text-sm text-[#103678] outline-none placeholder:text-[#103678]/38" />
                    </label>
                  </div>
                )}

                {step === 4 && (
                  <div className="grid gap-4">
                    <div>
                      <p className="text-lg font-semibold text-[#103678]">Qualification</p>
                      <p className="mt-1 text-sm text-[#103678]/64">These answers help us prioritize the right response speed and package.</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-[#103678]">Budget range</span>
                      <select required name="budgetRange" defaultValue="" className="dashboard-input rounded-2xl px-4 py-3.5 text-sm text-[#103678] outline-none">
                      <option value="" disabled>Select budget range</option>
                      <option value="Under ₦500k">Under ₦500k</option>
                      <option value="₦500k - ₦2m">₦500k - ₦2m</option>
                      <option value="₦2m - ₦5m">₦2m - ₦5m</option>
                      <option value="₦5m+">₦5m+</option>
                      </select>
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-medium text-[#103678]">Urgency</span>
                      <select required name="urgency" defaultValue="ASAP" className="dashboard-input rounded-2xl px-4 py-3.5 text-sm text-[#103678] outline-none">
                      <option value="ASAP">ASAP</option>
                      <option value="This week">This week</option>
                      <option value="Just exploring">Just exploring</option>
                      </select>
                    </label>
                    <div className="rounded-[1.5rem] border border-[#103678]/10 bg-[#f7fbff] p-5 sm:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#74b4d9]">Before you submit</p>
                      <p className="mt-2 text-sm text-[#103678]/76">Users will immediately see a booking option and a WhatsApp shortcut after this step.</p>
                    </div>
                  </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-[#103678]/72">
                    {step < totalSteps ? "Complete this step to keep moving." : "Everything looks good. Submit when ready."}
                  </p>
                  <div className="flex gap-3">
                    {step > 1 && (
                      <button type="button" onClick={previousStep} className="rounded-2xl border border-[#103678]/12 bg-white px-5 py-3 text-sm font-semibold text-[#103678]">
                        Back
                      </button>
                    )}
                    {step < totalSteps ? (
                      <button type="button" onClick={nextStep} className="premium-button-primary rounded-2xl px-5 py-3 text-sm font-semibold text-white">
                        Continue
                      </button>
                    ) : (
                      <button className="premium-button-primary rounded-2xl px-5 py-3.5 text-sm font-semibold text-white">
                        Submit and continue
                      </button>
                    )}
                  </div>
                </div>
              </form>
            ) : (
              <div className="mt-10 space-y-5">
                <div className="rounded-[1.6rem] border border-emerald-500/18 bg-emerald-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Request received</p>
                  <h2 className="mt-2 text-2xl font-semibold text-[#103678]">Next step: book a quick consultation or chat instantly</h2>
                  <p className="mt-2 text-sm text-[#103678]/72">
                    We&apos;ve queued your confirmation, created the lead in the admin pipeline, and will aim to reach out within 1-2 hours.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <a
                    href="https://calendly.com/kollrax/15min"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-[1.6rem] border border-[#103678]/10 bg-[#f7fbff] p-5"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#74b4d9]">Option A</p>
                    <h3 className="mt-2 text-xl font-semibold text-[#103678]">Book a 15-minute call</h3>
                    <p className="mt-2 text-sm text-[#103678]/72">Great! Let&apos;s schedule a quick consultation to understand your needs.</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#103678]">
                      Open Calendly <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </a>

                  <a
                    href={`https://wa.me/2348012345678?text=${whatsappMessage}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-[1.6rem] border border-[#103678]/10 bg-[#f7fbff] p-5"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#74b4d9]">Option B</p>
                    <h3 className="mt-2 text-xl font-semibold text-[#103678]">Chat with us instantly</h3>
                    <p className="mt-2 text-sm text-[#103678]/72">Use WhatsApp to reduce drop-off and keep the conversation moving immediately.</p>
                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#103678]">
                      Open WhatsApp <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="premium-panel rounded-[2rem] p-6 text-[#103678]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#74b4d9]">Why this feels easier</p>
              <div className="mt-4 space-y-3 text-sm text-[#103678]/76">
                <p>Each step focuses on one decision, so users are not hit with one long wall of fields.</p>
                <p>Phone, urgency, and service needs are captured early for faster qualification.</p>
                <p>After submission, users get an immediate action instead of a dead-end thank-you page.</p>
              </div>
            </div>

            <div className="premium-panel rounded-[2rem] p-6 text-[#103678]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#74b4d9]">What happens next</p>
              <div className="mt-4 space-y-3 text-sm text-[#103678]/76">
                <p>Your lead is stored with phone, needs, budget, and urgency.</p>
                <p>The admin dashboard can move it from New Lead to Contacted, Consultation Booked, Proposal Sent, and Closed.</p>
                <p>Fast follow-up is the point: call or WhatsApp within 5-15 minutes for the best conversion rate.</p>
              </div>
            </div>

            <div className="premium-panel rounded-[2rem] p-6 text-[#103678]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#74b4d9]">Pipeline</p>
              <div className="mt-4 space-y-3">
                {["New Lead", "Contacted", "Consultation Booked", "Proposal Sent", "Closed"].map((item) => (
                  <div key={item} className="rounded-2xl border border-[#103678]/10 bg-[#f7fbff] px-4 py-3 text-sm font-medium">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#103678] px-6 py-12">
      <MotionBackdrop />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="premium-panel-dark relative z-10 w-full max-w-md rounded-[2rem] p-8 text-white"
      >
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#74b4d9]/80 to-transparent" />
        <img src="/images/kollrax-logo-site.png" alt="KollraX" className="mb-5 h-14 w-14 object-contain" />
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#ebebeb]">Secure Workspace Access</p>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-[#ebebeb]">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </motion.div>
    </div>
  );
}

function LoginPage() {
  const { login, logout } = usePlatform();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const role = login(String(data.get("email")), String(data.get("password")));
    if (!role) {
      setError("Invalid credentials. Try admin@kollrax.com / Admin@123 for demo admin.");
      return;
    }
    if (role !== "admin") {
      logout();
      setError("The user dashboard has been removed. Please use an admin account.");
      return;
    }
    navigate("/admin");
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Access your KollraX workspace securely.">
      <form onSubmit={onSubmit} className="grid gap-4">
        <input required name="email" type="email" placeholder="Email" className="premium-input rounded-2xl px-4 py-3.5 text-sm text-white outline-none placeholder:text-[#ebebeb]" />
        <input required name="password" type="password" placeholder="Password" className="premium-input rounded-2xl px-4 py-3.5 text-sm text-white outline-none placeholder:text-[#ebebeb]" />
        <button className="premium-button-primary rounded-2xl px-5 py-3.5 text-sm font-semibold text-white">Login</button>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <div className="flex justify-between text-sm text-[#ebebeb]">
          <Link to="/auth/recover">Forgot password?</Link>
          <Link to="/contact">Get started</Link>
        </div>
      </form>
    </AuthLayout>
  );
}

function SignupPage() {
  const { signup } = usePlatform();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const message = signup({
      fullName: String(data.get("fullName")),
      email: String(data.get("email")),
      company: String(data.get("company")),
      password: String(data.get("password")),
    });
    if (message) {
      setError(message);
      return;
    }
    navigate("/dashboard");
  };

  return (
    <AuthLayout title="Create account" subtitle="Launch your Microsoft 365 operations workspace.">
      <form onSubmit={onSubmit} className="grid gap-4">
        <input required name="fullName" placeholder="Full name" className="premium-input rounded-2xl px-4 py-3.5 text-sm text-white outline-none placeholder:text-[#ebebeb]" />
        <input required type="email" name="email" placeholder="Work email" className="premium-input rounded-2xl px-4 py-3.5 text-sm text-white outline-none placeholder:text-[#ebebeb]" />
        <input required name="company" placeholder="Company" className="premium-input rounded-2xl px-4 py-3.5 text-sm text-white outline-none placeholder:text-[#ebebeb]" />
        <input required type="password" name="password" minLength={8} placeholder="Password" className="premium-input rounded-2xl px-4 py-3.5 text-sm text-white outline-none placeholder:text-[#ebebeb]" />
        <button className="premium-button-primary rounded-2xl px-5 py-3.5 text-sm font-semibold text-white">Create workspace</button>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        <p className="text-sm text-[#ebebeb]">
          Already have access? <Link to="/auth/login">Login</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

function RecoverPage() {
  const { resetPassword } = usePlatform();
  const [message, setMessage] = useState("");

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email"));
    const exists = resetPassword(email);
    setMessage(
      exists
        ? "If this account exists, a secure recovery link has been prepared for delivery."
        : "No account found for this email."
    );
  };

  return (
    <AuthLayout title="Password recovery" subtitle="Recover access to your KollraX workspace.">
      <form onSubmit={onSubmit} className="grid gap-4">
        <input required type="email" name="email" placeholder="Work email" className="premium-input rounded-2xl px-4 py-3.5 text-sm text-white outline-none placeholder:text-[#ebebeb]" />
        <button className="premium-button-primary rounded-2xl px-5 py-3.5 text-sm font-semibold text-white">Send recovery link</button>
        {message && <p className="text-sm text-[#ebebeb]">{message}</p>}
        <Link to="/auth/login" className="text-sm text-[#ebebeb]">
          Back to login
        </Link>
      </form>
    </AuthLayout>
  );
}

function DashboardScaffold({
  title,
  children,
  headerClassName,
  mainClassName,
}: {
  title: string;
  children: ReactNode;
  headerClassName?: string;
  mainClassName?: string;
}) {
  const { currentUser, logout } = usePlatform();

  return (
    <div className="dashboard-shell relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="premium-grid absolute inset-0 opacity-30" />
        <div className="absolute left-[-8%] top-[-8rem] h-80 w-80 rounded-full bg-[#74b4d9]/18 blur-3xl" />
        <div className="absolute right-[-10%] top-16 h-96 w-96 rounded-full bg-[#103678]/10 blur-3xl" />
      </div>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#10267d] backdrop-blur-2xl">
        <div
          className={cn(
            "mx-auto flex min-h-[4.75rem] w-full items-center justify-between px-6 py-3 lg:px-8",
            headerClassName ?? "max-w-7xl"
          )}
        >
          <div className="flex items-center gap-3">
            <img src="/images/kollrax-logo-site.png" alt="KollraX" className="h-11 w-11 object-contain" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white">KollraX workspace</p>
              <h1 className="text-lg font-semibold text-white">{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="hidden items-center gap-3 rounded-2xl border border-white/20 bg-white/8 px-4 py-2 shadow-[0_16px_34px_rgba(16,54,120,0.08)] lg:flex">
                <ProfileAvatar user={currentUser} />
                <div>
                  <p className="text-sm font-semibold text-white">{currentUser.fullName}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-white/70">{currentUser.role} account</p>
                </div>
              </div>
            )}
            <Link to="/" className="rounded-2xl border border-white/20 bg-white/8 px-3.5 py-2.5 text-sm font-medium text-white shadow-[0_10px_24px_rgba(16,54,120,0.05)] hover:border-[#74b4d9]">
              Public site
            </Link>
            {currentUser?.role === "admin" ? (
              <Link to="/admin" className="rounded-2xl border border-white/20 bg-white/8 px-3.5 py-2.5 text-sm font-medium text-white shadow-[0_10px_24px_rgba(16,54,120,0.05)] hover:border-[#74b4d9]">
                Admin
              </Link>
            ) : (
              <Link to="/dashboard" className="rounded-2xl border border-white/20 bg-white/8 px-3.5 py-2.5 text-sm font-medium text-white shadow-[0_10px_24px_rgba(16,54,120,0.05)] hover:border-[#74b4d9]">
                Dashboard
              </Link>
            )}
            <button onClick={logout} className="premium-button-primary rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-white">
              <span className="inline-flex items-center gap-2">
                <LogOut className="h-4 w-4" /> Sign out
              </span>
            </button>
          </div>
        </div>
      </header>
      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={cn("relative mx-auto w-full px-6 py-8 lg:px-8", mainClassName ?? "max-w-7xl")}
      >
        {children}
      </motion.main>
    </div>
  );
}

function ClientDashboard() {
  const { currentUser, state, createTicket, updatePassword, updateProfile } = usePlatform();
  const [note, setNote] = useState("");
  const [profileNote, setProfileNote] = useState("");
  const [passwordNote, setPasswordNote] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);

  if (!currentUser) return null;

  const myTickets = state.tickets.filter((ticket) => ticket.userId === currentUser.id);

  const activities = myTickets
    .flatMap((ticket) =>
      ticket.updates.map((update) => ({
        ticketId: ticket.id,
        createdAt: update.createdAt,
        message: update.message,
        by: update.by,
      }))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const openTickets = myTickets.filter((ticket) => ticket.status === "Open").length;
  const inProgressTickets = myTickets.filter((ticket) => ticket.status === "In Progress").length;
  const resolvedTickets = myTickets.filter((ticket) => ticket.status === "Resolved").length;
  const highPriorityTickets = myTickets.filter((ticket) => ticket.priority === "High").length;
  const latestTicket = myTickets.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  const submitTicket = (event: FormEvent<HTMLFormElement>, category: "Service Request" | "Support") => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    createTicket({
      subject: String(data.get("subject")),
      priority: data.get("priority") as "Low" | "Medium" | "High",
      message: String(data.get("message")),
      category,
    });
    event.currentTarget.reset();
    setNote(`${category} submitted successfully.`);
  };

  const submitProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    updateProfile({ fullName: String(data.get("fullName")), company: String(data.get("company")) });
    setProfileNote("Profile updated.");
  };

  const submitPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const newPassword = String(data.get("newPassword"));
    const confirmPassword = String(data.get("confirmPassword"));
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      setPasswordNote("");
      return;
    }

    const message = updatePassword({
      currentPassword: String(data.get("currentPassword")),
      newPassword,
    });

    if (message) {
      setPasswordError(message);
      setPasswordNote("");
      return;
    }

    event.currentTarget.reset();
    setPasswordError("");
    setPasswordNote("Password updated successfully.");
  };

  const handleAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setAvatarBusy(true);
      const avatar = await resizeImageFile(file);
      updateProfile({
        fullName: currentUser.fullName,
        company: currentUser.company,
        avatar,
      });
      setProfileNote("Profile image updated and resized automatically.");
    } catch {
      setProfileNote("We could not process that image. Please try another file.");
    } finally {
      setAvatarBusy(false);
      event.target.value = "";
    }
  };

  return (
    <DashboardScaffold
      title="Client Command Center"
      headerClassName="max-w-[min(100%,112rem)]"
      mainClassName="max-w-[min(100%,112rem)]"
    >
      <div className="client-command-surface rounded-[2rem] p-3 sm:p-4">
        <div className="grid gap-4 xl:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="client-sidebar rounded-[1.6rem] p-4 xl:sticky xl:top-6 xl:self-start">
            <div className="flex items-center gap-3 border-b border-[#103678]/8 pb-4">
              <div className="dashboard-icon-chip">
                <LayoutDashboard className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-semibold text-[#103678]">Workspace</p>
                <p className="text-xs text-[#103678]/55">Client operations</p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <ClientNavItem icon={LayoutDashboard} label="Overview" active />
              <ClientNavItem icon={Briefcase} label="Service Requests" />
              <ClientNavItem icon={Headset} label="Support Desk" />
              <ClientNavItem icon={ShieldCheck} label="Security Reviews" />
              <ClientNavItem icon={Settings2} label="Profile Settings" />
            </div>

            <div className="mt-6 rounded-[1.4rem] border border-[#103678]/10 bg-white/72 p-4 shadow-[0_16px_34px_rgba(16,54,120,0.06)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#103678]/55">Client Snapshot</p>
              <p className="mt-3 text-lg font-semibold text-[#103678]">{currentUser.company}</p>
              <div className="mt-4 space-y-3 text-sm text-[#103678]/74">
                <div className="flex items-center justify-between">
                  <span>Open items</span>
                  <span className="font-semibold text-[#103678]">{openTickets + inProgressTickets}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>High priority</span>
                  <span className="font-semibold text-[#103678]">{highPriorityTickets}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {["Request new service", "Track open work", "Review account profile"].map((item) => (
                <button key={item} className="client-quick-row">
                  <span className="text-sm font-medium">{item}</span>
                  <ChevronRight className="h-4 w-4 text-[#74b4d9]" />
                </button>
              ))}
            </div>
          </aside>

          <div className="space-y-4">
            <div className="client-topbar rounded-[1.4rem] px-4 py-3">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="client-search-field w-full max-w-md">
                  <Search className="h-4 w-4 text-[#103678]/45" />
                  <input
                    readOnly
                    value={`Workspace for ${currentUser.fullName}`}
                    className="w-full bg-transparent text-sm text-[#103678] outline-none"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button className="client-toolbar-pill">
                    <Building2 className="h-4 w-4" />
                    {currentUser.company}
                  </button>
                  <button className="client-toolbar-icon"><Bell className="h-4 w-4" /></button>
                  <button className="client-toolbar-icon"><Mail className="h-4 w-4" /></button>
                  <button className="client-toolbar-icon"><Settings2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>

            <div className="client-dashboard-frame rounded-[1.8rem] p-4 sm:p-5">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#103678]/52">
                      <span>Client Dashboard</span>
                      <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] text-[#103678]/82">Overview</span>
                    </div>
                    <h2 className="mt-2 text-[1.7rem] font-semibold text-[#103678]">Service visibility, requests, and support in one place.</h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button className="client-toolbar-pill">
                      <ArrowUpRight className="h-4 w-4" />
                      Account health
                    </button>
                    <button className="premium-button-primary rounded-2xl px-4 py-3 text-sm font-semibold text-white">
                      <span className="inline-flex items-center gap-2">
                        <Briefcase className="h-4 w-4" /> New request
                      </span>
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.5fr)_360px]">
                  <motion.section variants={staggerReveal} initial="hidden" animate="visible" className="space-y-4">
                    <motion.div variants={fadeInUp} className="dashboard-hero relative overflow-hidden rounded-[1.8rem] p-6 sm:p-7">
                      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/20 blur-3xl" />
                      <p className="dashboard-eyebrow text-white/70">Workspace Overview</p>
                      <div className="mt-5 grid gap-6 xl:grid-cols-[1.4fr_0.95fr] xl:items-end">
                        <div>
                          <h3 className="max-w-2xl text-3xl font-semibold text-white sm:text-[2.25rem]">
                            {currentUser.fullName.split(" ")[0]}, your KollraX workspace is active and fully tracked.
                          </h3>
                          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78">
                            Launch service requests, keep support conversations visible, and monitor delivery progress with a cleaner operational dashboard.
                          </p>
                          <div className="mt-6 flex flex-wrap gap-3">
                            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                              <p className="text-xs uppercase tracking-[0.18em] text-white/55">Organization</p>
                              <p className="mt-1 text-sm font-semibold text-white">{currentUser.company}</p>
                            </div>
                            <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                              <p className="text-xs uppercase tracking-[0.18em] text-white/55">Latest request</p>
                              <p className="mt-1 text-sm font-semibold text-white">{latestTicket ? latestTicket.subject : "No requests yet"}</p>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-[1.65rem] border border-white/15 bg-white/10 p-5 backdrop-blur-xl">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Delivery Snapshot</p>
                          <div className="mt-4 space-y-4">
                            <div className="flex items-center justify-between rounded-2xl border border-white/12 bg-white/8 px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/14 text-white">
                                  <Target className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-white">Active workstreams</p>
                                  <p className="text-xs text-white/60">Open and in-progress requests</p>
                                </div>
                              </div>
                              <p className="text-lg font-semibold text-white">{openTickets + inProgressTickets}</p>
                            </div>
                            <div className="flex items-center justify-between text-sm text-white/76">
                              <span>Resolved items</span>
                              <span className="font-semibold text-white">{resolvedTickets}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-white/76">
                              <span>Response tracking</span>
                              <span className="font-semibold text-white">Live</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <Metric label="Open Queue" value={String(openTickets)} icon={Bell} tone="dark" />
                        <Metric label="In Progress" value={String(inProgressTickets)} icon={Activity} tone="dark" />
                        <Metric label="Resolved" value={String(resolvedTickets)} icon={CheckCircle2} tone="dark" />
                        <Metric label="High Priority" value={String(highPriorityTickets)} icon={ShieldCheck} tone="dark" />
                      </div>
                    </motion.div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <motion.div variants={fadeInUp} className="client-panel rounded-[1.45rem] p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="dashboard-eyebrow">Service Intake</p>
                            <h3 className="mt-2 text-xl font-semibold text-[#103678]">Create a service request</h3>
                            <p className="mt-2 text-sm text-[#103678]/68">Start new work for migrations, security, architecture, or managed support.</p>
                          </div>
                          <div className="dashboard-icon-chip">
                            <Briefcase className="h-4 w-4" />
                          </div>
                        </div>
                        <form onSubmit={(e) => submitTicket(e, "Service Request")} className="mt-5 grid gap-3">
                          <input required name="subject" placeholder="Request subject" className="dashboard-input rounded-2xl px-4 py-3 text-sm outline-none" />
                          <select name="priority" className="dashboard-input rounded-2xl px-4 py-3 text-sm outline-none">
                            <option>Low</option>
                            <option>Medium</option>
                            <option>High</option>
                          </select>
                          <textarea required name="message" rows={4} placeholder="Describe the service required" className="dashboard-input rounded-2xl px-4 py-3 text-sm outline-none" />
                          <button className="premium-button-primary rounded-2xl px-4 py-3 text-sm font-semibold text-white">Submit service request</button>
                        </form>
                      </motion.div>

                      <motion.div variants={fadeInUp} className="client-panel rounded-[1.45rem] p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="dashboard-eyebrow">Support Lane</p>
                            <h3 className="mt-2 text-xl font-semibold text-[#103678]">Open a support ticket</h3>
                            <p className="mt-2 text-sm text-[#103678]/68">Capture blockers, questions, or issues in a queue your team can follow end-to-end.</p>
                          </div>
                          <div className="dashboard-icon-chip">
                            <Headset className="h-4 w-4" />
                          </div>
                        </div>
                        <form onSubmit={(e) => submitTicket(e, "Support")} className="mt-5 grid gap-3">
                          <input required name="subject" placeholder="Support topic" className="dashboard-input rounded-2xl px-4 py-3 text-sm outline-none" />
                          <select name="priority" className="dashboard-input rounded-2xl px-4 py-3 text-sm outline-none">
                            <option>Low</option>
                            <option>Medium</option>
                            <option>High</option>
                          </select>
                          <textarea required name="message" rows={4} placeholder="Describe the issue" className="dashboard-input rounded-2xl px-4 py-3 text-sm outline-none" />
                          <button className="rounded-2xl bg-[#103678] px-4 py-3 text-sm font-semibold text-white hover:bg-[#74b4d9] hover:text-[#103678]">Create support ticket</button>
                        </form>
                        {note && <p className="mt-3 text-sm text-emerald-700">{note}</p>}
                      </motion.div>
                    </div>
                  </motion.section>

                  <motion.section variants={staggerReveal} initial="hidden" animate="visible" className="space-y-4">
                    <motion.div variants={fadeInUp} className="client-panel rounded-[1.45rem] p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="dashboard-eyebrow">Account Signals</p>
                          <h3 className="mt-2 text-lg font-semibold text-[#103678]">Notification area</h3>
                        </div>
                        <div className="dashboard-icon-chip">
                          <Bell className="h-4 w-4" />
                        </div>
                      </div>
                      <ul className="mt-4 space-y-3 text-sm text-[#103678]/75">
                        <li className="rounded-2xl border border-[#103678]/8 bg-[#f6f9fc] px-4 py-3">Security baseline review available for your tenant.</li>
                        <li className="rounded-2xl border border-[#103678]/8 bg-[#f6f9fc] px-4 py-3">Monthly support summary will be generated next week.</li>
                        <li className="rounded-2xl border border-[#103678]/8 bg-[#f6f9fc] px-4 py-3">Latest activity is reflected automatically in your request ledger.</li>
                      </ul>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="client-panel rounded-[1.45rem] p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="dashboard-eyebrow">Activity Stream</p>
                          <h3 className="mt-2 text-lg font-semibold text-[#103678]">Recent activities</h3>
                        </div>
                        <div className="dashboard-icon-chip">
                          <LineChart className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="mt-4 space-y-3">
                        {activities.length === 0 && <p className="text-sm text-[#103678]/60">No activity yet.</p>}
                        {activities.map((item, index) => (
                          <div key={`${item.ticketId}-${index}`} className="rounded-2xl border border-[#103678]/8 bg-[#f8fbff] p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium text-[#103678]">{item.message}</p>
                                <p className="mt-1 text-xs text-[#103678]/65">
                                  {item.by} in {item.ticketId} on {isoDate(item.createdAt)}
                                </p>
                              </div>
                              <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#74b4d9]" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="client-panel rounded-[1.45rem] p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="dashboard-eyebrow">Workspace Identity</p>
                          <h3 className="mt-2 text-lg font-semibold text-[#103678]">Profile settings</h3>
                        </div>
                        <div className="dashboard-icon-chip">
                          <Settings2 className="h-4 w-4" />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-4 rounded-[1.2rem] border border-[#103678]/8 bg-white/70 p-4">
                        <ProfileAvatar user={currentUser} size="lg" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#103678]">{currentUser.fullName}</p>
                          <p className="text-xs text-[#103678]/55">{currentUser.memberCode}</p>
                          <label className="mt-3 inline-flex cursor-pointer items-center rounded-2xl border border-[#ebebeb] bg-white px-3 py-2 text-xs font-semibold text-[#103678] hover:border-[#74b4d9]">
                            {avatarBusy ? "Processing image..." : "Upload profile image"}
                            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                          </label>
                        </div>
                      </div>
                      <form onSubmit={submitProfile} className="mt-4 grid gap-3">
                        <input defaultValue={currentUser.fullName} name="fullName" className="dashboard-input rounded-2xl px-4 py-3 text-sm outline-none" />
                        <input defaultValue={currentUser.company} name="company" className="dashboard-input rounded-2xl px-4 py-3 text-sm outline-none" />
                        <input readOnly value={currentUser.memberCode} className="dashboard-input rounded-2xl px-4 py-3 text-sm outline-none opacity-75" />
                        <button className="rounded-2xl border border-[#ebebeb] bg-white px-4 py-3 text-sm font-semibold text-[#103678] hover:border-[#74b4d9]">Save profile</button>
                        {profileNote && <p className="text-sm text-emerald-700">{profileNote}</p>}
                      </form>
                      <form onSubmit={submitPassword} className="mt-5 grid gap-3">
                        <p className="text-sm font-semibold text-[#103678]">Change password</p>
                        <input required name="currentPassword" type="password" placeholder="Current password" className="dashboard-input rounded-2xl px-4 py-3 text-sm outline-none" />
                        <input required name="newPassword" type="password" minLength={8} placeholder="New password" className="dashboard-input rounded-2xl px-4 py-3 text-sm outline-none" />
                        <input required name="confirmPassword" type="password" minLength={8} placeholder="Confirm new password" className="dashboard-input rounded-2xl px-4 py-3 text-sm outline-none" />
                        <button className="premium-button-primary rounded-2xl px-4 py-3 text-sm font-semibold text-white">Update password</button>
                        {passwordError && <p className="text-sm text-rose-700">{passwordError}</p>}
                        {passwordNote && <p className="text-sm text-emerald-700">{passwordNote}</p>}
                      </form>
                    </motion.div>
                  </motion.section>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.45 }}
                  className="client-panel rounded-[1.45rem] p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="dashboard-eyebrow">Request Ledger</p>
                      <h3 className="mt-2 text-lg font-semibold text-[#103678]">Support history and tracking</h3>
                    </div>
                    <p className="text-sm text-[#103678]/60">A full record of delivery requests, support items, and status movement.</p>
                  </div>
                  <div className="mt-4 overflow-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-[#103678]/60">
                        <tr>
                          <th className="px-3 py-2">Ticket</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Status</th>
                          <th className="px-3 py-2">Priority</th>
                          <th className="px-3 py-2">Updated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {myTickets.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-3 py-8 text-center text-[#103678]/55">
                              No requests yet. Your submitted service and support items will appear here.
                            </td>
                          </tr>
                        )}
                        {myTickets.map((ticket) => (
                          <tr key={ticket.id} className="border-t border-[#ebebeb] transition-colors hover:bg-[#ebebeb]/35">
                            <td className="px-3 py-4 font-medium text-[#103678]">
                              <div>
                                <p>{ticket.subject}</p>
                                <p className="mt-1 text-xs font-normal text-[#103678]/55">{ticket.id}</p>
                              </div>
                            </td>
                            <td className="px-3 py-4 text-[#103678]/75">{ticket.category}</td>
                            <td className="px-3 py-4 text-[#103678]/75">
                              <StatusBadge status={ticket.status} />
                            </td>
                            <td className="px-3 py-4 text-[#103678]/75">{ticket.priority}</td>
                            <td className="px-3 py-4 text-[#103678]/65">{isoDate(ticket.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardScaffold>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  tone = "light",
}: {
  label: string;
  value: string;
  icon: typeof User;
  tone?: "light" | "dark";
}) {
  const classes =
    tone === "dark"
      ? "border-white/14 bg-white/10 text-white shadow-none backdrop-blur"
      : "border-white bg-gradient-to-b from-white to-[#EDF2F8] text-[#103678] shadow-[0_14px_28px_rgba(10,26,67,0.06)]";

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`rounded-2xl border p-4 ${classes}`}
    >
      <div className={`flex items-center gap-2 ${tone === "dark" ? "text-white/78" : "text-[#74b4d9]"}`}>
        <Icon className="h-4 w-4" />
        <p className="text-xs uppercase tracking-wide">{label}</p>
      </div>
      <p className={`mt-2 line-clamp-1 text-sm font-semibold ${tone === "dark" ? "text-white" : "text-[#103678]"}`}>{value}</p>
    </motion.div>
  );
}

function ProfileAvatar({ user, size = "md" }: { user: UserType; size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "h-8 w-8 text-[11px]",
    md: "h-10 w-10 text-sm",
    lg: "h-16 w-16 text-lg",
  };

  if (user.avatar) {
    return <img src={user.avatar} alt={user.fullName} className={`${sizes[size]} rounded-full object-cover shadow-[0_10px_24px_rgba(16,54,120,0.12)]`} />;
  }

  return (
    <div className={`flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#1e4f9c,#59c4ff)] font-semibold text-white ${sizes[size]}`}>
      {user.fullName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)}
    </div>
  );
}

function StatusBadge({ status }: { status: TicketStatus }) {
  const classes =
    status === "Resolved"
      ? "bg-[#74b4d9]/18 text-[#103678]"
      : status === "In Progress"
        ? "bg-[#103678]/12 text-[#103678]"
        : "bg-[#ebebeb] text-[#103678]";

  return <span className={`rounded-md px-2 py-1 text-xs font-medium ${classes}`}>{status}</span>;
}

function ClientNavItem({
  icon: Icon,
  label,
  active = false,
}: {
  icon: typeof User;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${
        active
          ? "border border-[#74b4d9]/45 bg-[linear-gradient(135deg,rgba(116,180,217,0.24),rgba(255,255,255,0.9))] text-[#103678] shadow-[0_16px_34px_rgba(116,180,217,0.16)]"
          : "border border-transparent bg-transparent text-[#103678]/68 hover:border-[#103678]/8 hover:bg-white/60 hover:text-[#103678]"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="font-medium">{label}</span>
    </button>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function AdminNavItem({
  icon: Icon,
  label,
  active = false,
}: {
  icon: typeof User;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${
        active
          ? "border border-[#74b4d9]/45 bg-[linear-gradient(135deg,rgba(116,180,217,0.24),rgba(255,255,255,0.9))] text-[#103678] shadow-[0_16px_34px_rgba(116,180,217,0.16)]"
          : "border border-transparent bg-transparent text-[#103678]/68 hover:border-[#103678]/8 hover:bg-white/60 hover:text-[#103678]"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="font-medium">{label}</span>
    </button>
  );
}

function AdminStatCard({
  label,
  value,
  delta,
  icon: Icon,
}: {
  label: string;
  value: string;
  delta: string;
  icon: typeof User;
}) {
  return (
    <motion.div whileHover={{ y: -3 }} className="admin-stat-card rounded-[1.5rem] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0A1A43]/52">{label}</p>
          <p className="mt-3 text-2xl font-semibold text-[#0A1A43]">{value}</p>
        </div>
        <div className="admin-stat-icon">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-4 text-sm text-emerald-700">{delta}</p>
    </motion.div>
  );
}

function ProgressRow({ label, value, ratio }: { label: string; value: string; ratio: number }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-[#0A1A43]/72">{label}</span>
        <span className="font-semibold text-[#0A1A43]">{value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#D2D3D6]/55">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#1466CD_0%,#1D8BEF_100%)]"
          style={{ width: `${Math.max(6, Math.min(100, ratio * 100))}%` }}
        />
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { state, currentUser, updateTicketStatus, addTicketReply, toggleService, updateLeadPipeline } = usePlatform();
  const contentAreaList = ["Website content", "Testimonials", "FAQs", "Service information", "Announcements", "Blog/news architecture"];
  const notificationSeed = [
    "2 high-priority support tickets require admin review.",
    "One consultation lead needs follow-up assignment today.",
    "Subscription renewal batch scheduled for tonight at 21:00.",
  ];
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [adminNotice, setAdminNotice] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState({
    primary: false,
    kiretivs: false,
    system: false,
  });
  const [userRoles, setUserRoles] = useState<Record<string, UserRole>>(
    Object.fromEntries(state.users.map((user) => [user.id, user.role]))
  );
  const [accountStatuses, setAccountStatuses] = useState<Record<string, "Required" | "Review" | "Paused">>(
    Object.fromEntries(state.users.map((user) => [user.id, user.role === "admin" ? "Review" : "Required"]))
  );
  const [consultationStatuses, setConsultationStatuses] = useState<Record<string, LeadStage>>(
    Object.fromEntries(state.leads.map((lead) => [lead.id, lead.stage]))
  );
  const [consultationOwners, setConsultationOwners] = useState<Record<string, string>>(
    Object.fromEntries(state.leads.map((lead) => [lead.id, lead.owner]))
  );
  const [paymentStatuses, setPaymentStatuses] = useState<Record<string, "Paid" | "Processing" | "Pending" | "Failed">>({
    "INV-4201": "Paid",
    "INV-4202": "Processing",
    "INV-4203": "Pending",
  });
  const [subscriptionAssignments, setSubscriptionAssignments] = useState<Record<string, string>>({
    "INV-4201": "Enterprise",
    "INV-4202": "Premium",
    "INV-4203": "Growth",
  });
  const [permissionMatrix, setPermissionMatrix] = useState<Record<string, { billing: boolean; support: boolean; content: boolean; system: boolean }>>(
    Object.fromEntries(
      state.users.map((user) => [
        user.id,
        user.role === "admin"
          ? { billing: true, support: true, content: true, system: true }
          : { billing: false, support: true, content: false, system: false },
      ])
    )
  );
  const [notificationDraft, setNotificationDraft] = useState({
    title: "",
    message: "",
    audience: "All workspace users",
  });
  const [sentNotifications, setSentNotifications] = useState(
    notificationSeed.map((item, index) => ({
      id: `notice-${index}`,
      title: `Platform Notice ${index + 1}`,
      message: item,
      audience: "Admin feed",
    }))
  );
  const [activeContentArea, setActiveContentArea] = useState(contentAreaList[0]);
  const [contentEntries, setContentEntries] = useState<Record<string, string>>({
    "Website content": "Refresh homepage positioning for Microsoft 365 managed operations and enterprise support.",
    Testimonials: "Highlight recent migration delivery wins and managed support satisfaction notes.",
    FAQs: "Add billing, onboarding, and compliance workflow questions for enterprise buyers.",
    "Service information": "Clarify migration, deployment, compliance, and consultation engagement stages.",
    Announcements: "Prepare admin-controlled platform notices for maintenance windows and release changes.",
    "Blog/news architecture": "Outline publishing workflow for insights, updates, and thought leadership content.",
  });

  const activeClients = Array.from(new Set(state.users.filter((user) => user.role === "client").map((user) => user.company))).length;
  const adminUsers = state.users.filter((user) => user.role === "admin").length;
  const usersWithAvatars = state.users.filter((user) => Boolean(user.avatar)).length;
  const consultations = state.leads.slice(0, 4);
  const openConsultations = state.leads.length;
  const openTicketsCount = state.tickets.filter((ticket) => ticket.status === "Open").length;
  const inProgressTicketsCount = state.tickets.filter((ticket) => ticket.status === "In Progress").length;
  const enabledServices = state.services.filter((service) => service.enabled).length;
  const monthlyRecurringRevenue = activeClients * 4200 + state.services.filter((service) => service.enabled).length * 850;
  const filteredUsers = state.users.filter((user) => {
    const matchesSearch =
      user.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.company.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = roleFilter === "all" ? true : userRoles[user.id] === roleFilter;
    return matchesSearch && matchesRole;
  });

  const subscriptionPlans = [
    { plan: "Enterprise Plan", health: 0.97 },
    { plan: "Business Plan", health: 0.61 },
    { plan: "Starter Plan", health: 0.48 },
  ];
  const chartValues = [0.18, 0.42, 0.34, 0.47, 0.62, 0.41, 0.73, 0.68, 0.79, 0.98];
  const chartLabels = ["Jan", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
  const chartPoints = chartValues.map((value, index) => {
    const x = index * 52 + 24;
    const y = 148 - value * 112;
    return `${x},${y}`;
  });
  const chartPath = chartPoints
    .map((point, index) => {
      const [x, y] = point.split(",");
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const chartAreaPath = `${chartPath} L ${24 + (chartValues.length - 1) * 52} 160 L 24 160 Z`;

  const recentActivities = state.tickets
    .flatMap((ticket) =>
      ticket.updates.map((update) => ({
        id: `${ticket.id}-${update.createdAt}`,
        detail: update.message,
        createdAt: update.createdAt,
      }))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const newestUsers = state.users
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);
  const paymentRecords = [
    { id: "INV-4201", client: "Northbridge Partners", gateway: "Paystack", amount: 4200, status: "Paid" },
    { id: "INV-4202", client: "Altitude Bio", gateway: "Flutterwave", amount: 6850, status: "Processing" },
    { id: "INV-4203", client: "KollraX Premium", gateway: "Paystack", amount: 2750, status: "Pending" },
  ];
  const notificationItems = notificationSeed;
  const permissionItems = [
    "Role assignment controls are active for all organization members.",
    "Audit log monitoring is enabled for platform configuration changes.",
    "Security overview indicates no elevated administrative anomalies.",
  ];
  const contentAreas = contentAreaList;

  useEffect(() => {
    setConsultationStatuses(Object.fromEntries(state.leads.map((lead) => [lead.id, lead.stage])));
    setConsultationOwners(Object.fromEntries(state.leads.map((lead) => [lead.id, lead.owner])));
  }, [state.leads]);

  const submitReply = (ticketId: string) => {
    const text = replyDrafts[ticketId]?.trim();
    if (!text) return;
    addTicketReply(ticketId, text);
    setReplyDrafts((prev) => ({ ...prev, [ticketId]: "" }));
  };

  const toggleGroup = (group: keyof typeof collapsedGroups) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }));
  };

  const savePermissionPreset = (userId: string) => {
    setAdminNotice(`Permissions updated for ${state.users.find((user) => user.id === userId)?.fullName ?? "user"}.`);
  };

  const updateConsultation = (leadId: string) => {
    updateLeadPipeline(leadId, {
      stage: consultationStatuses[leadId],
      owner: consultationOwners[leadId] ?? "Unassigned",
    });
    setAdminNotice(`Lead ${leadId} updated to ${consultationStatuses[leadId]} under ${consultationOwners[leadId] ?? "Unassigned"}.`);
  };

  const applyPaymentAction = (invoiceId: string, action: "capture" | "remind" | "retry") => {
    const actionMap = {
      capture: "Payment captured and logged.",
      remind: "Invoice reminder scheduled.",
      retry: "Retry payment flow started.",
    };
    setAdminNotice(`${invoiceId}: ${actionMap[action]}`);
  };

  const sendNotification = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!notificationDraft.title.trim() || !notificationDraft.message.trim()) return;
    setSentNotifications((prev) => [
      {
        id: createId("notice"),
        title: notificationDraft.title.trim(),
        message: notificationDraft.message.trim(),
        audience: notificationDraft.audience,
      },
      ...prev,
    ]);
    setNotificationDraft({ title: "", message: "", audience: "All workspace users" });
    setAdminNotice("Notification created and added to the admin feed.");
  };

  const saveContentArea = () => {
    setAdminNotice(`${activeContentArea} content draft saved.`);
  };

  return (
    <DashboardScaffold
      title="KollraX Admin Command"
      headerClassName="max-w-[min(100%,112rem)]"
      mainClassName="max-w-[min(100%,112rem)]"
    >
      <div className="admin-command-surface admin-laptop-compact rounded-[2rem] p-3 sm:p-4">
        <div className="admin-layout-grid grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="admin-sidebar rounded-[1.6rem] p-4 xl:sticky xl:top-6 xl:self-start">
            <div className="flex items-center gap-3 border-b border-[#103678]/8 pb-4">
              <div className="admin-sidebar-badge">
                <LayoutDashboard className="h-4 w-4" />
              </div>
              <div>
                <p className="text-lg font-semibold text-[#103678]">KollraX</p>
                <p className="text-xs text-[#103678]/55">Admin workspace</p>
              </div>
            </div>

            <div className="mt-5">
              <button onClick={() => toggleGroup("primary")} className="admin-sidebar-group">
                <span>Core Navigation</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${collapsedGroups.primary ? "-rotate-90" : ""}`} />
              </button>
              {!collapsedGroups.primary && (
                <div className="mt-2 space-y-1.5">
                  <AdminNavItem icon={LayoutDashboard} label="Overview" active />
                  <AdminNavItem icon={CreditCard} label="Cards" />
                  <AdminNavItem icon={Users} label="Active Users" />
                  <AdminNavItem icon={Workflow} label="Configuration" />
                  <AdminNavItem icon={Wallet} label="Subscription" />
                </div>
              )}
            </div>

            <div className="mt-6">
              <button onClick={() => toggleGroup("kiretivs")} className="admin-sidebar-group">
                <span>Kiretivs</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${collapsedGroups.kiretivs ? "-rotate-90" : ""}`} />
              </button>
              {!collapsedGroups.kiretivs && (
                <div className="mt-2 space-y-1.5">
                  <AdminNavItem icon={FolderOpen} label="Clients" />
                  <AdminNavItem icon={Bot} label="Content Management" />
                  <AdminNavItem icon={Sparkles} label="Testimonials" />
                </div>
              )}
            </div>

            <div className="mt-6">
              <button onClick={() => toggleGroup("system")} className="admin-sidebar-group">
                <span>System Management</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${collapsedGroups.system ? "-rotate-90" : ""}`} />
              </button>
              {!collapsedGroups.system && (
                <div className="mt-2 space-y-1.5">
                  <AdminNavItem icon={Workflow} label="Audit Logs" />
                  <AdminNavItem icon={Bell} label="Notifications" />
                  <AdminNavItem icon={Activity} label="Activity Monitoring" />
                  <AdminNavItem icon={Settings2} label="Platform Settings" />
                </div>
              )}
            </div>

            <div className="mt-8 rounded-[1.35rem] border border-[#103678]/10 bg-white/72 p-4 shadow-[0_16px_34px_rgba(16,54,120,0.06)]">
              <p className="text-sm font-semibold text-[#103678]">Prisma</p>
              <p className="mt-1 text-xs text-[#103678]/55">PostgreSQL</p>
            </div>
          </aside>

          <div className="space-y-4">
            <div className="admin-topbar rounded-[1.4rem] px-4 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="admin-search-field w-full max-w-md">
                  <Search className="h-4 w-4 text-[#103678]/40" />
                  <input
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                    placeholder="Search..."
                    className="w-full bg-transparent text-sm text-[#103678] outline-none placeholder:text-[#103678]/32"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button className="admin-toolbar-pill">
                    <div className="h-2 w-2 rounded-full bg-[#57a3ff]" />
                    Admin accounts
                  </button>
                  <button className="admin-toolbar-icon"><ReceiptText className="h-4 w-4" /></button>
                  <button className="admin-toolbar-icon relative">
                    <Bell className="h-4 w-4" />
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff5f6d] px-1 text-[10px] text-white">1</span>
                  </button>
                  <button className="admin-toolbar-icon"><Settings2 className="h-4 w-4" /></button>
                  {currentUser && <ProfileAvatar user={currentUser} />}
                </div>
              </div>
            </div>

            <div className="admin-dashboard-frame rounded-[1.8rem] p-4 sm:p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm text-[#103678]/54">
                    <span>Dashboard</span>
                    <span>/</span>
                    <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] text-[#103678]/82">Overview</span>
                  </div>
                  <h2 className="mt-2 text-[1.55rem] font-semibold text-[#103678]">Dashboard</h2>
                </div>
                <button className="admin-primary-button">
                  <LayoutDashboard className="h-4 w-4" /> Overview
                </button>
              </div>
              {adminNotice && (
                <div className="mt-4 rounded-[1rem] border border-[#74b4d9]/25 bg-white/82 px-4 py-3 text-sm text-[#103678]">
                  {adminNotice}
                </div>
              )}

              <motion.section variants={staggerReveal} initial="hidden" animate="visible" className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[1.55fr_0.6fr_0.9fr]">
                <motion.div variants={fadeInUp} className="admin-panel rounded-[1.35rem] p-4 md:col-span-2 xl:col-span-1">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[#103678]">Revenue Metrics</p>
                      <p className="mt-1 text-[2.2rem] font-semibold text-[#103678]">{formatCurrency(monthlyRecurringRevenue)}</p>
                      <p className="text-sm text-[#103678]/46">Total MRR</p>
                    </div>
                    <button className="admin-secondary-button">
                      <LineChart className="h-4 w-4" /> Interactive Chart
                    </button>
                  </div>
                  <div className="mt-4 rounded-[1rem] border border-[#103678]/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(237,243,248,0.95))] p-3">
                    <div className="relative h-40 overflow-hidden rounded-[0.95rem]">
                      <div className="absolute inset-0 admin-chart-grid" />
                      <svg viewBox="0 0 520 170" className="absolute inset-0 h-full w-full">
                        <defs>
                          <linearGradient id="kollraxRevenueLine" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#1471ff" />
                            <stop offset="100%" stopColor="#49d8ff" />
                          </linearGradient>
                          <linearGradient id="kollraxRevenueFill" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="rgba(73,216,255,0.36)" />
                            <stop offset="100%" stopColor="rgba(73,216,255,0.02)" />
                          </linearGradient>
                          <filter id="kollraxGlow">
                            <feGaussianBlur stdDeviation="4" result="blur" />
                            <feMerge>
                              <feMergeNode in="blur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                        </defs>
                        <path d={chartAreaPath} fill="url(#kollraxRevenueFill)" />
                        <path d={chartPath} fill="none" stroke="url(#kollraxRevenueLine)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#kollraxGlow)" />
                        {chartPoints.map((point, index) => {
                          const [x, y] = point.split(",");
                          return (
                            <g key={index}>
                              <circle cx={x} cy={y} r="6" fill="rgba(73,216,255,0.18)" />
                              <circle cx={x} cy={y} r="3.5" fill="#68dcff" />
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                    <div className="mt-3 grid grid-cols-10 text-center text-[11px] text-[#103678]/35">
                      {chartLabels.map((label) => (
                        <span key={label}>{label}</span>
                      ))}
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={fadeInUp} className="admin-panel rounded-[1.35rem] p-4">
                  <p className="text-lg font-semibold text-[#103678]">Active Users</p>
                  <div className="mt-6 space-y-6">
                    <div>
                      <p className="text-[2rem] font-semibold text-[#103678]">{state.users.length + 291}</p>
                      <p className="text-sm text-[#103678]/44">Enterprise Accounts</p>
                    </div>
                    <div className="h-px bg-[#103678]/8" />
                    <div>
                      <p className="text-[2rem] font-semibold text-[#103678]">{activeClients + 255}</p>
                      <p className="text-sm text-[#103678]/44">Individual Users</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={fadeInUp} className="admin-panel rounded-[1.35rem] p-4 md:col-span-2 xl:col-span-1">
                  <p className="text-lg font-semibold text-[#103678]">Subscriptions Overview</p>
                  <div className="mt-5 space-y-5">
                    {subscriptionPlans.map((plan) => (
                      <div key={plan.plan}>
                        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                          <span className="text-[#103678]/88">{plan.plan}</span>
                          <span className="text-[#103678]/32">Renewal Tried</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#103678]/8">
                          <div className="h-full rounded-full bg-[linear-gradient(90deg,#1d81e4,#48d1ff)]" style={{ width: `${plan.health * 100}%` }} />
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between rounded-xl border border-[#1d81e4]/18 bg-[#f6fbff] px-3 py-2">
                      <span className="text-sm text-[#103678]/80">Renewal Status</span>
                      <span className="rounded-full bg-emerald-500/18 px-3 py-1 text-xs font-medium text-emerald-700">Renewed</span>
                    </div>
                  </div>
                </motion.div>
              </motion.section>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_0.58fr]">
                <div className="admin-panel rounded-[1.35rem] p-4 md:col-span-2 xl:col-span-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold text-[#103678]">Support Ticket Statistics</p>
                    <MoreHorizontal className="h-4 w-4 text-[#103678]/40" />
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.64fr]">
                    <div className="rounded-[1rem] border border-[#103678]/8 bg-white/70 p-3">
                      <div className="flex h-40 items-end gap-4">
                        {[86, 24, 88, 136, 148, 52].map((open, index) => (
                          <div key={index} className="flex flex-1 items-end justify-center gap-1">
                            <div className="w-3 rounded-t bg-[#1471ff]" style={{ height: `${open}px` }} />
                            <div className="w-3 rounded-t bg-[#49d8ff]" style={{ height: `${[134, 65, 168, 112, 48, 18][index]}px` }} />
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 grid grid-cols-6 text-center text-[11px] text-[#103678]/35">
                        {["Sun", "Mon", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                          <span key={day}>{day}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#103678]">Recent Support Activity</p>
                      <div className="mt-3 space-y-3">
                        {state.tickets.slice(0, 4).map((ticket, index) => (
                          <div key={ticket.id} className="flex gap-3 rounded-[1rem] border border-[#103678]/8 bg-white/72 p-3">
                            <div className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full ${index % 2 === 0 ? "bg-[#43284e]" : "bg-[#4e3d18]"}`}>
                              <LifeBuoy className="h-4 w-4 text-[#ffb26b]" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#103678]">Recent Support Activity</p>
                              <p className="mt-1 text-xs text-[#103678]/52">{ticket.subject}</p>
                              <p className="mt-1 text-xs text-[#103678]/35">Last Support - {index + 1} hours ago</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="admin-panel rounded-[1.35rem] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[#103678]">Service Activity Monitoring</p>
                      <p className="mt-1 text-sm text-[#103678]/38">Track Microsoft 365 services across the platform.</p>
                    </div>
                    <MoreHorizontal className="h-4 w-4 text-[#103678]/40" />
                  </div>
                  <div className="mt-5 space-y-4">
                    {[
                      { icon: Cloud, title: "Migration Requests", meta: "9 migrated", progress: 0.82 },
                      { icon: CheckCircle2, title: "Deployment Status", meta: "Migration deployed", progress: 0.93 },
                      { icon: Workflow, title: "Onboarding Workflow", meta: "2 Progress", progress: 0.74 },
                    ].map((item) => (
                      <div key={item.title} className="rounded-[1rem] border border-[#103678]/8 bg-white/72 p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8f3fb] text-[#1d81e4]">
                            <item.icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-medium text-[#103678]">{item.title}</p>
                              <span className="text-xs text-[#103678]/46">{item.meta}</span>
                            </div>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#103678]/8">
                              <div className="h-full rounded-full bg-[linear-gradient(90deg,#1466cd,#4ad5ff)]" style={{ width: `${item.progress * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="admin-panel rounded-[1.35rem] p-4 md:col-span-2 xl:col-span-1">
                  <p className="text-lg font-semibold text-[#103678]">Quick Action Panel</p>
                  <div className="mt-4 space-y-3">
                    {["Common tasks", "Creates all export", "New development", "Common navigation", "Quick Action Panel"].map((label) => (
                      <button key={label} className="admin-quick-row">
                        <span className="text-sm text-[#103678]/82">{label}</span>
                        <ChevronRight className="h-4 w-4 text-[#103678]/34" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-[1.4fr_0.32fr_0.78fr]">
                <div className="admin-panel rounded-[1.35rem] p-4 md:col-span-2 xl:col-span-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold text-[#103678]">Data Table Management</p>
                    <MoreHorizontal className="h-4 w-4 text-[#103678]/40" />
                  </div>
                  <div className="mt-4 flex flex-col gap-3 lg:flex-row">
                    <div className="admin-table-search">
                      <Search className="h-4 w-4 text-[#103678]/34" />
                      <input
                        value={userSearch}
                        onChange={(event) => setUserSearch(event.target.value)}
                        placeholder="Search"
                        className="w-full bg-transparent text-sm text-[#103678] outline-none placeholder:text-[#103678]/26"
                      />
                    </div>
                    <button className="admin-table-action"><Filter className="h-4 w-4" /> Filter</button>
                    <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as "all" | UserRole)} className="admin-table-action">
                      <option value="all">Account Status</option>
                      <option value="client">Client</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="mt-4 overflow-auto">
                    <table className="min-w-full text-left text-sm text-[#103678]/74">
                      <thead className="text-[#103678]/34">
                        <tr>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">User ID</th>
                          <th className="px-3 py-2">Client</th>
                          <th className="px-3 py-2">Role</th>
                          <th className="px-3 py-2">Account Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className="border-t border-[#103678]/6">
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-3">
                                <ProfileAvatar user={user} size="sm" />
                                <span className="text-[#103678]">{user.fullName}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 font-medium text-[#103678]/78">{user.memberCode}</td>
                            <td className="px-3 py-3 text-[#103678]/54">{user.company}</td>
                            <td className="px-3 py-3">
                              <select value={userRoles[user.id]} onChange={(event) => setUserRoles((prev) => ({ ...prev, [user.id]: event.target.value as UserRole }))} className="admin-inline-select">
                                <option value="client">Assignment</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                <select value={accountStatuses[user.id]} onChange={(event) => setAccountStatuses((prev) => ({ ...prev, [user.id]: event.target.value as "Required" | "Review" | "Paused" }))} className="bg-transparent text-sm text-[#103678] outline-none">
                                  <option>Required</option>
                                  <option>Review</option>
                                  <option>Paused</option>
                                </select>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="admin-panel rounded-[1.35rem] p-4">
                  <p className="text-lg font-semibold text-[#103678]">Identity and Access</p>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-[1rem] border border-[#103678]/8 bg-white/72 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-[#103678]/72">Issued user IDs</span>
                        <span className="text-sm font-semibold text-[#103678]">{state.users.length}</span>
                      </div>
                    </div>
                    <div className="rounded-[1rem] border border-[#103678]/8 bg-white/72 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-[#103678]/72">Profiles with avatar</span>
                        <span className="text-sm font-semibold text-[#103678]">{usersWithAvatars}</span>
                      </div>
                    </div>
                    <div className="rounded-[1rem] border border-[#103678]/8 bg-white/72 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm text-[#103678]/72">Admin accounts</span>
                        <span className="text-sm font-semibold text-[#103678]">{adminUsers}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    {newestUsers.map((user) => (
                      <div key={user.id} className="flex items-center gap-3 rounded-[1rem] border border-[#103678]/8 bg-white/72 px-3 py-3">
                        <ProfileAvatar user={user} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#103678]">{user.fullName}</p>
                          <p className="text-xs text-[#103678]/55">{user.memberCode}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-3">
                    <p className="text-sm font-semibold text-[#103678]">Permissions management</p>
                    {filteredUsers.slice(0, 3).map((user) => (
                      <div key={user.id} className="rounded-[1rem] border border-[#103678]/8 bg-white/72 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <ProfileAvatar user={user} size="sm" />
                            <div>
                              <p className="text-sm font-medium text-[#103678]">{user.fullName}</p>
                              <p className="text-xs text-[#103678]/55">{user.memberCode}</p>
                            </div>
                          </div>
                          <button onClick={() => savePermissionPreset(user.id)} className="admin-table-action">Save</button>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-[#103678]/76">
                          {(["billing", "support", "content", "system"] as const).map((permission) => (
                            <label key={permission} className="flex items-center gap-2 rounded-xl border border-[#103678]/8 bg-white/82 px-3 py-2">
                              <input
                                type="checkbox"
                                checked={permissionMatrix[user.id]?.[permission] ?? false}
                                onChange={(event) =>
                                  setPermissionMatrix((prev) => ({
                                    ...prev,
                                    [user.id]: {
                                      ...prev[user.id],
                                      [permission]: event.target.checked,
                                    },
                                  }))
                                }
                              />
                              <span className="capitalize">{permission}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="admin-panel rounded-[1.35rem] p-4 md:col-span-2 xl:col-span-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold text-[#103678]">Recent Activity Feed</p>
                    <MoreHorizontal className="h-4 w-4 text-[#103678]/40" />
                  </div>
                  <div className="mt-4 space-y-4">
                    {recentActivities.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#3e9cff]" />
                          <span className="mt-2 h-full w-px bg-[#103678]/8" />
                        </div>
                        <div className="pb-2">
                          <p className="text-sm font-medium text-[#103678]">Admin Action</p>
                          <p className="mt-1 text-sm text-[#103678]/44">{item.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr_0.95fr]">
                <div className="admin-panel rounded-[1.35rem] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[#103678]">Consultations and Leads</p>
                      <p className="mt-1 text-sm text-[#103678]/46">Smart intake submissions, qualification, and fast follow-up ownership.</p>
                    </div>
                    <button className="admin-secondary-button">
                      <Users className="h-4 w-4" /> {activeClients} clients
                    </button>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1rem] border border-[#103678]/8 bg-white/72 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#103678]/42">Consultations</p>
                      <p className="mt-2 text-xl font-semibold text-[#103678]">{openConsultations}</p>
                    </div>
                    <div className="rounded-[1rem] border border-[#103678]/8 bg-white/72 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#103678]/42">Open Tickets</p>
                      <p className="mt-2 text-xl font-semibold text-[#103678]">{openTicketsCount}</p>
                    </div>
                    <div className="rounded-[1rem] border border-[#103678]/8 bg-white/72 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#103678]/42">In Progress</p>
                      <p className="mt-2 text-xl font-semibold text-[#103678]">{inProgressTicketsCount}</p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {consultations.map((lead) => (
                      <div key={lead.id} className="rounded-[1rem] border border-[#103678]/8 bg-white/72 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[#103678]">{lead.name}</p>
                            <p className="mt-1 text-xs text-[#103678]/52">{lead.company} · {lead.focus}</p>
                          </div>
                          <span className="rounded-full bg-[#74b4d9]/18 px-3 py-1 text-xs font-medium text-[#103678]">
                            {consultationStatuses[lead.id] ?? lead.stage}
                          </span>
                        </div>
                        <div className="mt-2 grid gap-1 text-sm text-[#103678]/68">
                          <p>{lead.message}</p>
                          <p>Phone: {lead.phone || "Not captured"} · Staff: {lead.staffSize}</p>
                          <p>Budget: {lead.budgetRange} · Urgency: {lead.urgency}</p>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                          <select
                            value={consultationStatuses[lead.id] ?? lead.stage}
                            onChange={(event) =>
                              setConsultationStatuses((prev) => ({
                                ...prev,
                                [lead.id]: event.target.value as LeadStage,
                              }))
                            }
                            className="admin-inline-select"
                          >
                            <option value="New Lead">New Lead</option>
                            <option value="Contacted">Contacted</option>
                            <option value="Consultation Booked">Consultation Booked</option>
                            <option value="Proposal Sent">Proposal Sent</option>
                            <option value="Closed">Closed</option>
                          </select>
                          <input
                            value={consultationOwners[lead.id] ?? lead.owner}
                            onChange={(event) =>
                              setConsultationOwners((prev) => ({
                                ...prev,
                                [lead.id]: event.target.value,
                              }))
                            }
                            placeholder="Owner"
                            className="admin-table-search"
                          />
                          <button onClick={() => updateConsultation(lead.id)} className="admin-table-action">Update</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="admin-panel rounded-[1.35rem] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[#103678]">Microsoft 365 Services</p>
                      <p className="mt-1 text-sm text-[#103678]/46">Service requests, migration operations, deployment tracking, and onboarding workflow.</p>
                    </div>
                    <button className="admin-secondary-button">
                      <Cloud className="h-4 w-4" /> {enabledServices}/{state.services.length} active
                    </button>
                  </div>
                  <div className="mt-4 space-y-3">
                    {state.services.map((service) => (
                      <div key={service.id} className="rounded-[1rem] border border-[#103678]/8 bg-white/72 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[#103678]">{service.title}</p>
                            <p className="mt-1 text-xs text-[#103678]/54">{service.description}</p>
                          </div>
                          <button onClick={() => toggleService(service.id)} className="admin-table-action">
                            {service.enabled ? "Enabled" : "Disabled"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="admin-panel rounded-[1.35rem] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[#103678]">Notifications Center</p>
                      <p className="mt-1 text-sm text-[#103678]/46">Announcements, alerts, platform notices, and admin follow-up triggers.</p>
                    </div>
                    <Bell className="h-4 w-4 text-[#103678]/40" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {notificationItems.map((item) => (
                      <div key={item} className="rounded-[1rem] border border-[#103678]/8 bg-white/72 px-4 py-3 text-sm text-[#103678]/78">
                        {item}
                      </div>
                    ))}
                  </div>
                  <form onSubmit={sendNotification} className="mt-4 grid gap-3">
                    <input
                      value={notificationDraft.title}
                      onChange={(event) => setNotificationDraft((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Notification title"
                      className="admin-table-search"
                    />
                    <select
                      value={notificationDraft.audience}
                      onChange={(event) => setNotificationDraft((prev) => ({ ...prev, audience: event.target.value }))}
                      className="admin-inline-select"
                    >
                      <option>All workspace users</option>
                      <option>Admins only</option>
                      <option>Lead follow-up team</option>
                    </select>
                    <textarea
                      value={notificationDraft.message}
                      onChange={(event) => setNotificationDraft((prev) => ({ ...prev, message: event.target.value }))}
                      placeholder="Compose a platform-wide notification"
                      rows={3}
                      className="dashboard-input rounded-2xl px-4 py-3 text-sm outline-none"
                    />
                    <button className="admin-primary-button" type="submit">
                      <Mail className="h-4 w-4" /> Send notification
                    </button>
                  </form>
                  <div className="mt-4 space-y-2">
                    {sentNotifications.slice(0, 3).map((item) => (
                      <div key={item.id} className="rounded-[1rem] border border-[#103678]/8 bg-white/72 px-4 py-3">
                        <p className="text-sm font-semibold text-[#103678]">{item.title}</p>
                        <p className="mt-1 text-sm text-[#103678]/68">{item.message}</p>
                        <p className="mt-1 text-xs text-[#103678]/48">{item.audience}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_1fr]">
                <div className="admin-panel rounded-[1.35rem] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold text-[#103678]">Support Workflow</p>
                    <MoreHorizontal className="h-4 w-4 text-[#103678]/40" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {state.tickets.map((ticket) => (
                      <div key={ticket.id} className="rounded-[1rem] border border-[#103678]/8 bg-white/72 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[#103678]">{ticket.subject}</p>
                            <p className="mt-1 text-xs text-[#103678]/36">{ticket.id} - {ticket.priority} priority</p>
                          </div>
                          <select value={ticket.status} onChange={(event) => updateTicketStatus(ticket.id, event.target.value as TicketStatus)} className="admin-inline-select">
                            <option>Open</option>
                            <option>In Progress</option>
                            <option>Resolved</option>
                          </select>
                        </div>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <input
                            value={replyDrafts[ticket.id] ?? ""}
                            onChange={(event) => setReplyDrafts((prev) => ({ ...prev, [ticket.id]: event.target.value }))}
                            placeholder="Add admin reply"
                            className="admin-table-search"
                          />
                          <button onClick={() => submitReply(ticket.id)} className="admin-primary-button">Send reply</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="admin-panel rounded-[1.35rem] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold text-[#103678]">Architecture Notes</p>
                    <MoreHorizontal className="h-4 w-4 text-[#103678]/40" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {[
                      "Paystack integration architecture",
                      "Flutterwave integration architecture",
                      "Recurring billing orchestration",
                      "Microsoft 365 onboarding workflow",
                      "Audit logs and notification system",
                    ].map((item) => (
                      <div key={item} className="rounded-[1rem] border border-[#103678]/8 bg-white/72 px-4 py-3 text-sm text-[#103678]/78">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
                <div className="admin-panel rounded-[1.35rem] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[#103678]">Payments and Billing</p>
                      <p className="mt-1 text-sm text-[#103678]/46">Payment tracking, invoice overview, and recurring billing management.</p>
                    </div>
                    <Wallet className="h-4 w-4 text-[#103678]/40" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {paymentRecords.map((payment) => (
                      <div key={payment.id} className="rounded-[1rem] border border-[#103678]/8 bg-white/72 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-[#103678]">{payment.id}</p>
                            <p className="mt-1 text-xs text-[#103678]/54">{payment.client} · {payment.gateway}</p>
                          </div>
                          <span className="rounded-full bg-[#74b4d9]/18 px-3 py-1 text-xs font-medium text-[#103678]">{paymentStatuses[payment.id]}</span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-[#103678]">{formatCurrency(payment.amount)}</p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr]">
                          <select
                            value={paymentStatuses[payment.id]}
                            onChange={(event) =>
                              setPaymentStatuses((prev) => ({
                                ...prev,
                                [payment.id]: event.target.value as "Paid" | "Processing" | "Pending" | "Failed",
                              }))
                            }
                            className="admin-inline-select"
                          >
                            <option value="Paid">Paid</option>
                            <option value="Processing">Processing</option>
                            <option value="Pending">Pending</option>
                            <option value="Failed">Failed</option>
                          </select>
                          <select
                            value={subscriptionAssignments[payment.id]}
                            onChange={(event) =>
                              setSubscriptionAssignments((prev) => ({
                                ...prev,
                                [payment.id]: event.target.value,
                              }))
                            }
                            className="admin-inline-select"
                          >
                            <option value="Enterprise">Enterprise</option>
                            <option value="Premium">Premium</option>
                            <option value="Growth">Growth</option>
                          </select>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button onClick={() => applyPaymentAction(payment.id, "capture")} className="admin-table-action">Capture</button>
                          <button onClick={() => applyPaymentAction(payment.id, "remind")} className="admin-table-action">Remind</button>
                          <button onClick={() => applyPaymentAction(payment.id, "retry")} className="admin-table-action">Retry</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="rounded-[1rem] border border-[#103678]/8 bg-white/72 px-4 py-3 text-sm text-[#103678]/78">Paystack integration architecture</div>
                    <div className="rounded-[1rem] border border-[#103678]/8 bg-white/72 px-4 py-3 text-sm text-[#103678]/78">Flutterwave integration architecture</div>
                    <div className="rounded-[1rem] border border-[#103678]/8 bg-white/72 px-4 py-3 text-sm text-[#103678]/78">Recurring billing management</div>
                  </div>
                </div>

                <div className="admin-panel rounded-[1.35rem] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[#103678]">Content Management</p>
                      <p className="mt-1 text-sm text-[#103678]/46">Manage website content, testimonials, FAQs, service information, announcements, and blog architecture.</p>
                    </div>
                    <Bot className="h-4 w-4 text-[#103678]/40" />
                  </div>
                  <div className="mt-4 space-y-2">
                    {contentAreas.map((item) => (
                      <button
                        key={item}
                        onClick={() => setActiveContentArea(item)}
                        className={cn("admin-vertical-link", activeContentArea === item && "border-[#74b4d9]/45 bg-[linear-gradient(135deg,rgba(116,180,217,0.24),rgba(255,255,255,0.9))]")}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 rounded-[1rem] border border-[#103678]/8 bg-white/72 p-3">
                    <p className="text-sm font-semibold text-[#103678]">{activeContentArea}</p>
                    <textarea
                      value={contentEntries[activeContentArea]}
                      onChange={(event) =>
                        setContentEntries((prev) => ({
                          ...prev,
                          [activeContentArea]: event.target.value,
                        }))
                      }
                      rows={6}
                      className="dashboard-input mt-3 rounded-2xl px-4 py-3 text-sm outline-none"
                    />
                    <div className="mt-3 flex justify-end">
                      <button onClick={saveContentArea} className="admin-primary-button">Save draft</button>
                    </div>
                  </div>
                </div>

                <div className="admin-panel rounded-[1.35rem] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[#103678]">System Management</p>
                      <p className="mt-1 text-sm text-[#103678]/46">Audit logs, permissions, security overview, notification system, and platform settings.</p>
                    </div>
                    <ShieldCheck className="h-4 w-4 text-[#103678]/40" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {permissionItems.map((item) => (
                      <div key={item} className="rounded-[1rem] border border-[#103678]/8 bg-white/72 px-4 py-3 text-sm text-[#103678]/78">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardScaffold>
  );
}

export default function App() {
  return <AppShell />;
}
