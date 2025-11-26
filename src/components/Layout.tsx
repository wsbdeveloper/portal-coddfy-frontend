/**
 * Layout principal da aplicação
 * Inclui header, sidebar e área de conteúdo
 */
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  FileText, 
  Users,
  DollarSign,
  Building2,
  UserCircle,
  LogOut 
} from 'lucide-react';
import { UserRole } from '@/types';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Verificar se o usuário é admin
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  // Comparar com o valor do enum (string)
  const isAdminGlobal = user?.role === UserRole.ADMIN_GLOBAL || user?.role === 'admin_global';
  const isAdmin = isAdminGlobal || 
                  user?.role === UserRole.ADMIN_PARTNER || 
                  user?.role === 'admin_partner';

  const navigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
    },
    {
      name: 'Contratos',
      href: '/contracts',
      icon: FileText,
    },
    {
      name: 'Consultores',
      href: '/consultants',
      icon: Users,
    },
    {
      name: 'Faturamento',
      href: '/billing',
      icon: DollarSign,
    },
    // Apenas admin pode ver clientes
    ...(isAdmin
      ? [
          {
            name: 'Clientes',
            href: '/clients',
            icon: UserCircle,
          },
        ]
      : []),
    // Apenas admin global pode ver parceiros
    ...(isAdminGlobal
      ? [
          {
            name: 'Parceiros',
            href: '/partners',
            icon: Building2,
          },
        ]
      : []),
  ];

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">
              Coddfy Contracts Manager CCM
            </span>
          </div>
          <div className="flex-1" />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <div className="container flex">
        {/* Sidebar */}
        <aside className="w-64 border-r min-h-[calc(100vh-4rem)]">
          <nav className="space-y-2 p-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}


