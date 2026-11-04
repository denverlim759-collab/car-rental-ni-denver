import React, { useState, useEffect } from 'react';
import { 
  Car, 
  Bike, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  Receipt, 
  LogOut, 
  Sparkles,
  Calendar,
  Fuel,
  Gauge,
  ShieldCheck,
  ChevronRight,
  RotateCcw,
  ArrowRight,
  Info,
  X
} from 'lucide-react';
import { User, Vehicle, Rental, VehicleType } from '../../types';
import { db } from '../../services/db';
import { RentVehicleModal } from './RentVehicleModal';
import { RentalReceiptModal } from '../common/RentalReceiptModal';
import { 
  formatPhilippineDateTime, 
  formatDurationMinutes, 
  calculateLateFee 
} from '../../utils/time';

interface CustomerPortalProps {
  user: User;
  onLogout: () => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  user,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'available_cars' | 'rent_car' | 'rental_history'>('available_cars');
  
  // Data states
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);

  // Filtering states
  const [selectedType, setSelectedType] = useState<'all' | 'car' | 'motorcycle'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'year'>('price_asc');

  // Modals
  const [rentingVehicle, setRentingVehicle] = useState<Vehicle | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<Rental | null>(null);
  const [returningRental, setReturningRental] = useState<Rental | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [returnSuccessMsg, setReturnSuccessMsg] = useState<string | null>(null);

  const loadData = () => {
    setVehicles(db.getVehicles());
    setRentals(db.getRentalsByUser(user.id));
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('nosql_store_updated', handleUpdate);
    return () => window.removeEventListener('nosql_store_updated', handleUpdate);
  }, [user.id]);

  // Filter vehicles
  const availableVehicles = vehicles.filter(v => {
    if (v.status !== 'available') return false;
    if (selectedType !== 'all' && v.type !== selectedType) return false;
    if (categoryFilter !== 'all' && v.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = `${v.make} ${v.model}`.toLowerCase().includes(q);
      const matchPlate = v.licensePlate.toLowerCase().includes(q);
      const matchLocation = v.location.toLowerCase().includes(q);
      if (!matchName && !matchPlate && !matchLocation) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'price_asc') return a.dailyRate - b.dailyRate;
    if (sortBy === 'price_desc') return b.dailyRate - a.dailyRate;
    return b.year - a.year;
  });

  const activeRentals = rentals.filter(r => r.status === 'active');
  const pastRentals = rentals.filter(r => r.status === 'completed' || r.status === 'cancelled');

  const handleConfirmReturnSubmit = (rental: Rental, returnNotes?: string) => {
    const actualReturnDateTime = new Date().toISOString();
    const result = db.completeRentalReturn(rental.id, {
      returnNotes: returnNotes || 'Customer completed self-return check-in. Vehicle moved to detailing bay.',
      returnFuelLevel: 95,
      actualReturnDateTime,
      processedBy: `Customer (${user.fullName})`
    });

    setReturningRental(null);
    loadData();

    if (result && (result.lateReturnFee ?? 0) > 0) {
      setReturnSuccessMsg(`Vehicle ${rental.vehicleName} returned. A late fee of ₱${result.lateReturnFee} was applied. Final amount: ₱${result.finalRentalAmount}.`);
    } else {
      setReturnSuccessMsg(`Vehicle ${rental.vehicleName} returned on-time (within grace period). Thank you!`);
    }

    setTimeout(() => setReturnSuccessMsg(null), 6000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base">AutoMotion</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Customer Portal
                </span>
              </div>
              <p className="text-xs text-slate-400">Customer Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* User Profile Pill */}
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold">
                {user.fullName.charAt(0)}
              </div>
              <div>
                <span className="font-semibold text-slate-200 block leading-tight">{user.fullName}</span>
                <span className="text-[10px] text-slate-400 font-mono">@{user.username}</span>
              </div>
              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                user.verificationStatus === 'verified' 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-amber-500/20 text-amber-400'
              }`}>
                {user.verificationStatus}
              </span>
            </div>

            {/* Logout */}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Banner with Customer Verification Notice */}
        {user.verificationStatus === 'pending' && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="font-bold">Driver&apos;s License Review in Progress</p>
                <p className="text-amber-300/80 text-[11px]">
                  Your credentials have been submitted and are pending verification by Fleet Staff. You may still browse available vehicles and submit reservations.
                </p>
              </div>
            </div>
            <span className="shrink-0 text-[10px] uppercase font-mono px-2 py-1 rounded bg-amber-500/20 text-amber-300">
              Pending Staff Review
            </span>
          </div>
        )}

        {returnSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{returnSuccessMsg}</span>
          </div>
        )}

        {/* Navigation Bar */}
        <div className="p-2 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('available_cars')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'available_cars'
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Available Vehicles</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'available_cars' ? 'bg-black/20 text-black' : 'bg-slate-800 text-slate-400'
              }`}>
                {vehicles.filter(v => v.status === 'available').length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('rent_car')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'rent_car'
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Rent a Vehicle</span>
            </button>

            <button
              onClick={() => setActiveTab('rental_history')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'rental_history'
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Rental History</span>
              {activeRentals.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {activeRentals.length} Active
                </span>
              )}
            </button>
          </div>
        </div>

        {/* =========================================================================
            FUNCTION 1 & 2: VIEW AVAILABLE CARS & MOTORS / RENT A CAR
        ========================================================================== */}
        {(activeTab === 'available_cars' || activeTab === 'rent_car') && (
          <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* Type Switcher */}
              <div className="sm:col-span-4 flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  onClick={() => setSelectedType('all')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    selectedType === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All Fleet
                </button>
                <button
                  onClick={() => setSelectedType('car')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
                    selectedType === 'car' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  Cars
                </button>
                <button
                  onClick={() => setSelectedType('motorcycle')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 ${
                    selectedType === 'motorcycle' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" />
                  Motors
                </button>
              </div>

              {/* Search input */}
              <div className="sm:col-span-5 relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search model, brand, or hub..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Sort selector */}
              <div className="sm:col-span-3">
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:border-cyan-500"
                >
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="year">Newest Model Year</option>
                </select>
              </div>
            </div>

            {/* Vehicle Grid */}
            {availableVehicles.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                <Car className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-base font-bold text-slate-300">
                  {vehicles.length === 0 ? 'No vehicles currently in the fleet' : 'No available vehicles found matching filter'}
                </h4>
                <p className="text-xs text-slate-500">
                  {vehicles.length === 0 
                    ? 'Fleet vehicles can be registered dynamically by the Head Admin in the Admin portal.' 
                    : 'Try adjusting your category filter or search keywords.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableVehicles.map(vehicle => (
                  <div
                    key={vehicle.id}
                    className="rounded-3xl bg-slate-900/90 border border-slate-800 overflow-hidden hover:border-slate-700 hover:shadow-2xl hover:shadow-cyan-500/5 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Image Header with Badge */}
                      <div className="relative h-48 overflow-hidden bg-slate-950">
                        <img
                          src={vehicle.imageUrl}
                          alt={`${vehicle.make} ${vehicle.model}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3 flex gap-1.5">
                          <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/10 flex items-center gap-1">
                            {vehicle.type === 'car' ? <Car className="w-3 h-3 text-cyan-400" /> : <Bike className="w-3 h-3 text-amber-400" />}
                            {vehicle.category.toUpperCase()}
                          </span>
                        </div>

                        <div className="absolute top-3 right-3">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold backdrop-blur-md">
                            Available Now
                          </span>
                        </div>

                        <div className="absolute bottom-2 left-3 right-3 flex justify-between text-[11px] text-white/90 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-xl">
                          <span className="font-mono">{vehicle.licensePlate}</span>
                          <span>{vehicle.location}</span>
                        </div>
                      </div>

                      {/* Vehicle Body Info */}
                      <div className="p-5 space-y-4">
                        <div>
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                                {vehicle.make} {vehicle.model}
                              </h3>
                              <p className="text-xs text-slate-400">Year {vehicle.year}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-black text-cyan-400 font-mono">₱{vehicle.dailyRate}</span>
                              <span className="text-xs text-slate-400">/day</span>
                              <p className="text-[10px] text-slate-500 font-mono">₱{vehicle.hourlyRate}/hr</p>
                            </div>
                          </div>
                          <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                            {vehicle.description}
                          </p>
                        </div>

                        {/* Specs badges */}
                        <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-300">
                          <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
                            <span className="text-[10px] text-slate-500 block">Gearbox</span>
                            <span className="font-semibold">{vehicle.transmission}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
                            <span className="text-[10px] text-slate-500 block">Fuel / Power</span>
                            <span className="font-semibold">{vehicle.fuelType}</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800 text-center">
                            <span className="text-[10px] text-slate-500 block">Capacity</span>
                            <span className="font-semibold">{vehicle.seats} {vehicle.seats === 1 ? 'Seat' : 'Seats'}</span>
                          </div>
                        </div>

                        {/* Features Tags */}
                        <div className="flex flex-wrap gap-1.5">
                          {vehicle.features.slice(0, 3).map((feat, idx) => (
                            <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                              {feat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Rent Action Button */}
                    <div className="p-5 pt-0">
                      <button
                        onClick={() => setRentingVehicle(vehicle)}
                        className="w-full py-3 px-4 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Rent this Vehicle</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            FUNCTION 3: VIEW RENTAL HISTORY
        ========================================================================== */}
        {activeTab === 'rental_history' && (
          <div className="space-y-6">
            {/* Active Rentals Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active Rentals ({activeRentals.length})
                </h3>
                <span className="text-xs text-slate-400">Current on-road vehicles</span>
              </div>

              {activeRentals.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
                  You currently have no active rentals. Browse available cars above to make a reservation.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeRentals.map(rental => {
                    const expectedIso = rental.expectedReturnDateTime || new Date(rental.endDate).toISOString();
                    const liveLateCalc = calculateLateFee(expectedIso, new Date().toISOString());

                    return (
                      <div
                        key={rental.id}
                        className="p-5 rounded-2xl bg-slate-900 border border-emerald-500/40 shadow-xl space-y-4 relative overflow-hidden"
                      >
                        <div className="flex gap-4">
                          <img
                            src={rental.vehicleImage}
                            alt={rental.vehicleName}
                            className="w-24 h-24 rounded-xl object-cover border border-slate-800"
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-cyan-400 font-bold">{rental.bookingCode}</span>
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                Active On Road
                              </span>
                            </div>
                            <h4 className="font-bold text-white text-sm">{rental.vehicleName}</h4>
                            <p className="text-xs text-slate-400 font-mono">Plate: {rental.vehiclePlate}</p>
                            <div className="flex items-center gap-2 text-[10px] text-cyan-400 font-mono">
                              <span>Station: {rental.pickupLocation}</span>
                            </div>
                          </div>
                        </div>

                        {/* Schedule & Grace Period Box */}
                        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="text-[10px] text-slate-500 block uppercase font-semibold">Pickup Schedule</span>
                              <span className="text-white font-mono font-medium">
                                {rental.pickupDateTime ? formatPhilippineDateTime(rental.pickupDateTime) : new Date(rental.startDate).toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 block uppercase font-semibold">Expected Return</span>
                              <span className="text-cyan-300 font-mono font-bold">
                                {rental.expectedReturnDateTime ? formatPhilippineDateTime(rental.expectedReturnDateTime) : new Date(rental.endDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          {/* Grace period indicator */}
                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80 text-[10px]">
                            <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              59-min Grace Period (₱0 fee)
                            </span>
                            {liveLateCalc.isLate ? (
                              <span className="text-rose-400 font-mono font-bold">
                                Overdue: ₱{liveLateCalc.lateReturnFee} est. ({liveLateCalc.chargeableLateHours}h late)
                              </span>
                            ) : liveLateCalc.withinGracePeriod ? (
                              <span className="text-amber-400 font-medium">
                                In Grace Period ({59 - liveLateCalc.lateMinutes}m remaining)
                              </span>
                            ) : (
                              <span className="text-emerald-400 font-mono">
                                Within schedule
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex justify-between items-center">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Original Rental Amount</span>
                            <span className="font-mono font-bold text-emerald-400">
                              ₱{(rental.baseRentalAmount ?? rental.totalAmount).toFixed(2)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 block">Return Drop-off</span>
                            <span className="text-slate-200 font-medium">{rental.returnLocation}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => setViewingReceipt(rental)}
                            className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Receipt className="w-3.5 h-3.5 text-cyan-400" />
                            <span>View Receipt</span>
                          </button>
                          <button
                            onClick={() => setReturningRental(rental)}
                            className="py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Return Vehicle</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Past Completed Rentals Section */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Past Rental Records ({pastRentals.length})
                </h3>
              </div>

              {pastRentals.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
                  No completed rentals recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {pastRentals.map(rental => (
                    <div
                      key={rental.id}
                      className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5 flex-1">
                        <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                          {rental.vehicleType === 'car' ? <Car className="w-5 h-5 text-cyan-400" /> : <Bike className="w-5 h-5 text-amber-400" />}
                        </div>
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-white text-sm">{rental.vehicleName}</h4>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold">
                              {rental.bookingCode}
                            </span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                              rental.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                            }`}>
                              {rental.status}
                            </span>
                          </div>

                          {/* Scheduling & Audit Matrix */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                            <div>
                              <span className="text-[10px] text-slate-500 block">Pickup Date &amp; Time</span>
                              <span className="text-white font-mono text-[11px]">
                                {rental.pickupDateTime ? formatPhilippineDateTime(rental.pickupDateTime) : new Date(rental.startDate).toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 block">Expected Return</span>
                              <span className="text-cyan-300 font-mono text-[11px]">
                                {rental.expectedReturnDateTime ? formatPhilippineDateTime(rental.expectedReturnDateTime) : new Date(rental.endDate).toLocaleDateString()}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 block">Actual Return</span>
                              <span className="text-amber-300 font-mono text-[11px]">
                                {rental.actualReturnDateTime ? formatPhilippineDateTime(rental.actualReturnDateTime) : 'Completed'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 block">Grace Period</span>
                              <span className="text-emerald-400 font-medium">59 Minutes</span>
                            </div>
                          </div>

                          {/* Late Fee & Amounts Breakdown */}
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                            <span>
                              Late Duration: <strong className={rental.lateMinutes && rental.lateMinutes > 0 ? 'text-amber-400' : 'text-slate-300'}>{formatDurationMinutes(rental.lateMinutes ?? 0)}</strong>
                            </span>
                            <span>
                              Chargeable Hours: <strong className="text-white">{rental.chargeableLateHours ?? 0} hr(s)</strong>
                            </span>
                            <span>
                              Late Return Fee: <strong className={(rental.lateReturnFee ?? 0) > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>₱{(rental.lateReturnFee ?? 0).toFixed(2)}</strong>
                            </span>
                            <span>
                              Original: <strong className="text-slate-300 font-mono">₱{((rental.baseRentalAmount ?? (rental.totalAmount - (rental.lateReturnFee ?? 0)))).toFixed(2)}</strong>
                            </span>
                            <span className="text-white">
                              Final Total: <strong className="text-emerald-400 font-mono text-xs">₱{(rental.finalRentalAmount ?? rental.totalAmount).toFixed(2)}</strong>
                            </span>
                          </div>

                          {rental.returnNotes && (
                            <p className="text-[11px] text-slate-400 italic">
                              Return Remarks: {rental.returnNotes}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => setViewingReceipt(rental)}
                        className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 hover:text-white transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Print Receipt</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Booking Modal */}
      {rentingVehicle && (
        <RentVehicleModal
          vehicle={rentingVehicle}
          user={user}
          onClose={() => setRentingVehicle(null)}
          onSuccess={(newRental) => {
            setRentingVehicle(null);
            loadData();
            setActiveTab('rental_history');
            setViewingReceipt(newRental);
          }}
        />
      )}

      {/* Return Vehicle Modal */}
      {returningRental && (
        <CustomerReturnModal
          rental={returningRental}
          onClose={() => setReturningRental(null)}
          onConfirm={(notes) => handleConfirmReturnSubmit(returningRental, notes)}
        />
      )}

      {/* Digital Receipt Modal */}
      {viewingReceipt && (
        <RentalReceiptModal
          rental={viewingReceipt}
          onClose={() => setViewingReceipt(null)}
        />
      )}

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-white text-base">End Customer Session?</h4>
              <p className="text-xs text-slate-400">
                You will be logged out of your Customer dashboard and returned to the home screen.
              </p>
            </div>
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onLogout}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors"
              >
                Confirm Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface CustomerReturnModalProps {
  rental: Rental;
  onClose: () => void;
  onConfirm: (notes?: string) => void;
}

const CustomerReturnModal: React.FC<CustomerReturnModalProps> = ({
  rental,
  onClose,
  onConfirm,
}) => {
  const [returnNotes, setReturnNotes] = useState('');
  const [actualTimeIso] = useState(new Date().toISOString());

  const expectedIso = rental.expectedReturnDateTime || new Date(rental.endDate).toISOString();
  const lateCalc = calculateLateFee(expectedIso, actualTimeIso);
  const baseAmount = rental.baseRentalAmount ?? rental.totalAmount;
  const finalAmount = baseAmount + lateCalc.lateReturnFee;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 sm:p-7 text-slate-100 my-8 space-y-5 animate-in zoom-in-95">
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Vehicle Return Check-in</h3>
              <p className="text-xs text-slate-400 font-mono">Ref: {rental.bookingCode}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Schedule Audit Box */}
        <div className="space-y-3 text-xs bg-slate-950 p-4 rounded-2xl border border-slate-800">
          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">Rented Vehicle:</span>
            <span className="font-semibold text-white">{rental.vehicleName}</span>
          </div>

          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">Pickup Schedule:</span>
            <span className="font-mono text-slate-200">
              {rental.pickupDateTime ? formatPhilippineDateTime(rental.pickupDateTime) : new Date(rental.startDate).toLocaleDateString()}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">Expected Return:</span>
            <span className="font-mono text-cyan-300 font-semibold">
              {rental.expectedReturnDateTime ? formatPhilippineDateTime(rental.expectedReturnDateTime) : new Date(rental.endDate).toLocaleDateString()}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-300">
            <span className="text-slate-400">Actual Return (Current):</span>
            <span className="font-mono text-amber-300 font-bold">
              {formatPhilippineDateTime(actualTimeIso)}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
            <div className="flex justify-between items-center text-slate-300">
              <span>Grace Period:</span>
              <span className="text-emerald-400 font-semibold">59 Minutes Included</span>
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span>Total Elapsed Late Time:</span>
              <span className={lateCalc.lateMinutes > 0 ? 'text-amber-400 font-semibold' : 'text-slate-400'}>
                {formatDurationMinutes(lateCalc.lateMinutes)}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span>Chargeable Late Hours:</span>
              <span className="text-white font-mono">{lateCalc.chargeableLateHours} hr(s)</span>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-slate-800/80">
              <span className="font-semibold text-slate-300">Late Return Penalty:</span>
              <span className={`font-mono font-bold ${lateCalc.lateReturnFee > 0 ? 'text-rose-400 text-sm' : 'text-emerald-400'}`}>
                {lateCalc.lateReturnFee > 0 ? `₱${lateCalc.lateReturnFee.toFixed(2)} (₱20/hr)` : '₱0.00 (Within Grace Period)'}
              </span>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Base Rental Amount:</span>
            <span className="font-mono text-slate-200">₱{baseAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Additional Late Fee:</span>
            <span className={`font-mono ${lateCalc.lateReturnFee > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}`}>
              +₱{lateCalc.lateReturnFee.toFixed(2)}
            </span>
          </div>
          <div className="pt-1.5 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
            <span>Final Rental Total:</span>
            <span className="font-mono text-cyan-400 text-base">₱{finalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Customer Return Remarks */}
        <div>
          <label className="block text-[11px] text-slate-400 mb-1">Customer Drop-off Remarks (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Returned at airport terminal bay 4, keys dropped in safe box"
            value={returnNotes}
            onChange={(e) => setReturnNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(returnNotes)}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-xs font-bold text-black transition-all shadow-lg shadow-amber-500/20"
          >
            Confirm Return Check-in
          </button>
        </div>
      </div>
    </div>
  );
};
