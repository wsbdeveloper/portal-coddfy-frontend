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
  /*const isAdmin = isAdminGlobal || 
                  user?.role === UserRole.ADMIN_PARTNER || 
                  user?.role === 'admin_partner';*/

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
    ...((user?.role === UserRole.ADMIN_GLOBAL || user?.role === 'admin_global')
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-blue-900">
        <div className="container flex h-16 items-center">
          {/* Logo no canto superior esquerdo */}
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-white" />
            <span className="text-xl font-bold text-white">
              CCM
            </span>
            <span className="text-sm text-blue-200 ml-2">
              (Contracts Manager)
            </span>
          </div>
          <div className="flex-1" />
          {/* Nome do usuário e foto ao lado do botão sair */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2">
                <UserCircle className="h-8 w-8 text-white" />
                <span className="text-sm text-white font-medium">
                  {user.username}
                </span>
              </div>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="gap-2 text-white hover:bg-blue-800"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="container flex flex-1">
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
        <main className="flex-1 p-8 relative">
          <Outlet />
        </main>
      </div>

      {/* Copyright no canto inferior */}
      <footer className="border-t bg-background py-4">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Coddfy Contracts Manager. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}


