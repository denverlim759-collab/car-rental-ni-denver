import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Car, 
  Bike, 
  Clock, 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Ban, 
  CheckCircle2, 
  AlertCircle, 
  Receipt, 
  Download, 
  LogOut, 
  Filter, 
  Eye, 
  X, 
  Sparkles,
  PieChart,
  ArrowUpRight,
  Database,
  AlertTriangle
} from 'lucide-react';
import { 
  User, 
  Vehicle, 
  Rental, 
  RentalReportSummary, 
  VehicleType, 
  VehicleCategory, 
  VehicleStatus,
  AccountStatus
} from '../../types';
import { db } from '../../services/db';
import { RentalReceiptModal } from '../common/RentalReceiptModal';
import { formatPhilippineDateTime, formatDurationMinutes } from '../../utils/time';

interface AdminPortalProps {
  user: User;
  onLogout: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  user,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'manage_customers' | 'manage_cars' | 'view_rentals' | 'view_reports'>('manage_customers');

  // Database collections
  const [usersList, setUsersList] = useState<User[]>([]);
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'customer' | 'staff'>('all');
  const [customers, setCustomers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [reports, setReports] = useState<RentalReportSummary | null>(null);

  // Tab 1: Manage Accounts (Staff & Customers) state
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerStatusFilter, setCustomerStatusFilter] = useState<string>('all');
  const [editingCustomer, setEditingCustomer] = useState<User | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);

  // Tab 2: Manage Cars state
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<'all' | 'car' | 'motorcycle'>('all');
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);

  // Tab 3: View Rentals state
  const [rentalSearch, setRentalSearch] = useState('');
  const [rentalStatusFilter, setRentalStatusFilter] = useState<string>('all');
  const [viewingReceipt, setViewingReceipt] = useState<Rental | null>(null);

  // Logout & Feedback
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadAllData = () => {
    setUsersList(db.getUsers().filter(u => u.role !== 'admin'));
    setCustomers(db.getCustomers());
    setVehicles(db.getVehicles());
    setRentals(db.getRentals());
    setReports(db.getReports());
  };

  useEffect(() => {
    loadAllData();
    const handleUpdate = () => loadAllData();
    window.addEventListener('nosql_store_updated', handleUpdate);
    return () => window.removeEventListener('nosql_store_updated', handleUpdate);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // -------------------------------------------------------------
  // USER / STAFF / CUSTOMER MANAGEMENT ACTIONS
  // -------------------------------------------------------------
  const handleToggleCustomerStatus = (cust: User) => {
    const nextStatus: AccountStatus = cust.status === 'active' ? 'banned' : 'active';
    db.updateUser({ ...cust, status: nextStatus });
    loadAllData();
    showToast(`User @${cust.username} status set to ${nextStatus.toUpperCase()}`);
  };

  const handleDeleteCustomer = (userId: string, username: string, roleName = 'Account') => {
    if (window.confirm(`Delete ${roleName} @${username}? This action is irreversible in the database.`)) {
      db.deleteUser(userId);
      loadAllData();
      showToast(`${roleName} @${username} removed from database.`);
    }
  };

  // -------------------------------------------------------------
  // VEHICLE MANAGEMENT ACTIONS (Step 23)
  // -------------------------------------------------------------
  const handleDeleteVehicle = (vehicle: Vehicle) => {
    if (window.confirm(`Delete ${vehicle.make} ${vehicle.model} (${vehicle.licensePlate}) from the fleet?`)) {
      db.deleteVehicle(vehicle.id);
      loadAllData();
      showToast(`Vehicle ${vehicle.model} removed from fleet.`);
    }
  };

  // -------------------------------------------------------------
  // RENTAL MANAGEMENT ACTIONS (Step 23)
  // -------------------------------------------------------------
  const handleForceCompleteRental = (rental: Rental) => {
    if (rental.returnProcessed || rental.status === 'completed') {
      showToast(`Rental ${rental.bookingCode} is already returned.`);
      return;
    }
    const completed = db.completeRentalReturn(rental.id, {
      returnNotes: 'Head Admin completed vehicle check-in and finalized rental.',
      returnMileage: 10000,
      returnFuelLevel: 100,
      processedBy: `Admin (@${user.username})`
    });
    loadAllData();
    if (completed && (completed.lateReturnFee ?? 0) > 0) {
      showToast(`Rental ${rental.bookingCode} returned: ₱${(completed.lateReturnFee ?? 0).toFixed(2)} late fee applied (${formatDurationMinutes(completed.lateMinutes ?? 0)} late).`);
    } else {
      showToast(`Rental ${rental.bookingCode} returned within schedule / grace period (₱0 late fee).`);
    }
  };

  const handleCancelRental = (rental: Rental) => {
    if (window.confirm(`Cancel rental ${rental.bookingCode} and issue refund?`)) {
      db.cancelRental(rental.id, 'Cancelled by Head Admin request');
      loadAllData();
      showToast(`Rental ${rental.bookingCode} has been cancelled.`);
    }
  };

  // Export Data to JSON/CSV
  const handleExportData = () => {
    const exportObject = {
      timestamp: new Date().toISOString(),
      reports,
      customers,
      staff: db.getStaff(),
      vehicles,
      rentals
    };
    const blob = new Blob([JSON.stringify(exportObject, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `automotion_rental_report_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Fleet & Financial report exported successfully.');
  };

  // Filter lists
  const filteredUsers = usersList.filter(u => {
    if (userRoleFilter !== 'all' && u.role !== userRoleFilter) return false;
    if (customerStatusFilter !== 'all' && u.status !== customerStatusFilter) return false;
    if (customerSearch.trim()) {
      const q = customerSearch.toLowerCase();
      const matchName = u.fullName.toLowerCase().includes(q);
      const matchUser = u.username.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      if (!matchName && !matchUser && !matchEmail) return false;
    }
    return true;
  });

  const filteredVehicles = vehicles.filter(v => {
    if (vehicleTypeFilter !== 'all' && v.type !== vehicleTypeFilter) return false;
    if (vehicleSearch.trim()) {
      const q = vehicleSearch.toLowerCase();
      const matchModel = `${v.make} ${v.model}`.toLowerCase().includes(q);
      const matchPlate = v.licensePlate.toLowerCase().includes(q);
      if (!matchModel && !matchPlate) return false;
    }
    return true;
  });

  const filteredRentals = rentals.filter(r => {
    if (rentalStatusFilter !== 'all' && r.status !== rentalStatusFilter) return false;
    if (rentalSearch.trim()) {
      const q = rentalSearch.toLowerCase();
      const matchCode = r.bookingCode.toLowerCase().includes(q);
      const matchCustomer = r.customerName.toLowerCase().includes(q);
      const matchVeh = r.vehicleName.toLowerCase().includes(q);
      if (!matchCode && !matchCustomer && !matchVeh) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base">AutoMotion</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Head Admin Command
                </span>
              </div>
              <p className="text-xs text-slate-400">Master Control Center</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={handleExportData}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 hover:border-slate-600 text-xs text-slate-300 hover:text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Export NoSQL JSON</span>
            </button>

            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
                E
              </div>
              <div>
                <span className="font-semibold text-slate-200 block leading-tight">{user.fullName}</span>
                <span className="text-[10px] text-indigo-400 font-mono">Master Administrator</span>
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

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {toastMsg && (
          <div className="p-4 rounded-2xl bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 text-xs flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-indigo-400" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Head Admin High-Level KPIs */}
        {reports && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-bold uppercase block">Gross Rental Revenue</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  ₱{reports.totalRevenue.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {reports.totalRentals} bookings
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono">Live dynamic NoSQL records</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-bold uppercase block">Active Fleet Utilization</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-cyan-400 font-mono">
                  {reports.fleetUtilizationRate}%
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Cars {reports.carsUtilization}% &bull; Motors {reports.motorsUtilization}%
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono">{reports.activeRentalsCount} vehicles on road</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-bold uppercase block">Total Fleet Size</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white font-mono">
                  {reports.totalVehicles}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {reports.availableVehicles} ready
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono">{reports.maintenanceVehicles} in maintenance/cleaning</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 font-bold uppercase block">Registered Customers</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-indigo-400 font-mono">
                  {reports.totalCustomers}
                </span>
                {reports.pendingVerifications > 0 && (
                  <span className="text-[10px] text-amber-400 font-mono font-bold">
                    {reports.pendingVerifications} pending
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-mono">NoSQL Document Store</p>
            </div>
          </div>
        )}

        {/* Administration Navigation Bar */}
        <div className="p-2 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab('manage_customers')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'manage_customers'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Manage Accounts &amp; Staff</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'manage_customers' ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {usersList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('manage_cars')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'manage_cars'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Manage Fleet</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'manage_cars' ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {vehicles.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('view_rentals')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'view_rentals'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>View Rentals</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                activeTab === 'view_rentals' ? 'bg-black/30 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {rentals.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('view_reports')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'view_reports'
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Reports &amp; Analytics</span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 px-3 font-mono">
            <span>Admin Control Panel</span>
          </div>
        </div>

        {/* =========================================================================
            ADMIN FUNCTION 1: MANAGE ACCOUNTS (STAFF & CUSTOMERS)
        ========================================================================== */}
        {activeTab === 'manage_customers' && (
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              <div className="flex-1 w-full flex items-center gap-3 flex-wrap sm:flex-nowrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or username..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:border-indigo-500"
                >
                  <option value="all">All Roles</option>
                  <option value="staff">Staff Only</option>
                  <option value="customer">Customers Only</option>
                </select>
                <select
                  value={customerStatusFilter}
                  onChange={(e) => setCustomerStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:border-indigo-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active Accounts</option>
                  <option value="banned">Banned Accounts</option>
                </select>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowAddStaffModal(true)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Create Staff Account</span>
                </button>

                <button
                  onClick={() => setShowAddCustomerModal(true)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Customer</span>
                </button>
              </div>
            </div>

            {/* Users & Staff Registry Table */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-4">User</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Contact &amp; Assignment</th>
                      <th className="p-4">Verification</th>
                      <th className="p-4">Account Status</th>
                      <th className="p-4">Registered Date</th>
                      <th className="p-4 text-right">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                          No accounts found matching your filters.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(usr => (
                        <tr key={usr.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl font-bold flex items-center justify-center ${
                                usr.role === 'staff' 
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                                  : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                              }`}>
                                {usr.fullName.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-white text-sm">{usr.fullName}</p>
                                <p className="text-[11px] text-slate-400 font-mono">@{usr.username}</p>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            {usr.role === 'staff' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Staff Inspector
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                Customer
                              </span>
                            )}
                          </td>

                          <td className="p-4">
                            <p className="text-slate-300">{usr.email}</p>
                            <p className="text-slate-400 font-mono text-[11px]">{usr.phone}</p>
                            {usr.licenseNumber && (
                              <p className="text-cyan-400 font-mono text-[10px]">{usr.licenseNumber}</p>
                            )}
                            {usr.address && (
                              <p className="text-slate-500 text-[10px] truncate max-w-[200px]">{usr.address}</p>
                            )}
                          </td>

                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              usr.verificationStatus === 'verified'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : usr.verificationStatus === 'pending'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}>
                              {usr.verificationStatus}
                            </span>
                          </td>

                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              usr.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}>
                              {usr.status}
                            </span>
                          </td>

                          <td className="p-4 text-slate-400 font-mono text-[11px]">
                            {new Date(usr.createdAt).toLocaleDateString()}
                          </td>

                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleToggleCustomerStatus(usr)}
                                className={`p-2 rounded-xl text-xs font-semibold transition-colors ${
                                  usr.status === 'active'
                                    ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300'
                                    : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300'
                                }`}
                                title={usr.status === 'active' ? 'Suspend / Ban account' : 'Reactivate account'}
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setEditingCustomer(usr)}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                title="Edit Account"
                              >
                                <Edit className="w-3.5 h-3.5 text-indigo-400" />
                              </button>

                              <button
                                onClick={() => handleDeleteCustomer(usr.id, usr.username, usr.role === 'staff' ? 'Staff' : 'Customer')}
                                className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                                title="Delete from database"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            ADMIN FUNCTION 2: MANAGE CARS (& MOTORS)
        ========================================================================== */}
        {activeTab === 'manage_cars' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex-1 w-full flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search fleet by model, make, or plate..."
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setVehicleTypeFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      vehicleTypeFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'
                    }`}
                  >
                    All ({vehicles.length})
                  </button>
                  <button
                    onClick={() => setVehicleTypeFilter('car')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      vehicleTypeFilter === 'car' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400'
                    }`}
                  >
                    Cars
                  </button>
                  <button
                    onClick={() => setVehicleTypeFilter('motorcycle')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      vehicleTypeFilter === 'motorcycle' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400'
                    }`}
                  >
                    Motors
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowAddVehicleModal(true)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Add Fleet Vehicle (Car/Motor)</span>
              </button>
            </div>

            {/* Vehicle Grid Table */}
            {filteredVehicles.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                <Car className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-base font-bold text-slate-300">Fleet is currently empty</h4>
                <p className="text-xs text-slate-500">Click &quot;Add Fleet Vehicle&quot; above to register cars and motorcycles into the fleet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVehicles.map(veh => (
                <div
                  key={veh.id}
                  className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-44 bg-slate-950">
                      <img
                        src={veh.imageUrl}
                        alt={veh.model}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 flex gap-1.5">
                        <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/10 flex items-center gap-1">
                          {veh.type === 'car' ? <Car className="w-3 h-3 text-cyan-400" /> : <Bike className="w-3 h-3 text-amber-400" />}
                          {veh.category.toUpperCase()}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase backdrop-blur-md ${
                          veh.status === 'available'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-900/80 text-slate-300 border border-slate-700'
                        }`}>
                          {veh.status}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-white text-base">{veh.make} {veh.model}</h4>
                          <p className="text-xs text-slate-400 font-mono">Plate: {veh.licensePlate} &bull; Year {veh.year}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-bold text-indigo-400 font-mono">₱{veh.dailyRate}</span>
                          <span className="text-xs text-slate-400">/day</span>
                          <p className="text-[10px] text-slate-500 font-mono">₱{veh.hourlyRate}/hr</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-slate-400">
                        <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="block text-slate-500">Fuel</span>
                          <span className="text-slate-200 font-bold">{veh.fuelLevel}%</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="block text-slate-500">Mileage</span>
                          <span className="text-slate-200 font-bold">{veh.mileage.toLocaleString()}m</span>
                        </div>
                        <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800">
                          <span className="block text-slate-500">Trans</span>
                          <span className="text-slate-200 font-bold">{veh.transmission}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-2">
                    <button
                      onClick={() => setEditingVehicle(veh)}
                      className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 hover:text-white transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Edit Vehicle</span>
                    </button>
                    <button
                      onClick={() => handleDeleteVehicle(veh)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Delete vehicle"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        )}

        {/* =========================================================================
            ADMIN FUNCTION 3: VIEW RENTAL
        ========================================================================== */}
        {activeTab === 'view_rentals' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-5 relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search rental code, customer name, or vehicle..."
                  value={rentalSearch}
                  onChange={(e) => setRentalSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-7 flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 overflow-x-auto">
                <button
                  onClick={() => setRentalStatusFilter('all')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold whitespace-nowrap ${
                    rentalStatusFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'
                  }`}
                >
                  All ({rentals.length})
                </button>
                <button
                  onClick={() => setRentalStatusFilter('active')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold whitespace-nowrap ${
                    rentalStatusFilter === 'active' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setRentalStatusFilter('completed')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold whitespace-nowrap ${
                    rentalStatusFilter === 'completed' ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400'
                  }`}
                >
                  Completed
                </button>
                <button
                  onClick={() => setRentalStatusFilter('cancelled')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold whitespace-nowrap ${
                    rentalStatusFilter === 'cancelled' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400'
                  }`}
                >
                  Cancelled
                </button>
              </div>
            </div>

            {/* Rentals Table */}
            <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Booking Ref</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Vehicle</th>
                      <th className="p-3">Pickup (PHT)</th>
                      <th className="p-3">Expected Return (PHT)</th>
                      <th className="p-3">Actual Return (PHT)</th>
                      <th className="p-3">Late Audit</th>
                      <th className="p-3">Amount (Base &rarr; Final)</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredRentals.map(rent => {
                      const isOverdueActive = rent.status === 'active' && rent.expectedReturnDateTime && new Date().getTime() > new Date(rent.expectedReturnDateTime).getTime();
                      const hasLateFee = (rent.lateReturnFee ?? 0) > 0;

                      return (
                        <tr key={rent.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-mono font-bold text-indigo-300">
                            {rent.bookingCode}
                          </td>

                          <td className="p-3">
                            <p className="font-bold text-white">{rent.customerName}</p>
                            <p className="text-[11px] text-slate-400">{rent.customerPhone}</p>
                          </td>

                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              {rent.vehicleType === 'car' ? <Car className="w-4 h-4 text-cyan-400 shrink-0" /> : <Bike className="w-4 h-4 text-amber-400 shrink-0" />}
                              <div>
                                <p className="font-semibold text-slate-200">{rent.vehicleName}</p>
                                <p className="text-[10px] text-slate-400 font-mono">Plate: {rent.vehiclePlate}</p>
                              </div>
                            </div>
                          </td>

                          <td className="p-3 text-slate-300 text-[11px]">
                            {rent.pickupDateTime ? (
                              formatPhilippineDateTime(rent.pickupDateTime)
                            ) : (
                              new Date(rent.startDate).toLocaleDateString()
                            )}
                          </td>

                          <td className="p-3 text-slate-300 text-[11px]">
                            {rent.expectedReturnDateTime ? (
                              <span className={isOverdueActive ? 'text-amber-400 font-medium' : ''}>
                                {formatPhilippineDateTime(rent.expectedReturnDateTime)}
                              </span>
                            ) : (
                              new Date(rent.endDate).toLocaleDateString()
                            )}
                          </td>

                          <td className="p-3 text-[11px]">
                            {rent.actualReturnDateTime ? (
                              <span className="text-slate-200 font-mono">
                                {formatPhilippineDateTime(rent.actualReturnDateTime)}
                              </span>
                            ) : (
                              <span className="text-slate-500 italic">Not Returned</span>
                            )}
                          </td>

                          <td className="p-3">
                            {rent.returnProcessed ? (
                              hasLateFee ? (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                    +{formatDurationMinutes(rent.lateMinutes ?? 0)}
                                  </span>
                                  <p className="text-[10px] font-mono font-bold text-rose-400">
                                    Fee: ₱{(rent.lateReturnFee ?? 0).toFixed(2)}
                                  </p>
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  On Time (₱0 fee)
                                </span>
                              )
                            ) : isOverdueActive ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Overdue In Progress
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">Active</span>
                            )}
                          </td>

                          <td className="p-3 font-mono">
                            <p className="text-slate-400 line-through text-[10px]">
                              ₱{(rent.baseRentalAmount ?? rent.totalAmount).toFixed(2)}
                            </p>
                            <p className={`font-bold text-xs ${hasLateFee ? 'text-rose-300' : 'text-emerald-400'}`}>
                              ₱{(rent.finalRentalAmount ?? rent.totalAmount).toFixed(2)}
                            </p>
                          </td>

                          <td className="p-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              rent.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : rent.status === 'completed'
                                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                              {rent.status}
                            </span>
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setViewingReceipt(rent)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors flex items-center gap-1"
                                title="View Full Receipt & Audit"
                              >
                                <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Receipt</span>
                              </button>

                              {rent.status === 'active' && (
                                <>
                                  <button
                                    onClick={() => handleForceCompleteRental(rent)}
                                    className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors"
                                    title="Complete Return & Compute Surcharge"
                                  >
                                    Complete Return
                                  </button>
                                  <button
                                    onClick={() => handleCancelRental(rent)}
                                    className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold transition-colors"
                                    title="Cancel & Refund"
                                  >
                                    Cancel
                                  </button>
                                </>
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
            ADMIN FUNCTION 4: VIEW REPORTS
        ========================================================================== */}
        {activeTab === 'view_reports' && reports && (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-2">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-400" />
                  Financial &amp; Fleet Operations Reports
                </h3>
                <p className="text-xs text-slate-400">AutoMotion Intelligence &amp; Analytics</p>
              </div>

              <button
                onClick={handleExportData}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                <Download className="w-4 h-4" />
                <span>Export Report Data</span>
              </button>
            </div>

            {/* Analytics Cards Grid */}
            {/* Fleet Deployment Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Breakdown */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm">Fleet Revenue Distribution</h4>
                  <span className="text-xs text-emerald-400 font-mono font-bold">
                    ₱{reports.totalRevenue.toLocaleString()} Total
                  </span>
                </div>

                {(() => {
                  const carRev = rentals.filter(r => r.vehicleType === 'car').reduce((s, r) => s + (r.finalRentalAmount ?? r.totalAmount), 0);
                  const motorRev = rentals.filter(r => r.vehicleType === 'motorcycle').reduce((s, r) => s + (r.finalRentalAmount ?? r.totalAmount), 0);
                  const carPct = reports.totalRevenue > 0 ? Math.round((carRev / reports.totalRevenue) * 100) : 0;
                  const motorPct = reports.totalRevenue > 0 ? Math.round((motorRev / reports.totalRevenue) * 100) : 0;
                  const avgDays = rentals.length > 0 ? (rentals.reduce((s, r) => s + r.days, 0) / rentals.length).toFixed(1) : '0';

                  return (
                    <>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="flex items-center gap-1.5 text-slate-300">
                              <Car className="w-4 h-4 text-cyan-400" />
                              Car Rental Gross
                            </span>
                            <span className="font-mono text-cyan-300">
                              ₱{carRev.toLocaleString()} ({carPct}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                            <div className="bg-cyan-500 h-full rounded-full transition-all" style={{ width: `${carPct}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="flex items-center gap-1.5 text-slate-300">
                              <Bike className="w-4 h-4 text-amber-400" />
                              Motorcycle Rental Gross
                            </span>
                            <span className="font-mono text-amber-300">
                              ₱{motorRev.toLocaleString()} ({motorPct}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
                            <div className="bg-amber-400 h-full rounded-full transition-all" style={{ width: `${motorPct}%` }} />
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                        <span>Average Rental Duration:</span>
                        <strong className="text-white">{avgDays} Days</strong>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Fleet Utilization */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm">Fleet Deployment Status</h4>
                  <span className="text-xs text-indigo-400 font-mono font-bold">
                    {reports.totalVehicles} Registered Vehicles
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-slate-400">Cars in Service:</span>
                    <p className="text-xl font-bold text-cyan-400 font-mono">
                      {vehicles.filter(v => v.type === 'car').length}
                    </p>
                    <p className="text-[10px] text-slate-500">Utilization: {reports.carsUtilization}%</p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                    <span className="text-slate-400">Motors in Service:</span>
                    <p className="text-xl font-bold text-amber-400 font-mono">
                      {vehicles.filter(v => v.type === 'motorcycle').length}
                    </p>
                    <p className="text-[10px] text-slate-500">Utilization: {reports.motorsUtilization}%</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                  <span>Vehicles in Maintenance or Detailing:</span>
                  <strong className="text-amber-400">{reports.maintenanceVehicles} Units</strong>
                </div>
              </div>
            </div>

            {/* Late Return Fees & Overdue Analytics Card */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Late Return Fees & Schedule Compliance</h4>
                    <p className="text-[11px] text-slate-400">59-min grace window policy &bull; ₱20.00/hour penalty</p>
                  </div>
                </div>
                <span className="text-xs text-rose-400 font-mono font-bold">
                  ₱{(reports.totalLateFeesRevenue ?? 0).toFixed(2)} Surcharges Collected
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400">Total Late Fee Revenue</span>
                  <p className="text-xl font-mono font-bold text-rose-400">
                    ₱{(reports.totalLateFeesRevenue ?? 0).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-slate-500">Auto-calculated upon return check-in</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400">Overdue Returns Count</span>
                  <p className="text-xl font-mono font-bold text-amber-400">
                    {reports.lateReturnsCount ?? 0}
                  </p>
                  <p className="text-[10px] text-slate-500">Exceeded 59-minute grace period</p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <span className="text-slate-400">Grace Period Compliance</span>
                  {(() => {
                    const completedCount = Math.max(0, reports.totalRentals - reports.activeRentalsCount);
                    const pct = completedCount > 0 
                      ? Math.round(((completedCount - (reports.lateReturnsCount ?? 0)) / completedCount) * 100)
                      : 100;
                    return (
                      <p className="text-xl font-mono font-bold text-emerald-400">
                        {Math.max(0, pct)}%
                      </p>
                    );
                  })()}
                  <p className="text-[10px] text-slate-500">Returned within schedule or grace window</p>
                </div>
              </div>
            </div>

            {/* Popular Vehicle Ranking */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h4 className="font-bold text-white text-sm">Top Performing Rental Vehicles</h4>
              {vehicles.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500">
                  No vehicles in fleet yet. Add vehicles in "Manage Cars" to view performance metrics.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {vehicles.slice(0, 3).map((v, i) => (
                    <div key={v.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                      <span className="text-xl font-black text-indigo-400 font-mono">#{i + 1}</span>
                      <img src={v.imageUrl} alt={v.model} className="w-12 h-12 rounded-xl object-cover" />
                      <div>
                        <p className="font-bold text-white text-xs">{v.make} {v.model}</p>
                        <p className="text-[10px] text-slate-400 font-mono">₱{v.dailyRate}/day &bull; {v.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Add New Vehicle Modal */}
      {showAddVehicleModal && (
        <AddVehicleModal
          onClose={() => setShowAddVehicleModal(false)}
          onAdded={(newVeh) => {
            setShowAddVehicleModal(false);
            loadAllData();
            showToast(`Added ${newVeh.make} ${newVeh.model} to fleet.`);
          }}
        />
      )}

      {/* Edit Vehicle Modal */}
      {editingVehicle && (
        <EditVehicleModal
          vehicle={editingVehicle}
          onClose={() => setEditingVehicle(null)}
          onUpdated={(updated) => {
            setEditingVehicle(null);
            loadAllData();
            showToast(`Updated ${updated.model} specs and rates.`);
          }}
        />
      )}

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <AddStaffModal
          onClose={() => setShowAddStaffModal(false)}
          onAdded={(staffUser) => {
            setShowAddStaffModal(false);
            loadAllData();
            showToast(`Provisioned new staff account @${staffUser.username} (${staffUser.fullName}).`);
          }}
        />
      )}

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <AddCustomerModal
          onClose={() => setShowAddCustomerModal(false)}
          onAdded={(cust) => {
            setShowAddCustomerModal(false);
            loadAllData();
            showToast(`Registered new customer ${cust.fullName}.`);
          }}
        />
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <EditCustomerModal
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onUpdated={(updated) => {
            setEditingCustomer(null);
            loadAllData();
            showToast(`Updated customer @${updated.username}.`);
          }}
        />
      )}

      {/* Rental Receipt Modal */}
      {viewingReceipt && (
        <RentalReceiptModal
          rental={viewingReceipt}
          onClose={() => setViewingReceipt(null)}
        />
      )}

      {/* Logout Confirmation */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-white text-base">End Head Admin Session?</h4>
              <p className="text-xs text-slate-400">
                Conclude Head Admin session and safely return to the login interface.
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

// -------------------------------------------------------------
// SUB-MODALS FOR ADMIN ACTIONS (ADD/EDIT VEHICLE & CUSTOMER)
// -------------------------------------------------------------

function AddVehicleModal({ onClose, onAdded }: { onClose: () => void; onAdded: (v: Vehicle) => void }) {
  const [formData, setFormData] = useState({
    type: 'car' as VehicleType,
    make: '',
    model: '',
    year: 2024,
    category: 'sedan' as VehicleCategory,
    licensePlate: '',
    dailyRate: 95,
    hourlyRate: 15,
    transmission: 'Automatic' as 'Automatic' | 'Manual',
    fuelType: 'Gasoline' as 'Gasoline' | 'Diesel' | 'Electric' | 'Hybrid',
    seats: 5,
    mileage: 5000,
    fuelLevel: 100,
    status: 'available' as VehicleStatus,
    imageUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1000&q=80',
    location: 'Downtown Main Hub',
    description: 'Executive class rental vehicle with advanced driver safety systems.',
    features: 'Apple CarPlay, GPS Navigation, Heated Seats, Bluetooth'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.make || !formData.model || !formData.licensePlate) {
      alert('Please fill Make, Model, and License Plate.');
      return;
    }

    const newVehicle = db.addVehicle({
      ...formData,
      features: formData.features.split(',').map(f => f.trim()).filter(Boolean)
    });
    onAdded(newVehicle);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl p-6 text-slate-100 my-8 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <h3 className="font-bold text-white text-lg">Add New Fleet Vehicle (Car/Motor)</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Vehicle Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as VehicleType })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
              >
                <option value="car">Car</option>
                <option value="motorcycle">Motorcycle</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as VehicleCategory })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
              >
                <option value="sedan">Sedan</option>
                <option value="suv">SUV</option>
                <option value="sports">Sports</option>
                <option value="luxury">Luxury</option>
                <option value="electric">Electric</option>
                <option value="sportbike">Sportbike</option>
                <option value="cruiser">Cruiser</option>
                <option value="scooter">Scooter</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Brand / Make</label>
              <input
                type="text"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                placeholder="e.g. BMW, Tesla, Ducati"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Model Name</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g. M3, Panigale"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Year</label>
              <input
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">License Plate</label>
              <input
                type="text"
                value={formData.licensePlate}
                onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
                placeholder="e.g. ABC-1234"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Daily Rate (₱)</label>
              <input
                type="number"
                value={formData.dailyRate}
                onChange={(e) => setFormData({ ...formData, dailyRate: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Hourly Rate (₱)</label>
              <input
                type="number"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Vehicle Image URL</label>
            <input
              type="text"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Features (comma separated)</label>
            <input
              type="text"
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
            />
          </div>

          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer"
            >
              Create Vehicle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditVehicleModal({ vehicle, onClose, onUpdated }: { vehicle: Vehicle; onClose: () => void; onUpdated: (v: Vehicle) => void }) {
  const [formData, setFormData] = useState({ ...vehicle });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateVehicle(formData);
    onUpdated(formData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl p-6 text-slate-100 my-8 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <h3 className="font-bold text-white text-lg">Edit {vehicle.make} {vehicle.model}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Daily Rate (₱)</label>
              <input
                type="number"
                value={formData.dailyRate}
                onChange={(e) => setFormData({ ...formData, dailyRate: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Hourly Rate (₱)</label>
              <input
                type="number"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Vehicle Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as VehicleStatus })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
              >
                <option value="available">Available</option>
                <option value="rented">Rented</option>
                <option value="cleaning">Cleaning</option>
                <option value="maintenance">Maintenance</option>
                <option value="out_of_service">Out of Service</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Location Station</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddStaffModal({ onClose, onAdded }: { onClose: () => void; onAdded: (u: User) => void }) {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    password: 'staff123',
    email: '',
    phone: '',
    station: 'Main Branch - Inspection Bay',
    licenseNumber: 'STAFF-CERT-01'
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.username.trim() || !formData.email.trim()) {
      setError('Please fill in Full Name, Username, and Email.');
      return;
    }

    const cleanUsername = formData.username.trim().toLowerCase();
    const existing = db.getUserByUsername(cleanUsername);
    if (existing) {
      setError(`Username "${cleanUsername}" is already taken.`);
      return;
    }

    const newStaff = db.createUser({
      fullName: formData.fullName.trim(),
      username: cleanUsername,
      password: formData.password || 'staff123',
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      address: formData.station.trim(),
      licenseNumber: formData.licenseNumber.trim(),
      licenseExpiry: '2030-12-31',
      role: 'staff',
      verificationStatus: 'verified',
      status: 'active',
      staffNotes: 'Fleet Inspector staff account provisioned by Head Admin'
    });
    onAdded(newStaff);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 text-slate-100 my-8 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Provision New Staff Account</h3>
              <p className="text-[11px] text-slate-400">Create credentials for fleet inspectors &amp; staff</p>
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-white cursor-pointer" /></button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-400 mb-1 font-medium">Full Staff Name *</label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="e.g. Maria Santos"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Staff Username *</label>
              <input
                type="text"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="e.g. staff_maria"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Temporary Password *</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="staff123"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Work Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="maria@automotion.com"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Contact Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+63 912 345 6789"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Station / Inspection Bay</label>
              <input
                type="text"
                value={formData.station}
                onChange={(e) => setFormData({ ...formData, station: e.target.value })}
                placeholder="e.g. Terminal 1 Bay"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">License / Staff Badge ID</label>
              <input
                type="text"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                placeholder="STAFF-CERT-01"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold cursor-pointer transition-colors"
            >
              Create Staff Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddCustomerModal({ onClose, onAdded }: { onClose: () => void; onAdded: (u: User) => void }) {
  const [formData, setFormData] = useState({
    username: '',
    password: 'password123',
    fullName: '',
    email: '',
    phone: '',
    licenseNumber: '',
    licenseExpiry: '2028-12-31',
    role: 'customer' as const,
    verificationStatus: 'verified' as const,
    status: 'active' as const
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.username || !formData.email) {
      alert('Please fill required fields.');
      return;
    }
    const newUser = db.createUser(formData);
    onAdded(newUser);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 text-slate-100 my-8 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <h3 className="font-bold text-white text-lg">Add New Customer</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Full Legal Name</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Driver License ID</label>
            <input
              type="text"
              value={formData.licenseNumber}
              onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono"
            />
          </div>

          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer"
            >
              Add Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditCustomerModal({ customer, onClose, onUpdated }: { customer: User; onClose: () => void; onUpdated: (u: User) => void }) {
  const [formData, setFormData] = useState({ ...customer });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateUser(formData);
    onUpdated(formData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 text-slate-100 my-8 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-800">
          <h3 className="font-bold text-white text-lg">Edit Account @{customer.username} ({customer.role.toUpperCase()})</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-white cursor-pointer" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Full Legal Name</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Verification Status</label>
              <select
                value={formData.verificationStatus}
                onChange={(e: any) => setFormData({ ...formData, verificationStatus: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
              >
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Account Status</label>
              <select
                value={formData.status}
                onChange={(e: any) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
              >
                <option value="active">Active</option>
                <option value="banned">Banned</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="pt-3 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer"
            >
              Save Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
