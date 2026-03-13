import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { XlviLoader } from "react-awesome-loaders";
import { useAuth } from "../context/AuthContext";

type Mode = "signin" | "signup";

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: Location } };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (mode === "signup") {
        const ageNumber = age ? Number(age) : 0;
        await signUp({
          name: name.trim(),
          age: Number.isFinite(ageNumber) ? ageNumber : 0,
          email: email.trim(),
          password,
        });
      } else {
        await signIn(email.trim(), password);
      }
      const dest = location.state?.from?.pathname ?? "/";
      navigate(dest, { replace: true });
    } catch (err) {
      console.error(err);
      setError("Could not sign in. Please check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await signInWithGoogle();
      const dest = location.state?.from?.pathname ?? "/";
      navigate(dest, { replace: true });
    } catch (err) {
      console.error(err);
      setError("Google sign-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-(--bg) px-4 animate-fade-in">
      <div className="w-full max-w-md rounded-[2.5rem] bg-(--surface) border border-(--border) p-8 space-y-8 shadow-2xl relative overflow-hidden">
        {/* Background Decorative Element */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-(--accent) opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-(--accent-dim) opacity-10 rounded-full blur-3xl"></div>

        <div className="text-center space-y-3 relative">
          <div className="w-16 h-16 bg-linear-to-br from-(--accent) to-(--accent-dim) rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg shadow-(--accent)/20">
            📊
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-linear-to-r from-(--accent) to-(--accent-dim) bg-clip-text text-transparent">
            Expense Tracker
          </h1>
          <p className="text-sm text-(--text-muted) font-medium">
            {mode === "signin"
              ? "Welcome back! Let's manage your wealth."
              : "Start your journey to financial freedom today."}
          </p>
        </div>

        <div className="flex rounded-2xl bg-(--bg) p-1.5 border border-(--border) shadow-inner relative">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
              mode === "signin" ? "bg-(--accent) text-white shadow-lg" : "text-(--text-muted) hover:text-(--text)"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
              mode === "signup" ? "bg-(--accent) text-white shadow-lg" : "text-(--text-muted) hover:text-(--text)"
            }`}
          >
            Sign up
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium text-center animate-shake">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5 relative"
        >
          {mode === "signup" && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-(--text-muted) uppercase ml-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-2xl bg-(--bg) border border-(--border) focus:ring-2 focus:ring-(--accent) outline-none transition-all font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-(--text-muted) uppercase ml-1">Age</label>
                <input
                  type="number"
                  placeholder="25"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-5 py-3.5 rounded-2xl bg-(--bg) border border-(--border) focus:ring-2 focus:ring-(--accent) outline-none transition-all font-medium"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-(--text-muted) uppercase ml-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="hello@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-3.5 rounded-2xl bg-(--bg) border border-(--border) focus:ring-2 focus:ring-(--accent) outline-none transition-all font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-(--text-muted) uppercase ml-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-3.5 rounded-2xl bg-(--bg) border border-(--border) focus:ring-2 focus:ring-(--accent) outline-none transition-all font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-2xl bg-linear-to-r from-(--accent) to-(--accent-dim) text-white font-bold shadow-xl shadow-(--accent)/20 hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {submitting ? (
              <XlviLoader
                boxColors={["#fff"]}
                desktopSize="20px"
                mobileSize="18px"
              />
            ) : mode === "signin" ? (
              "Sign In"
            ) : (
              "Create Account"
            )}
          </button>
        </form>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-(--border)"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase font-bold text-(--text-muted)">
            <span className="bg-(--surface) px-4">Or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={submitting}
          className="w-full py-4 rounded-2xl bg-(--bg) border border-(--border) text-(--text) font-bold shadow-sm hover:bg-(--surface-hover) transition-colors flex items-center justify-center gap-3"
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            className="w-5 h-5"
            alt="Google"
          />
          Google
        </button>
      </div>
    </div>
  );
}
