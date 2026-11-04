import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  ArrowLeft, 
  LogIn, 
  AlertTriangle, 
  RefreshCcw, 
  ArrowRight,
  User
} from 'lucide-react';
import { db } from '../../services/db';
import { User as UserType, UserRole } from '../../types';

interface LoginScreenProps {
  initialUsername?: string;
  onBackToWelcome: () => void;
  onLoginSuccess: (user: UserType) => void;
  onGoToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  initialUsername = '',
  onBackToWelcome,
  onLoginSuccess,
  onGoToRegister,
}) => {
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState('');
  
  // Verification states
  const [verifying, setVerifying] = useState(false);
  const [loginError, setLoginError] = useState<{
    role: UserRole | 'unknown';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (initialUsername) {
      setUsername(initialUsername);
    }
  }, [initialUsername]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setLoginError({
        role: 'unknown',
        message: 'Please enter your username/User ID.'
      });
      return;
    }
    if (!password) {
      setLoginError({
        role: 'unknown',
        message: 'Please enter your password.'
      });
      return;
    }

    setVerifying(true);

    setTimeout(() => {
      // Determine the type of account being used (Customer, Staff, Admin)
      const user = db.getUserByUsername(cleanUsername);

      if (!user) {
        setVerifying(false);
        setLoginError({
          role: 'unknown',
          message: `Account with username "${cleanUsername}" was not found in the database. Please register first.`
        });
        return;
      }

      const accountType: UserRole = user.role;
      const isPasswordCorrect = user.password === password;

      if (!isPasswordCorrect) {
        setVerifying(false);
        if (accountType === 'customer') {
          setLoginError({
            role: 'customer',
            message: 'Invalid credentials. The password entered does not match Customer records.'
          });
        } else if (accountType === 'staff') {
          setLoginError({
            role: 'staff',
            message: 'Staff authentication failed. Incorrect staff credentials.'
          });
        } else if (accountType === 'admin') {
          setLoginError({
            role: 'admin',
            message: 'Head Admin access denied. Invalid Admin password.'
          });
        }
        return;
      }

      // Check account suspension status
      if (user.status === 'banned' || user.status === 'suspended') {
        setVerifying(false);
        setLoginError({
          role: accountType,
          message: `This ${accountType} account is currently ${user.status}. Please contact system support.`
        });
        return;
      }

      // Login Verified!
      db.setCurrentUser(user);
      setVerifying(false);
      onLoginSuccess(user);
    }, 300);
  };

  const handleReturnToLogin = () => {
    setLoginError(null);
    setPassword('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-cyan-500 selection:text-black">
      <div className="max-w-md mx-auto w-full">
        {/* Navigation Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={onBackToWelcome}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            Authentication Portal
          </div>
        </div>

        {/* Error Interface */}
        {loginError ? (
          <div className="rounded-3xl bg-slate-900 border border-rose-500/60 p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[11px] font-mono">
                Authentication Error &bull; {loginError.role.toUpperCase()}
              </div>
              <h3 className="text-xl font-bold text-white">Login Verification Failed</h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                {loginError.message}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleReturnToLogin}
                className="w-full py-3.5 px-6 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <RefreshCcw className="w-4 h-4 text-cyan-400" />
                <span>Return to Login Page</span>
              </button>
            </div>
          </div>
        ) : (
          /* Login Interface */
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <LogIn className="w-4 h-4" />
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">System Login</h2>
              </div>
              <p className="text-xs text-slate-400">
                Enter your username or User ID and password.
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Username / User ID</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    autoFocus
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-white placeholder-slate-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm text-white placeholder-slate-500 transition-colors"
                  />
                </div>
              </div>

              {/* Role Auto-Detection Indicator */}
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span className="text-[11px]">Account Type Detection:</span>
                <span className="font-semibold text-cyan-300 font-mono text-[11px]">
                  Customer &bull; Staff &bull; Admin
                </span>
              </div>

              <button
                type="submit"
                disabled={verifying}
                className="w-full py-3.5 px-6 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {verifying ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Don&apos;t have an account?</span>
              <button
                onClick={onGoToRegister}
                className="font-semibold text-cyan-400 hover:text-cyan-300 hover:underline transition-colors cursor-pointer"
              >
                Register Account
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
