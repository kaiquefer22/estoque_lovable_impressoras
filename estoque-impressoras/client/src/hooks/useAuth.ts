import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export function useAuth() {
  const [, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const utils = trpc.useUtils();
  
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation();

  useEffect(() => {
    setIsChecking(isLoading);
  }, [isLoading]);

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
      setLocation("/login");
    }
  };

  // Removido redirecionamento automático - deixa para ProtectedRoute

  return {
    user,
    isLoading: isChecking,
    isAuthenticated: !!user,
    loading: isChecking,
    logout,
  };
}
