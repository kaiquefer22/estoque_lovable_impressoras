import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle, Loader } from "lucide-react";

export function VerifyEmailPage() {
  const [location] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  // Extrair token da URL
  const params = new URLSearchParams(location.split("?")[1]);
  const token = params.get("token");

  const verifyEmailMutation = (trpc.auth as any).verifyEmail?.useMutation({
    onSuccess: () => {
      setStatus("success");
      setMessage("Email verificado com sucesso! Você será redirecionado para o login.");
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
    },
    onError: (error: any) => {
      setStatus("error");
      setMessage(error.message || "Erro ao verificar email");
    },
  }) || { mutate: () => {}, isPending: false };

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Token de verificação inválido ou não fornecido");
      return;
    }

    // Verificar email automaticamente
    if (verifyEmailMutation.mutate) {
      verifyEmailMutation.mutate({ token });
    }
  }, [token, verifyEmailMutation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2">
            {status === "loading" && <Loader className="h-5 w-5 text-purple-600 animate-spin" />}
            {status === "success" && <CheckCircle className="h-5 w-5 text-green-600" />}
            {status === "error" && <AlertCircle className="h-5 w-5 text-red-600" />}
            <CardTitle>
              {status === "loading" && "Verificando Email"}
              {status === "success" && "Email Verificado"}
              {status === "error" && "Erro na Verificação"}
            </CardTitle>
          </div>
          <CardDescription>
            {status === "loading" && "Aguarde enquanto verificamos seu email..."}
            {status === "success" && "Seu email foi verificado com sucesso!"}
            {status === "error" && "Não conseguimos verificar seu email"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert
            variant={status === "error" ? "destructive" : "default"}
            className={status === "success" ? "border-green-200 bg-green-50" : ""}
          >
            {status === "success" && <CheckCircle className="h-4 w-4 text-green-600" />}
            {status === "error" && <AlertCircle className="h-4 w-4" />}
            <AlertDescription
              className={status === "success" ? "text-green-800" : ""}
            >
              {message}
            </AlertDescription>
          </Alert>

          {status === "loading" && (
            <div className="flex justify-center py-4">
              <div className="animate-spin">
                <Loader className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                O link de verificação pode ter expirado ou ser inválido. Tente registrar-se novamente.
              </p>
              <Button
                onClick={() => (window.location.href = "/login")}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                Voltar ao Login
              </Button>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Você será redirecionado para a página de login em alguns segundos.
              </p>
              <Button
                onClick={() => (window.location.href = "/login")}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Ir para Login Agora
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
