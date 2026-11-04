import React, { useEffect, useState } from 'react';
import { 
  Car, 
  Bike, 
  ShieldCheck, 
  Clock, 
  ChevronRight, 
  UserCheck, 
  Sparkles,
  ArrowRight,
  Database,
  Layers,
  Activity
} from 'lucide-react';
import { db } from '../../services/db';
import { Vehicle } from '../../types';

interface WelcomeScreenProps {
  onChooseLogin: () => void;
  onChooseRegister: () => void;
  onResetDb: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onChooseLogin,
  onChooseRegister,
  onResetDb
}) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    setVehicles(db.getVehicles());
    const handleUpdate = () => setVehicles(db.getVehicles());
    window.addEventListener('nosql_store_updated', handleUpdate);
    return () => window.removeEventListener('nosql_store_updated', handleUpdate);
  }, []);

  const availableCars = vehicles.filter(v => v.type === 'car' && v.status === 'available');
  const availableMotors = vehicles.filter(v => v.type === 'motorcycle' && v.status === 'available');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-black">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-cyan-300 bg-clip-text text-transparent">
                  AutoMotion
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
                  NoSQL System
                </span>
              </div>
              <p className="text-xs text-slate-400">Motor &amp; Car Rental Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onChooseLogin}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              Login
            </button>
            <button
              onClick={onChooseRegister}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              Register
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero & Selection */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 flex-1 flex flex-col justify-center">
        {/* System Status Badge */}
        <div className="flex items-center gap-2 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-500/30 text-cyan-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            AutoMotion Portal &bull; Register or Sign In
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Headlines & Action Choices */}
          <div className="lg:col-span-7 space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Motor &amp; Car Rental{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500 bg-clip-text text-transparent">
                Management System.
              </span>
            </h1>

            <p className="text-lg text-slate-300 max-w-2xl leading-relaxed">
              Multi-role rental architecture with real-time NoSQL data persistence. Features distinct interfaces for Customer bookings, Staff fleet inspection, and Head Admin operations.
            </p>

            {/* Entry Choices Card */}
            <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-4 max-w-xl">
              <div className="text-xs uppercase tracking-wider font-bold text-slate-400 flex items-center justify-between">
                <span>Get Started</span>
                <span className="text-cyan-400 font-mono">NoSQL Document Store</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option: Register */}
                <button
                  onClick={onChooseRegister}
                  className="group relative p-5 rounded-2xl bg-gradient-to-b from-slate-800/90 to-slate-800/40 border border-slate-700/80 hover:border-cyan-500/80 text-left transition-all hover:shadow-xl hover:shadow-cyan-500/10 flex flex-col justify-between cursor-pointer"
                >
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors">
                      Register Account
                    </div>
                    <p className="text-xs text-slate-400 leading-normal">
                      New customer sign-up with legal identity and driver&apos;s license details.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
                    <span>Create Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>

                {/* Option: Login */}
                <button
                  onClick={onChooseLogin}
                  className="group relative p-5 rounded-2xl bg-gradient-to-b from-slate-800/90 to-slate-800/40 border border-slate-700/80 hover:border-blue-500/80 text-left transition-all hover:shadow-xl hover:shadow-blue-500/10 flex flex-col justify-between cursor-pointer"
                >
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div className="font-bold text-white text-base group-hover:text-blue-300 transition-colors">
                      Sign In / Login
                    </div>
                    <p className="text-xs text-slate-400 leading-normal">
                      Access Customer, Staff, or Head Admin portals.
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-blue-400 group-hover:translate-x-1 transition-transform">
                    <span>Open Login Interface</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              </div>

              {/* Roles Summary */}
              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Customer Portal
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span> Staff Dashboard
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span> Head Admin Control
                </span>
              </div>
            </div>

            {/* Architecture Highlights */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-400">
                  <Car className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Dynamic Fleet</h4>
                  <p className="text-[11px] text-slate-400">Cars &amp; Motorbikes</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Document Audit</h4>
                  <p className="text-[11px] text-slate-400">Staff verification</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-indigo-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Head Admin Reports</h4>
                  <p className="text-[11px] text-slate-400">Live operational ledger</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Dynamic System State */}
          <div className="lg:col-span-5 space-y-4">
            {vehicles.length > 0 ? (
              <div className="space-y-4">
                {vehicles.slice(0, 2).map((v) => (
                  <div key={v.id} className="relative rounded-3xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-900 group">
                    <img
                      src={v.imageUrl}
                      alt={v.model}
                      className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-semibold text-white border border-white/10 flex items-center gap-1">
                        {v.type === 'car' ? <Car className="w-3.5 h-3.5 text-cyan-400" /> : <Bike className="w-3.5 h-3.5 text-amber-400" />}
                        {v.category.toUpperCase()}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold backdrop-blur-md">
                        {v.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                      <div>
                        <h3 className="text-base font-bold text-white">{v.make} {v.model}</h3>
                        <p className="text-xs text-slate-300 font-mono">Plate: {v.licensePlate}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-cyan-400 font-mono">${v.dailyRate}</span>
                        <span className="text-xs text-slate-400">/day</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Clean Dynamic System Status Panel when empty */
              <div className="p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-6 text-center">
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto">
                  <Database className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Dynamic Database Ready</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    All static demo records have been cleared. Register customer accounts dynamically, or log in as Head Admin to add live fleet vehicles.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-left">
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">Fleet Inventory</span>
                    <span className="text-lg font-black text-white font-mono">0 Vehicles</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Ready for Admin entry</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-left">
                    <span className="text-[10px] font-mono text-slate-500 block uppercase">Rental Ledger</span>
                    <span className="text-lg font-black text-white font-mono">0 Bookings</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Real-time ledger</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-left text-xs font-mono text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Admin Login:</span>
                    <span className="text-indigo-400">admin / admin123</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Staff Login:</span>
                    <span className="text-amber-400">staff / staff123</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>AutoMotion Motor and Car Rental System &copy; 2026. Dynamic NoSQL Architecture.</p>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Customer Portal</span>
            <span>&bull;</span>
            <span>Staff Inspector</span>
            <span>&bull;</span>
            <span>Head Admin Hub</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
