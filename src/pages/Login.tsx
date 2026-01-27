/**
 * Página de Login
 * Autentica usuários no sistema
 */
import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { LoginCredentials, LoginResponse } from '@/types';
import api from '@/lib/api';
import logo from '@/assets/logo.jpeg';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.post<LoginResponse>('/auth/login', credentials);
      
      // Armazena o token e dados do usuário
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Redireciona para o dashboard
      navigate('/');
    } catch (err: any) {
      setError(
        err.response?.data?.error || 'Erro ao fazer login. Verifique suas credenciais.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-900 relative">
      {/* Logo acima do login */}
      <div className="absolute top-8 flex items-center justify-center w-full">
        <div className="flex items-center gap-3">
          <img 
            src={logo} 
            alt="CCM Logo" 
            className="h-16 w-auto object-contain"
          />
        </div>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <CardTitle className="text-center text-2xl">Bem-vindo</CardTitle>
          <CardDescription className="text-center">
            Faça login para acessar o sistema de gestão de contratos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuário</Label>
              <Input
                id="username"
                type="text"
                placeholder="Digite seu usuário"
                value={credentials.username}
                onChange={(e) =>
                  setCredentials({ ...credentials, username: e.target.value })
                }
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                value={credentials.password}
                onChange={(e) =>
                  setCredentials({ ...credentials, password: e.target.value })
                }
                required
                disabled={loading}
              />
            </div>
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <p>Usuário padrão: admin</p>
            <p>Senha padrão: admin123</p>
          </div>
        </CardContent>
      </Card>

      {/* Copyright no canto inferior */}
      <div className="absolute bottom-4 text-center text-sm text-blue-200">
        <p>© {new Date().getFullYear()} Coddfy Contracts Manager. Todos os direitos reservados.</p>
      </div>
    </div>
  );
}

















