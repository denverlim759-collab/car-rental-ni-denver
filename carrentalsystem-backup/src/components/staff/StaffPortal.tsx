import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Car, 
  Bike, 
  ShieldCheck, 
  UserCheck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  Edit3, 
  LogOut, 
  Fuel, 
  Gauge, 
  AlertTriangle, 
  FileText, 
  PlusCircle, 
  Eye, 
  Check, 
  X, 
  Sparkles,
  RotateCcw,
  Receipt
} from 'lucide-react';
import { User, Vehicle, VehicleStatus, VerificationStatus, Rental } from '../../types';
import { db } from '../../services/db';
import { RentalReceiptModal } from '../common/RentalReceiptModal';
import { 
  calculateLateFee, 
  formatPhilippineDateTime, 
  formatDurationMinutes 
} from '../../utils/time';

interface StaffPortalProps {
  user: User;
  onLogout: () => void;
}

export const StaffPortal: React.FC<StaffPortalProps> = ({
  user,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'verify_customers' | 'return_checkin' | 'update_cars_status'>('verify_customers');

  // Database collections
  const [customers, setCustomers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);

  // Rentals & Return state
  const [returningRental, setReturningRental] = useState<Rental | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<Rental | null>(null);
  const [rentalSearch, setRentalSearch] = useState('');
  const [rentalStatusFilter, setRentalStatusFilter] = useState<'all' | 'active' | 'completed'>('active');

  // Verification tab state
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [staffNoteInput, setStaffNoteInput] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  // Update Car Status tab state
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<string>('all');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<'all' | 'car' | 'motorcycle'>('all');

  // Condition Form State
  const [tempFuel, setTempFuel] = useState<number>(100);
  const [tempMileage, setTempMileage] = useState<number>(0);
  const [newMaintenanceNote, setNewMaintenanceNote] = useState('');
  const [newDamageNote, setNewDamageNote] = useState('');
  const [damageSeverity, setDamageSeverity] = useState<'minor' | 'moderate' | 'major'>('minor');

  // Logout dialog
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = () => {
    setCustomers(db.getCustomers());
    setVehicles(db.getVehicles());
    setRentals(db.getRentals());
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('nosql_store_updated', handleUpdate);
    return () => window.removeEventListener('nosql_store_updated', handleUpdate);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleProcessStaffReturn = (
    rental: Rental,
    returnDetails: {
      returnNotes: string;
      returnMileage: number;
      returnFuelLevel: number;
      damageNote?: string;
      damageSeverity?: 'minor' | 'moderate' | 'major';
    }
  ) => {
    const actualReturnDateTime = new Date().toISOString();
    
    // Process return atomically with idempotency protection
    const completed = db.completeRentalReturn(rental.id, {
      returnNotes: returnDetails.returnNotes,
      returnMileage: returnDetails.returnMileage,
      returnFuelLevel: returnDetails.returnFuelLevel,
      actualReturnDateTime,
      processedBy: `Staff (${user.fullName})`
    });

    if (returnDetails.damageNote) {
      db.addDamageReport(rental.vehicleId, {
        date: new Date().toISOString().split('T')[0],
        description: returnDetails.damageNote,
        severity: returnDetails.damageSeverity || 'minor',
        reportedBy: user.fullName
      });
    }

    setReturningRental(null);
    loadData();

    if (completed && (completed.lateReturnFee ?? 0) > 0) {
      showToast(`Return logged. ₱${completed.lateReturnFee} late fee applied (${completed.chargeableLateHours}h late). Final Total: ₱${completed.finalRentalAmount}.`);
    } else {
      showToast(`Return logged on-time (within grace period). Final Total: ₱${completed?.finalRentalAmount ?? rental.totalAmount}.`);
    }
  };

  const handleVerifyCustomer = (customerId: string, status: VerificationStatus) => {
    db.updateCustomerVerification(customerId, status, staffNoteInput || undefined);
    loadData();
    if (selectedCustomer && selectedCustomer.id === customerId) {
      setSelectedCustomer(prev => prev ? { ...prev, verificationStatus: status, staffNotes: staffNoteInput || prev.staffNotes } : null);
    }
    showToast(`Customer status updated to "${status.toUpperCase()}".`);
  };

  // Step 17 - Function 2: Update Vehicle Status
  const handleUpdateVehicleStatus = (vehicleId: string, newStatus: VehicleStatus) => {
    db.updateVehicleStatus(vehicleId, newStatus, {
      staffName: user.fullName,
      note: `Staff updated status to ${newStatus}`
    });
    loadData();
    if (editingVehicle && editingVehicle.id === vehicleId) {
      setEditingVehicle(prev => prev ? { ...prev, status: newStatus } : null);
    }
    showToast(`Vehicle status set to ${newStatus.toUpperCase()}`);
  };

  const handleSaveVehicleCondition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;

    db.updateVehicleStatus(editingVehicle.id, editingVehicle.status, {
      fuelLevel: tempFuel,
      mileage: tempMileage,
      staffName: user.fullName,
      note: newMaintenanceNote ? `Condition update: ${newMaintenanceNote}` : undefined
    });

    if (newMaintenanceNote) {
      db.addMaintenanceLog(editingVehicle.id, {
        date: new Date().toISOString().split('T')[0],
        description: newMaintenanceNote,
        cost: 0,
        staffName: user.fullName
      });
      setNewMaintenanceNote('');
    }

    if (newDamageNote) {
      db.addDamageReport(editingVehicle.id, {
        date: new Date().toISOString().split('T')[0],
        description: newDamageNote,
        severity: damageSeverity,
        reportedBy: user.fullName
      });
      setNewDamageNote('');
    }

    loadData();
    showToast(`Vehicle condition updated successfully.`);
    setEditingVehicle(null);
  };

  const handleMarkReady = (vehicle: Vehicle) => {
    db.updateVehicleStatus(vehicle.id, 'available', {
      fuelLevel: 100,
      note: 'Inspected, cleaned and marked available for rental by Staff.',
      staffName: user.fullName
    });
    loadData();
    showToast(`${vehicle.make} ${vehicle.model} marked Available!`);
  };

  // Filter customers
  const filteredCustomers = customers.filter(c => {
    if (verificationFilter !== 'all' && c.verificationStatus !== verificationFilter) return false;
    if (customerSearch.trim()) {
      const q = customerSearch.toLowerCase();
      const matchName = c.fullName.toLowerCase().includes(q);
      const matchUser = c.username.toLowerCase().includes(q);
      const matchLicense = c.licenseNumber.toLowerCase().includes(q);
      if (!matchName && !matchUser && !matchLicense) return false;
    }
    return true;
  });

  // Filter vehicles
  const filteredVehicles = vehicles.filter(v => {
    if (vehicleTypeFilter !== 'all' && v.type !== vehicleTypeFilter) return false;
    if (vehicleStatusFilter !== 'all' && v.status !== vehicleStatusFilter) return false;
    if (vehicleSearch.trim()) {
      const q = vehicleSearch.toLowerCase();
      const matchName = `${v.make} ${v.model}`.toLowerCase().includes(q);
      const matchPlate = v.licensePlate.toLowerCase().includes(q);
      if (!matchName && !matchPlate) return false;
    }
    return true;
  });

  const pendingCount = customers.filter(c => c.verificationStatus === 'pending').length;
  const maintenanceCount = vehicles.filter(v => v.status === 'maintenance' || v.status === 'cleaning').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base">AutoMotion</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Staff Inspector Portal
                </span>
              </div>
              <p className="text-xs text-slate-400">Fleet Inspector Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold">
                {user.fullName.charAt(0)}
              </div>
              <div>
                <span className="font-semibold text-slate-200 block leading-tight">{user.fullName}</span>
                <span className="text-[10px] text-slate-400 font-mono">Lead Fleet Inspector</span>
              </div>
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

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {toastMessage && (
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-amber-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Staff Dashboard KPI Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-bold uppercase block">Pending License Audits</span>
              <span className="text-2xl font-black text-amber-400">{pendingCount}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Awaiting customer verification</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-bold uppercase block">Bay Detailing / Repairs</span>
              <span className="text-2xl font-black text-cyan-400">{maintenanceCount}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Vehicles cleaning or in maintenance</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-bold uppercase block">Ready Fleet Available</span>
              <span className="text-2xl font-black text-emerald-400">
                {vehicles.filter(v => v.status === 'available').length}
              </span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Passed inspection and fueled</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="p-2 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('verify_customers')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'verify_customers'
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Verify Customer Details</span>
              {pendingCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === 'verify_customers' ? 'bg-black text-amber-300' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {pendingCount} Need Review
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('return_checkin')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'return_checkin'
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <RotateCcw className="w-4 h-4" />
              <span>Return Check-in &amp; Late Audit</span>
              {rentals.filter(r => r.status === 'active').length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === 'return_checkin' ? 'bg-black text-amber-300' : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {rentals.filter(r => r.status === 'active').length} On Road
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('update_cars_status')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'update_cars_status'
                  ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Update Fleet Status</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'update_cars_status' ? 'bg-black/20 text-black' : 'bg-slate-800 text-slate-400'
              }`}>
                {vehicles.length} Total
              </span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            STAFF FUNCTION 1: VERIFY CUSTOMER DETAILS
        ========================================================================== */}
        {activeTab === 'verify_customers' && (
          <div className="space-y-6">
            {/* Filter and Search */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-5 flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  onClick={() => setVerificationFilter('all')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                    verificationFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({customers.length})
                </button>
                <button
                  onClick={() => setVerificationFilter('pending')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 ${
                    verificationFilter === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Pending ({pendingCount})
                </button>
                <button
                  onClick={() => setVerificationFilter('verified')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                    verificationFilter === 'verified' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Verified
                </button>
                <button
                  onClick={() => setVerificationFilter('rejected')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                    verificationFilter === 'rejected' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Rejected
                </button>
              </div>

              <div className="sm:col-span-7 relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search customer by name, email, or license #..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Customers Verification Table */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4">Customer Identity</th>
                      <th className="p-4">Driver&apos;s License Details</th>
                      <th className="p-4">Verification Status</th>
                      <th className="p-4">Staff Inspector Notes</th>
                      <th className="p-4 text-right">Verification Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          No customer records found matching filter.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map(customer => {
                        const isExpired = new Date(customer.licenseExpiry) < new Date();

                        return (
                          <tr key={customer.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-800 text-amber-400 font-bold flex items-center justify-center">
                                  {customer.fullName.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-bold text-white text-sm">{customer.fullName}</p>
                                  <p className="text-[11px] text-slate-400 font-mono">@{customer.username}</p>
                                  <p className="text-[11px] text-slate-400">{customer.email}</p>
                                </div>
                              </div>
                            </td>

                            <td className="p-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 font-mono text-slate-200">
                                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>{customer.licenseNumber}</span>
                                </div>
                                <p className={`text-[11px] flex items-center gap-1 ${
                                  isExpired ? 'text-rose-400 font-bold' : 'text-slate-400'
                                }`}>
                                  <span>Exp: {customer.licenseExpiry}</span>
                                  {isExpired && <span className="px-1 rounded bg-rose-500/20 text-rose-300">Expired</span>}
                                </p>
                              </div>
                            </td>

                            <td className="p-4">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                customer.verificationStatus === 'verified'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : customer.verificationStatus === 'pending'
                                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}>
                                {customer.verificationStatus === 'verified' && <CheckCircle2 className="w-3 h-3" />}
                                {customer.verificationStatus === 'pending' && <Clock className="w-3 h-3" />}
                                {customer.verificationStatus === 'rejected' && <AlertTriangle className="w-3 h-3" />}
                                {customer.verificationStatus}
                              </span>
                            </td>

                            <td className="p-4 max-w-xs">
                              <p className="text-slate-300 text-[11px] italic truncate">
                                {customer.staffNotes || 'No notes added yet.'}
                              </p>
                            </td>

                            <td className="p-4 text-right">
                              <button
                                onClick={() => {
                                  setSelectedCustomer(customer);
                                  setStaffNoteInput(customer.staffNotes || '');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs transition-colors flex items-center gap-1.5 ml-auto"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Audit &amp; Verify</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STAFF FUNCTION 2: RETURN CHECK-IN & AUTOMATIC LATE AUDIT
        ========================================================================== */}
        {activeTab === 'return_checkin' && (
          <div className="space-y-6">
            {/* Filter and Search Bar */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-5 relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search customer, booking code, or license plate..."
                  value={rentalSearch}
                  onChange={(e) => setRentalSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-7 flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto">
                <button
                  onClick={() => setRentalStatusFilter('active')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                    rentalStatusFilter === 'active' ? 'bg-amber-400 text-black font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Active On-Road ({rentals.filter(r => r.status === 'active').length})
                </button>
                <button
                  onClick={() => setRentalStatusFilter('completed')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                    rentalStatusFilter === 'completed' ? 'bg-amber-400 text-black font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Completed Returns ({rentals.filter(r => r.status === 'completed').length})
                </button>
                <button
                  onClick={() => setRentalStatusFilter('all')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                    rentalStatusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({rentals.length})
                </button>
              </div>
            </div>

            {/* Policy Reminder Banner */}
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-slate-300">
              <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white">Automated Return Schedule &amp; Fee Standard (Asia/Manila):</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  59-minute grace period applied after expected return schedule (₱0 penalty). Starting at exactly 60 minutes late, an automated fee of <strong className="text-amber-300 font-mono">₱20/hour</strong> is added to the final rental amount.
                </p>
              </div>
            </div>

            {/* Rentals Table */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4">Booking Ref</th>
                      <th className="p-4">Customer Details</th>
                      <th className="p-4">Vehicle Info</th>
                      <th className="p-4">Pickup Schedule</th>
                      <th className="p-4">Expected Return</th>
                      <th className="p-4">Actual Return</th>
                      <th className="p-4">Late Duration</th>
                      <th className="p-4">Late Fee</th>
                      <th className="p-4">Final Total</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {rentals
                      .filter(r => {
                        if (rentalStatusFilter !== 'all' && r.status !== rentalStatusFilter) return false;
                        if (rentalSearch.trim()) {
                          const q = rentalSearch.toLowerCase();
                          const matchCode = r.bookingCode.toLowerCase().includes(q);
                          const matchCustomer = r.customerName.toLowerCase().includes(q);
                          const matchPlate = r.vehiclePlate.toLowerCase().includes(q);
                          const matchVeh = r.vehicleName.toLowerCase().includes(q);
                          if (!matchCode && !matchCustomer && !matchPlate && !matchVeh) return false;
                        }
                        return true;
                      })
                      .map(rent => {
                        const expectedIso = rent.expectedReturnDateTime || new Date(rent.endDate).toISOString();
                        const isRentActive = rent.status === 'active';
                        const liveCalc = isRentActive 
                          ? calculateLateFee(expectedIso, new Date().toISOString()) 
                          : null;

                        return (
                          <tr key={rent.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-4 font-mono font-bold text-amber-300">
                              {rent.bookingCode}
                            </td>

                            <td className="p-4">
                              <p className="font-bold text-white">{rent.customerName}</p>
                              <p className="text-[11px] text-slate-400">{rent.customerPhone}</p>
                              <p className="text-[10px] text-slate-500 font-mono">DL: {rent.customerLicense}</p>
                            </td>

                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                {rent.vehicleType === 'car' ? (
                                  <Car className="w-4 h-4 text-cyan-400 shrink-0" />
                                ) : (
                                  <Bike className="w-4 h-4 text-amber-400 shrink-0" />
                                )}
                                <div>
                                  <p className="font-semibold text-slate-200">{rent.vehicleName}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">Plate: {rent.vehiclePlate}</p>
                                </div>
                              </div>
                            </td>

                            <td className="p-4 text-slate-300 font-mono text-[11px]">
                              {rent.pickupDateTime ? formatPhilippineDateTime(rent.pickupDateTime) : new Date(rent.startDate).toLocaleDateString()}
                            </td>

                            <td className="p-4 font-mono text-[11px] text-cyan-300 font-medium">
                              {rent.expectedReturnDateTime ? formatPhilippineDateTime(rent.expectedReturnDateTime) : new Date(rent.endDate).toLocaleDateString()}
                            </td>

                            <td className="p-4 font-mono text-[11px]">
                              {rent.actualReturnDateTime ? (
                                <span className="text-amber-300">{formatPhilippineDateTime(rent.actualReturnDateTime)}</span>
                              ) : (
                                <span className="text-slate-500 italic">Not Returned</span>
                              )}
                            </td>

                            <td className="p-4 text-[11px]">
                              {isRentActive && liveCalc ? (
                                liveCalc.isLate ? (
                                  <span className="text-rose-400 font-semibold">
                                    Overdue: {formatDurationMinutes(liveCalc.lateMinutes)}
                                  </span>
                                ) : liveCalc.withinGracePeriod ? (
                                  <span className="text-amber-400 font-semibold">
                                    In Grace Period ({59 - liveCalc.lateMinutes}m)
                                  </span>
                                ) : (
                                  <span className="text-emerald-400">On Schedule</span>
                                )
                              ) : (
                                <span className={rent.lateMinutes && rent.lateMinutes > 0 ? 'text-amber-400 font-semibold' : 'text-slate-400'}>
                                  {formatDurationMinutes(rent.lateMinutes ?? 0)}
                                </span>
                              )}
                            </td>

                            <td className="p-4 font-mono font-bold text-xs">
                              {(rent.lateReturnFee ?? 0) > 0 ? (
                                <span className="text-rose-400">₱{(rent.lateReturnFee ?? 0).toFixed(2)}</span>
                              ) : (
                                <span className="text-emerald-400">₱0.00</span>
                              )}
                            </td>

                            <td className="p-4 font-mono font-bold text-emerald-400">
                              ₱{(rent.finalRentalAmount ?? rent.totalAmount).toFixed(2)}
                            </td>

                            <td className="p-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                rent.status === 'active'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : rent.status === 'completed'
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}>
                                {rent.status}
                              </span>
                            </td>

                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {rent.status === 'active' ? (
                                  <button
                                    onClick={() => setReturningRental(rent)}
                                    className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                                    title="Process vehicle return"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Check-in Return</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setViewingReceipt(rent)}
                                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    <Receipt className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>Receipt</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STAFF FUNCTION 3: UPDATE CARS STATUS
        ========================================================================== */}
        {activeTab === 'update_cars_status' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-4 flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  onClick={() => setVehicleTypeFilter('all')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${
                    vehicleTypeFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'
                  }`}
                >
                  All Fleet
                </button>
                <button
                  onClick={() => setVehicleTypeFilter('car')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 ${
                    vehicleTypeFilter === 'car' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400'
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  Cars
                </button>
                <button
                  onClick={() => setVehicleTypeFilter('motorcycle')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 ${
                    vehicleTypeFilter === 'motorcycle' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400'
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" />
                  Motors
                </button>
              </div>

              <div className="sm:col-span-5 relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Filter by vehicle make, model, or plate..."
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={vehicleStatusFilter}
                  onChange={(e) => setVehicleStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:border-amber-400"
                >
                  <option value="all">All Statuses</option>
                  <option value="available">Available</option>
                  <option value="rented">Rented</option>
                  <option value="cleaning">Cleaning / Detailing</option>
                  <option value="maintenance">In Maintenance</option>
                  <option value="out_of_service">Out of Service</option>
                </select>
              </div>
            </div>

            {/* Vehicle Status Table */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4">Vehicle Details</th>
                      <th className="p-4">Current Status</th>
                      <th className="p-4">Fuel / Battery &amp; Odometer</th>
                      <th className="p-4">Location</th>
                      <th className="p-4 text-right">Update Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredVehicles.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          No vehicles in fleet. Vehicles will appear here once registered by Head Admin.
                        </td>
                      </tr>
                    ) : (
                      filteredVehicles.map(vehicle => {
                      return (
                        <tr key={vehicle.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={vehicle.imageUrl}
                                alt={vehicle.model}
                                className="w-14 h-14 rounded-xl object-cover border border-slate-800 shrink-0"
                              />
                              <div>
                                <div className="flex items-center gap-1.5 font-bold text-white text-sm">
                                  {vehicle.type === 'car' ? <Car className="w-4 h-4 text-cyan-400" /> : <Bike className="w-4 h-4 text-amber-400" />}
                                  <span>{vehicle.make} {vehicle.model}</span>
                                </div>
                                <p className="font-mono text-cyan-300 text-[11px]">{vehicle.licensePlate}</p>
                                <p className="text-[10px] text-slate-400">{vehicle.year} &bull; {vehicle.transmission} &bull; {vehicle.category}</p>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              vehicle.status === 'available'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : vehicle.status === 'rented'
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  : vehicle.status === 'cleaning'
                                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                    : vehicle.status === 'maintenance'
                                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}>
                              {vehicle.status.replace('_', ' ')}
                            </span>
                          </td>

                          <td className="p-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Fuel className="w-3.5 h-3.5 text-cyan-400" />
                                <div className="w-24 bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                                  <div
                                    className={`h-full ${
                                      vehicle.fuelLevel > 50 ? 'bg-emerald-400' : vehicle.fuelLevel > 25 ? 'bg-amber-400' : 'bg-rose-400'
                                    }`}
                                    style={{ width: `${vehicle.fuelLevel}%` }}
                                  />
                                </div>
                                <span className="font-mono text-[11px] text-slate-300">{vehicle.fuelLevel}%</span>
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                                <Gauge className="w-3 h-3 text-slate-500" />
                                <span>{vehicle.mileage.toLocaleString()} mi</span>
                              </div>
                            </div>
                          </td>

                          <td className="p-4 text-slate-300 text-xs">
                            {vehicle.location}
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Direct Status Selector */}
                              <select
                                value={vehicle.status}
                                onChange={(e) => handleUpdateVehicleStatus(vehicle.id, e.target.value as VehicleStatus)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:border-amber-400"
                              >
                                <option value="available">Set: Available</option>
                                <option value="rented">Set: Rented</option>
                                <option value="cleaning">Set: Cleaning</option>
                                <option value="maintenance">Set: Maintenance</option>
                                <option value="out_of_service">Set: Out of Service</option>
                              </select>

                              {/* Inspect & Edit Button */}
                              <button
                                onClick={() => {
                                  setEditingVehicle(vehicle);
                                  setTempFuel(vehicle.fuelLevel);
                                  setTempMileage(vehicle.mileage);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition-colors flex items-center gap-1"
                                title="Inspect Fuel, Mileage & Maintenance"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                                <span>Condition</span>
                              </button>

                              {/* 1-Click Mark Ready if cleaning or maintenance */}
                              {(vehicle.status === 'cleaning' || vehicle.status === 'maintenance') && (
                                <button
                                  onClick={() => handleMarkReady(vehicle)}
                                  className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors flex items-center gap-1"
                                  title="Mark as Inspected & Available"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>Make Available</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Customer Audit & Verification Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-100 my-8 animate-in zoom-in-95 space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-xl">Customer Document Verification</h3>
                  <p className="text-xs text-slate-400">Verify Customer Identity &amp; Driver&apos;s License</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Profile & ID Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-500">Applicant Details</span>
                <p className="text-base font-bold text-white">{selectedCustomer.fullName}</p>
                <p className="text-slate-300">Username: <span className="font-mono text-cyan-300">@{selectedCustomer.username}</span></p>
                <p className="text-slate-300">Email: {selectedCustomer.email}</p>
                <p className="text-slate-300">Phone: {selectedCustomer.phone}</p>
                <p className="text-slate-400">Address: {selectedCustomer.address || 'Standard Address'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-500">Driver&apos;s License Record</span>
                <p className="font-mono text-base font-bold text-amber-400">{selectedCustomer.licenseNumber}</p>
                <p className="text-slate-300">
                  Expiration Date: <strong className="text-white">{selectedCustomer.licenseExpiry}</strong>
                </p>
                <div className="pt-2">
                  <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                    selectedCustomer.verificationStatus === 'verified' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    Current Status: {selectedCustomer.verificationStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* License Photo / Document Preview */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Simulated License Document Attachment
              </span>
              <div className="relative rounded-xl overflow-hidden border border-slate-800 h-44 bg-slate-900 flex items-center justify-center">
                <img
                  src={selectedCustomer.licenseImage || 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80'}
                  alt="Driver License Document Preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
                  <div className="text-xs text-white font-mono">
                    Official Photo ID &bull; Validated by AutoMotion Security Shield
                  </div>
                </div>
              </div>
            </div>

            {/* Staff Notes Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Staff Inspection Notes &amp; Findings
              </label>
              <textarea
                value={staffNoteInput}
                onChange={(e) => setStaffNoteInput(e.target.value)}
                placeholder="e.g. License verified against DMV records. Valid for luxury car and heavy motorcycle categories."
                rows={2}
                className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:border-amber-400"
              />
            </div>

            {/* Verification Action Buttons */}
            <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => handleVerifyCustomer(selectedCustomer.id, 'verified')}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                <Check className="w-4 h-4" />
                <span>Approve &amp; Verify Customer</span>
              </button>

              <button
                onClick={() => handleVerifyCustomer(selectedCustomer.id, 'pending')}
                className="w-full sm:w-auto py-3 px-4 rounded-xl font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Clock className="w-4 h-4" />
                <span>Mark Pending</span>
              </button>

              <button
                onClick={() => handleVerifyCustomer(selectedCustomer.id, 'rejected')}
                className="w-full sm:w-auto py-3 px-4 rounded-xl font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>Reject License</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Condition & Detailing Inspection Modal */}
      {editingVehicle && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-100 my-8 animate-in zoom-in-95 space-y-6">
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Wrench className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-xl">
                    Inspect {editingVehicle.make} {editingVehicle.model}
                  </h3>
                  <p className="text-xs text-slate-400">Update Vehicle Condition, Fuel &amp; Damage</p>
                </div>
              </div>
              <button
                onClick={() => setEditingVehicle(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVehicleCondition} className="space-y-4">
              {/* Fuel Level Slider */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Fuel className="w-4 h-4 text-cyan-400" />
                    Fuel / Battery Level
                  </span>
                  <span className="font-mono text-cyan-300 font-bold text-sm">{tempFuel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={tempFuel}
                  onChange={(e) => setTempFuel(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Odometer Mileage */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-amber-400" />
                  Odometer Mileage (Miles)
                </label>
                <input
                  type="number"
                  value={tempMileage}
                  onChange={(e) => setTempMileage(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white font-mono"
                />
              </div>

              {/* Log Maintenance Note */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Log Maintenance / Service Performed
                </label>
                <input
                  type="text"
                  placeholder="e.g. Completed tire rotation and exterior wash detailing"
                  value={newMaintenanceNote}
                  onChange={(e) => setNewMaintenanceNote(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500"
                />
              </div>

              {/* Log Damage Report if any */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  Record Inspection Damage (if detected)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Scuffed left front rim during dropoff"
                    value={newDamageNote}
                    onChange={(e) => setNewDamageNote(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500"
                  />
                  <select
                    value={damageSeverity}
                    onChange={(e: any) => setDamageSeverity(e.target.value)}
                    className="px-2 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300"
                  >
                    <option value="minor">Minor</option>
                    <option value="moderate">Moderate</option>
                    <option value="major">Major</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingVehicle(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl font-bold bg-amber-400 hover:bg-amber-300 text-black text-xs transition-colors cursor-pointer"
                >
                  Save Vehicle Condition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Return Check-in Modal */}
      {returningRental && (
        <StaffReturnCheckinModal
          rental={returningRental}
          onClose={() => setReturningRental(null)}
          onConfirm={(details) => handleProcessStaffReturn(returningRental, details)}
        />
      )}

      {/* Digital Receipt Modal */}
      {viewingReceipt && (
        <RentalReceiptModal
          rental={viewingReceipt}
          onClose={() => setViewingReceipt(null)}
        />
      )}

      {/* Staff Logout Confirmation */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-white text-base">End Staff Session?</h4>
              <p className="text-xs text-slate-400">
                Conclude staff inspection duties and return to the system portal.
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

interface StaffReturnCheckinModalProps {
  rental: Rental;
  onClose: () => void;
  onConfirm: (details: {
    returnNotes: string;
    returnMileage: number;
    returnFuelLevel: number;
    damageNote?: string;
    damageSeverity?: 'minor' | 'moderate' | 'major';
  }) => void;
}

const StaffReturnCheckinModal: React.FC<StaffReturnCheckinModalProps> = ({
  rental,
  onClose,
  onConfirm,
}) => {
  const [actualTimeIso] = useState(new Date().toISOString());
  const [mileage, setMileage] = useState<number>(rental.returnMileage || 5000);
  const [fuelLevel, setFuelLevel] = useState<number>(100);
  const [returnNotes, setReturnNotes] = useState('Vehicle inspected and approved for turnaround cleaning.');
  const [damageNote, setDamageNote] = useState('');
  const [damageSeverity, setDamageSeverity] = useState<'minor' | 'moderate' | 'major'>('minor');

  const expectedIso = rental.expectedReturnDateTime || new Date(rental.endDate).toISOString();
  const lateCalc = calculateLateFee(expectedIso, actualTimeIso);
  const baseAmount = rental.baseRentalAmount ?? rental.totalAmount;
  const finalAmount = baseAmount + lateCalc.lateReturnFee;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      returnNotes,
      returnMileage: Number(mileage),
      returnFuelLevel: Number(fuelLevel),
      damageNote: damageNote.trim() || undefined,
      damageSeverity: damageNote.trim() ? damageSeverity : undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-100 my-8 space-y-5 animate-in zoom-in-95">
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Fleet Return Inspection &amp; Late Fee Audit</h3>
              <p className="text-xs text-slate-400 font-mono">Reference: {rental.bookingCode} &bull; {rental.vehicleName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Schedule & Late Audit Matrix */}
        <div className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px]">
              Philippine Time (Asia/Manila UTC+8)
            </span>
            <span className="font-mono text-slate-400 text-[10px]">
              Cust: {rental.customerName} ({rental.customerPhone})
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Pickup Schedule</span>
              <span className="text-white font-mono font-medium text-[11px]">
                {rental.pickupDateTime ? formatPhilippineDateTime(rental.pickupDateTime) : new Date(rental.startDate).toLocaleDateString()}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Expected Return</span>
              <span className="text-cyan-300 font-mono font-bold text-[11px]">
                {rental.expectedReturnDateTime ? formatPhilippineDateTime(rental.expectedReturnDateTime) : new Date(rental.endDate).toLocaleDateString()}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Actual Return Time</span>
              <span className="text-amber-300 font-mono font-bold text-[11px]">
                {formatPhilippineDateTime(actualTimeIso)}
              </span>
            </div>
          </div>

          {/* Grace Period & Overdue Analysis */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div>
              <span className="text-[10px] text-slate-500 block">Grace Period</span>
              <span className="text-emerald-400 font-semibold">59 Minutes</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block">Total Late Time</span>
              <span className={lateCalc.lateMinutes > 0 ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
                {formatDurationMinutes(lateCalc.lateMinutes)}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block">Chargeable Hours</span>
              <span className="text-white font-mono">{lateCalc.chargeableLateHours} hr(s)</span>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 block">Automated Late Fee</span>
              <span className={`font-mono font-bold ${lateCalc.lateReturnFee > 0 ? 'text-rose-400 text-sm' : 'text-emerald-400'}`}>
                {lateCalc.lateReturnFee > 0 ? `₱${lateCalc.lateReturnFee.toFixed(2)}` : '₱0.00 (On-Time)'}
              </span>
            </div>
          </div>

          {/* Pricing Ledger Preview */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Base Amount: <strong className="text-white font-mono">₱{baseAmount.toFixed(2)}</strong> + Late Fee: <strong className={lateCalc.lateReturnFee > 0 ? 'text-rose-400' : 'text-emerald-400'}>₱{lateCalc.lateReturnFee.toFixed(2)}</strong>
            </span>
            <div className="text-right">
              <span className="text-slate-400 text-[10px] block">Final Rental Amount:</span>
              <span className="text-base font-black text-cyan-400 font-mono">₱{finalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Staff Physical Inspection Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <label className="block text-slate-300 font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5 text-amber-400" /> Return Odometer</span>
                <span className="text-slate-500 font-normal">Miles/Km</span>
              </label>
              <input
                type="number"
                value={mileage}
                onChange={(e) => setMileage(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                required
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <label className="block text-slate-300 font-bold flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Fuel className="w-3.5 h-3.5 text-cyan-400" /> Return Fuel Level</span>
                <span className="text-cyan-400 font-mono font-bold">{fuelLevel}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={fuelLevel}
                onChange={(e) => setFuelLevel(Number(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Return Inspection Remarks / Detailing Instructions</label>
            <input
              type="text"
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              placeholder="e.g. Returned clean, keys handed in, move to bay 2 for detailing"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <label className="block text-slate-300 font-semibold">Incident / Damage Log (Optional)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={damageNote}
                onChange={(e) => setDamageNote(e.target.value)}
                placeholder="Leave blank if vehicle is undamaged"
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500"
              />
              <select
                value={damageSeverity}
                onChange={(e: any) => setDamageSeverity(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300"
              >
                <option value="minor">Minor</option>
                <option value="moderate">Moderate</option>
                <option value="major">Major</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl font-bold bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              Confirm &amp; Log Vehicle Return
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
