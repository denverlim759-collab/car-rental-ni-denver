/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from './services/db';
import { User } from './types';
import { WelcomeScreen } from './components/auth/WelcomeScreen';
import { RegisterScreen } from './components/auth/RegisterScreen';
import { LoginScreen } from './components/auth/LoginScreen';
import { CustomerPortal } from './components/customer/CustomerPortal';
import { StaffPortal } from './components/staff/StaffPortal';
import { AdminPortal } from './components/admin/AdminPortal';

type AppScreen = 
  | 'welcome' 
  | 'register' 
  | 'login' 
  | 'customer_dashboard' 
  | 'staff_dashboard' 
  | 'admin_dashboard';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('welcome');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [prefilledUsername, setPrefilledUsername] = useState<string>('');

  // Load existing session if any
  useEffect(() => {
    const existing = db.getCurrentUser();
    if (existing) {
      setCurrentUser(existing);
      if (existing.role === 'customer') {
        setCurrentScreen('customer_dashboard');
      } else if (existing.role === 'staff') {
        setCurrentScreen('staff_dashboard');
      } else if (existing.role === 'admin') {
        setCurrentScreen('admin_dashboard');
      }
    } else {
      setCurrentScreen('welcome');
    }
  }, []);

  const handleChooseLogin = () => {
    setCurrentScreen('login');
  };

  const handleChooseRegister = () => {
    setCurrentScreen('register');
  };

  const handleRegisteredProceedToLogin = (username?: string) => {
    if (username) setPrefilledUsername(username);
    setCurrentScreen('login');
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (user.role === 'customer') {
      setCurrentScreen('customer_dashboard');
    } else if (user.role === 'staff') {
      setCurrentScreen('staff_dashboard');
    } else if (user.role === 'admin') {
      setCurrentScreen('admin_dashboard');
    }
  };

  const handleLogout = () => {
    db.setCurrentUser(null);
    setCurrentUser(null);
    setCurrentScreen('welcome');
  };

  const handleResetDb = () => {
    if (window.confirm('Reset all sample fleet, users, and rental records to initial default states?')) {
      db.resetToDefault();
      handleLogout();
    }
  };

  return (
    <div className="relative min-h-screen bg-slate-950 font-sans text-slate-100">
      {/* 1. Welcome Screen */}
      {currentScreen === 'welcome' && (
        <WelcomeScreen
          onChooseLogin={handleChooseLogin}
          onChooseRegister={handleChooseRegister}
          onResetDb={handleResetDb}
        />
      )}

      {/* 2. Register Screen */}
      {currentScreen === 'register' && (
        <RegisterScreen
          onBackToWelcome={() => setCurrentScreen('welcome')}
          onProceedToLogin={handleRegisteredProceedToLogin}
        />
      )}

      {/* 3. Login Screen */}
      {currentScreen === 'login' && (
        <LoginScreen
          initialUsername={prefilledUsername}
          onBackToWelcome={() => setCurrentScreen('welcome')}
          onGoToRegister={() => setCurrentScreen('register')}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {/* 4. Customer Portal */}
      {currentScreen === 'customer_dashboard' && currentUser && (
        <CustomerPortal
          user={currentUser}
          onLogout={handleLogout}
        />
      )}

      {/* 5. Staff Portal */}
      {currentScreen === 'staff_dashboard' && currentUser && (
        <StaffPortal
          user={currentUser}
          onLogout={handleLogout}
        />
      )}

      {/* 6. Head Admin Portal */}
      {currentScreen === 'admin_dashboard' && currentUser && (
        <AdminPortal
          user={currentUser}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
