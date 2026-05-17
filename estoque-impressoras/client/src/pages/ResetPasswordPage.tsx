import { useState } from "react";
import { useLocation, useRouter } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle, Eye, EyeOff, Lock } from "lucide-react";

export function ResetPasswordPage() {
  const [location] = useLocation();
  const navigate = (path: string) => window.location.href = path;
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    feedback: string[];
    strength: string;
  } | null>(null);

  // Extrair token da URL
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const resetPasswordMutation = (trpc.auth as any).resetPassword?.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setError("");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    },
    onError: (error: any) => {
      setError(error.message || "Erro ao redefinir senha");
    },
  }) || { mutate: () => {}, isPending: false };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewPassword(value);

    // Validar força de senha
    const strength = {
      score: 0,
      feedback: [] as string[],
      strength: "Fraca",
    };

    if (value.length >= 8) strength.score++;
    else strength.feedback.push("Mínimo 8 caracteres");

    if (/[A-Z]/.test(value)) strength.score++;
    else strength.feedback.push("Adicione letra maiúscula");

    if (/[a-z]/.test(value)) strength.score++;
    else strength.feedback.push("Adicione letra minúscula");

    if (/[0-9]/.test(value)) strength.score++;
    else strength.feedback.push("Adicione número");

    if (/[!@#$%^&*(),.?":{}|<>]/.test(value)) strength.score++;
    else strength.feedback.push("Adicione caractere especial");

    if (strength.score === 5) strength.strength = "Muito Forte";
    else if (strength.score === 4) strength.strength = "Forte";
    else if (strength.score === 3) strength.strength = "Média";
    else if (strength.score === 2) strength.strength = "Fraca";
    else strength.strength = "Muito Fraca";

    setPasswordStrength(strength);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Token de reset inválido ou expirado");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("As senhas não correspondem");
      return;
    }

    if (newPassword.length < 8) {
      setError("A senha deve ter no mínimo 8 caracteres");
      return;
    }

    if (resetPasswordMutation.mutate) {
      resetPasswordMutation.mutate({
        token,
        newPassword,
      });
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Link Inválido</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                O link de reset de senha é inválido ou expirou. Solicite um novo link.
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => navigate("/login")}
              className="w-full mt-4"
            >
              Voltar ao Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-purple-600" />
            <CardTitle>Redefinir Senha</CardTitle>
          </div>
          <CardDescription>
            Digite sua nova senha abaixo
          </CardDescription>
        </CardHeader>

        <CardContent>
          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Senha redefinida com sucesso! Redirecionando para login...
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nova Senha */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Nova Senha</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua nova senha"
                  value={newPassword}
                  onChange={handlePasswordChange}
                  disabled={resetPasswordMutation.isPending || success}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Indicador de Força de Senha */}
            {passwordStrength && newPassword && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-600">Força da senha:</span>
                  <span className={`text-xs font-semibold ${
                    passwordStrength.score === 5 ? "text-green-600" :
                    passwordStrength.score === 4 ? "text-blue-600" :
                    passwordStrength.score === 3 ? "text-yellow-600" :
                    "text-red-600"
                  }`}>
                    {passwordStrength.strength}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      passwordStrength.score === 5 ? "bg-green-600 w-full" :
                      passwordStrength.score === 4 ? "bg-blue-600 w-4/5" :
                      passwordStrength.score === 3 ? "bg-yellow-600 w-3/5" :
                      "bg-red-600 w-2/5"
                    }`}
                  />
                </div>
                {passwordStrength.feedback.length > 0 && (
                  <ul className="text-xs text-gray-600 space-y-1">
                    {passwordStrength.feedback.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-1">
                        <span className="text-red-500">•</span> {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Confirmar Senha */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirmar Senha</label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirme sua nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={resetPasswordMutation.isPending || success}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Botão de Envio */}
            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={resetPasswordMutation.isPending || success || !newPassword || !confirmPassword}
            >
              {resetPasswordMutation.isPending ? "Redefinindo..." : "Redefinir Senha"}
            </Button>

            {/* Link para Login */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate("/login")}
              disabled={resetPasswordMutation.isPending || success}
            >
              Voltar ao Login
            </Button>
          </form>

          {/* Informações de Segurança */}
          <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800">
              <strong>Dica de segurança:</strong> Use uma senha forte com letras maiúsculas, minúsculas, números e caracteres especiais.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
