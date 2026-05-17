import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, LogIn, UserPlus } from "lucide-react";

export default function LoginPage() {
  const [location, setLocation] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const utils = trpc.useUtils();
  
  // Verificar se usuário já está autenticado
  const { data: user, isLoading: authLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false,
  });
  
  useEffect(() => {
    if (!authLoading && user) {
      // Usuário já está autenticado, redirecionar para dashboard
      setLocation("/");
    }
  }, [user, authLoading, setLocation]);

  // Quando login foi bem-sucedido e auth.me retorna o usuário, redirecionar
  useEffect(() => {
    if (loginSuccess && user) {
      setLocation("/");
    }
  }, [loginSuccess, user, setLocation]);

  const loginMutation = trpc.auth.loginWithPassword.useMutation({
    onSuccess: async () => {
      toast.success("Login realizado com sucesso!");
      setLoginSuccess(true);
      // Refetch auth.me para obter o usuário atualizado
      await utils.auth.me.invalidate();
      // Usar refetch para garantir que a query é reexecutada
      await utils.auth.me.refetch();
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
      setLoginSuccess(false);
    },
  });

  const registerMutation = trpc.auth.registerWithPassword.useMutation({
    onSuccess: () => {
      toast.success("Cadastro realizado com sucesso! Aguarde a aprovação de um administrador para fazer login.");
      setIsLogin(true);
      setEmail("");
      setPassword("");
      setName("");
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (!isLogin && !name) {
      toast.error("Preencha o nome para cadastro");
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        await loginMutation.mutateAsync({ email, password });
      } else {
        await registerMutation.mutateAsync({ email, name, password });
      }
    } catch {
      // Error already handled in onError callbacks
    } finally {
      setIsLoading(false);
    }
  };

  // Se está verificando autenticação, mostrar loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-blue-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          <p className="text-gray-600 font-medium">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Se login foi bem-sucedido, mostrar loading enquanto redireciona
  if (loginSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 to-blue-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          <p className="text-gray-600 font-medium">Entrando no sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <picture>
              <source srcSet="/manus-storage/studiolaser-final_39f9a5d9.webp" type="image/webp" />
              <img src="/manus-storage/studiolaser-final_10947199.png" alt="StudioLaser" className="w-16 h-16" />
            </picture>
            <span className="text-xl font-bold text-violet-600">Estoque de Insumos</span>
          </div>
          <CardTitle className="text-2xl">
            {isLogin ? "Bem-vindo" : "Criar Conta"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "Faça login com seu email e senha"
              : "Crie uma nova conta para começar"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-sm font-medium text-gray-700">Nome</label>
                <Input
                  type="text"
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <Input
                type="email"
                placeholder="seu.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Senha</label>
              <Input
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="mt-1"
              />
              {!isLogin && (
                <p className="text-xs text-gray-500 mt-1">
                  A senha deve ter pelo menos 8 caracteres
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando...
                </>
              ) : isLogin ? (
                <>
                  <LogIn className="w-4 h-4" />
                  Entrar
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Cadastrar
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">ou</span>
              </div>
            </div>

            {isLogin && (
              <div className="text-center">
                <Link to="/forgot-password" className="text-sm text-violet-600 hover:underline">
                  Esqueceu sua senha?
                </Link>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsLogin(!isLogin);
                setEmail("");
                setPassword("");
                setName("");
              }}
              className="w-full"
              disabled={isLoading}
            >
              {isLogin
                ? "Não tem conta? Cadastre-se"
                : "Já tem conta? Faça login"}
            </Button>
          </form>


        </CardContent>
      </Card>
    </div>
  );
}
