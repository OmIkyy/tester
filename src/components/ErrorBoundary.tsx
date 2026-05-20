import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("UI ErrorBoundary caught:", error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="max-w-md text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Terjadi kesalahan</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {this.state.error?.message ?? "Aplikasi mengalami error tak terduga."}
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => window.location.reload()}>Muat ulang</Button>
              <Button onClick={this.reset}>Coba lagi</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}