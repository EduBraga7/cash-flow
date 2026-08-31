'use client';

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Wallet, Loader2, Eye, EyeOff, CheckCircle2, ArrowRight, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export function LoginView() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Reset Password Dialog
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const getFirebaseErrorMessage = (err: any) => {
    const code = err?.code || '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'E-mail ou senha incorretos.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'Este e-mail já está cadastrado. Faça login.';
    }
    if (code === 'auth/weak-password') {
      return 'A senha deve ter pelo menos 6 caracteres.';
    }
    if (code === 'auth/invalid-email') {
      return 'Formato de e-mail inválido.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Login com Google cancelado.';
    }
    if (code === 'auth/operation-not-allowed') {
      return 'Provedor não ativado no Firebase Console (acesse Authentication > Sign-in method e ative Email/Senha ou Google).';
    }
    return err?.message || 'Ocorreu um erro ao autenticar.';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      toast.error('Preencha seu e-mail e senha.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(loginEmail, loginPassword);
      toast.success('Login realizado com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail.trim() || !regPassword) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    if (regPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(regName, regEmail, regPassword);
      toast.success('Conta criada com sucesso! Bem-vindo ao CashFlow.');
    } catch (err: any) {
      console.error(err);
      toast.error(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      toast.success('Login com Google realizado com sucesso!');
    } catch (err: any) {
      console.error(err);
      toast.error(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast.error('Digite seu e-mail para recuperação.');
      return;
    }

    setResetLoading(true);
    try {
      await resetPassword(resetEmail);
      toast.success('E-mail de redefinição enviado! Verifique sua caixa de entrada.');
      setResetOpen(false);
      setResetEmail('');
    } catch (err: any) {
      console.error(err);
      toast.error(getFirebaseErrorMessage(err));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4 sm:p-6 overflow-hidden">
      {/* Background glow accents */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-emerald-500/5 blur-[100px]" />

      <div className="w-full max-w-md space-y-6 relative z-10 animate-fade-in">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/30 shadow-lg shadow-primary/10">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            CashFlow
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestão inteligente de entradas e receitas recorrentes
          </p>
        </div>

        {/* Auth Card */}
        <Card className="border-border/60 bg-card/70 backdrop-blur-xl shadow-2xl">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'login' | 'register')}
            className="w-full"
          >
            <div className="border-b border-border/60 px-6 pt-4">
              <TabsList className="grid w-full grid-cols-2 bg-secondary/50">
                <TabsTrigger value="login" className="text-xs font-medium">
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="register" className="text-xs font-medium">
                  Criar Conta
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Google Quick Button */}
            <div className="p-6 pb-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full gap-3 border-border/70 bg-secondary/30 py-5 text-sm font-medium hover:bg-secondary/60 hover:text-foreground"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Continuar com o Google
              </Button>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/60" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    ou continue com e-mail
                  </span>
                </div>
              </div>
            </div>

            {/* TAB: LOGIN */}
            <TabsContent value="login" className="m-0 px-6 pb-6 pt-0">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    disabled={loading}
                    className="bg-secondary/40"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password">Senha</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(loginEmail);
                        setResetOpen(true);
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      disabled={loading}
                      className="bg-secondary/40 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Alternar visualização da senha"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gap-2 bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 py-5"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Acessar Painel</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* TAB: REGISTER */}
            <TabsContent value="register" className="m-0 px-6 pb-6 pt-0">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reg-name">Seu Nome</Label>
                  <Input
                    id="reg-name"
                    type="text"
                    placeholder="Ex: Eduardo"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    disabled={loading}
                    className="bg-secondary/40"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-email">E-mail</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    disabled={loading}
                    className="bg-secondary/40"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reg-password">Criar Senha</Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      disabled={loading}
                      className="bg-secondary/40 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Alternar visualização da senha"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full gap-2 bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 py-5"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Criar Minha Conta</span>
                      <CheckCircle2 className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Footer info */}
        <p className="text-center text-xs text-muted-foreground">
          CashFlow · Seus dados protegidos e sincronizados na nuvem
        </p>
      </div>

      {/* Reset Password Modal */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="border-border bg-card text-card-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recuperar Senha</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Digite seu e-mail cadastrado. Enviaremos um link seguro para você
              redefinir sua senha.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPassword} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="reset-email">E-mail</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="seu@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                disabled={resetLoading}
                className="bg-secondary/40"
                required
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setResetOpen(false)}
                disabled={resetLoading}
                className="text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={resetLoading}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {resetLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Enviar Link'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
