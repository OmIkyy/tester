import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ExternalLink } from "lucide-react";

const schema = z.object({
  email: z.string().trim().email("Email tidak valid").max(255),
  password: z.string().min(6, "Min 6 karakter").max(72),
});

// 🔗 GANTI URL di bawah ini dengan link website absensi karyawan Anda
const ABSENSI_URL = "https://absensi-karyawan.example.com";

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = "Masuk · DG-KOMPUTER";
  }, []);

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parse = schema.safeParse({ email, password });
    if (!parse.success) {
      toast.error(parse.error.errors[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast.error("Login gagal", { description: error.message });
      return;
    }
    await logActivity("login", `User ${email} masuk ke sistem`);
    toast.success("Selamat datang kembali!");
    navigate("/", { replace: true });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <div className="absolute inset-0 -z-10 bg-gradient-hero opacity-[0.07]" />
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />

      <div className="w-full max-w-md flex flex-col items-center gap-4 animate-scale-in">
        <Card className="w-full border-border/60 shadow-elevated">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex items-center justify-center">
              <img
                src="/logo.svg"
                alt="DG-KOMPUTER"
                className="h-16 w-auto object-contain"
              />
            </div>
            <div className="space-y-1">
              <CardTitle className="font-display text-2xl">DG-KOMPUTER</CardTitle>
              <CardDescription>Sistem manajemen pelanggan internet</CardDescription>
            </div>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="anda@perusahaan.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full h-11" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Masuk
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Belum punya akun?{" "}
                <Link to="/signup" className="font-medium text-primary hover:underline">
                  Daftar
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>

        {/* Link ke website absensi karyawan (di luar card login) */}
        <a
          href={ABSENSI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-border/60 bg-card/80 backdrop-blur px-4 py-3 text-sm font-medium text-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground"
        >
          <ExternalLink className="h-4 w-4" />
          Absensi Karyawan
        </a>
      </div>
    </div>
  );
}
