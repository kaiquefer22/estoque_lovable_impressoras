import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const requestResetMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      toast.success("Email de reset enviado com sucesso!");
      setIsSubmitted(true);
      setEmail("");
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Preencha o email");
      return;
    }

    setIsLoading(true);
    try {
      await requestResetMutation.mutateAsync({ email, origin: window.location.origin });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-violet-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">📠</span>
            </div>
            <span className="text-xl font-bold text-violet-600">Estoque Impressoras</span>
          </div>
          <CardTitle className="text-2xl">
            {isSubmitted ? "Email Enviado" : "Recuperar Senha"}
          </CardTitle>
          <CardDescription>
            {isSubmitted
              ? "Verifique seu email para o link de reset de senha"
              : "Digite seu email para receber um link de reset de senha"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Enviar Link de Reset
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/login")}
                className="w-full gap-2"
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para Login
              </Button>
            </form>
          ) : (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <p className="text-gray-600">
                Um email com instruções para resetar sua senha foi enviado para <strong>{email}</strong>
              </p>
              <p className="text-sm text-gray-500">
                O link expira em 24 horas. Se não receber o email, verifique sua pasta de spam.
              </p>
              <Button
                onClick={() => setLocation("/login")}
                className="w-full bg-violet-600 hover:bg-violet-700"
              >
                Voltar para Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
