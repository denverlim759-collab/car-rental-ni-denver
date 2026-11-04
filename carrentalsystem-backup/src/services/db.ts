import { 
  User, 
  Vehicle, 
  Rental, 
  RentalReportSummary, 
  MaintenanceRecord, 
  DamageReport 
} from '../types';
import { 
  db as firestoreDb, 
  handleFirestoreError, 
  OperationType,
  testConnection 
} from '../firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  getDocs
} from 'firebase/firestore';
import { 
  calculateLateFee, 
  createPhilippineIsoString, 
  calculateExpectedReturnSchedule, 
  getCurrentPhilippineSchedule 
} from '../utils/time';

const USERS_KEY = 'automotion_nosql_users_v2';
const VEHICLES_KEY = 'automotion_nosql_vehicles_v2';
const RENTALS_KEY = 'automotion_nosql_rentals_v2';
const CURRENT_USER_KEY = 'automotion_nosql_current_user_v2';

// Baseline System Accounts (Essential for Staff and Admin authentication)
const BASE_USERS: User[] = [
  {
    id: 'usr_admin_master',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    fullName: 'System Administrator',
    email: 'admin@automotion.com',
    phone: '+1 (555) 000-0001',
    licenseNumber: 'DL-ADMIN-001',
    licenseExpiry: '2030-12-31',
    verificationStatus: 'verified',
    status: 'active',
    createdAt: new Date().toISOString(),
    address: 'System Headquarters',
  },
  {
    id: 'usr_staff_master',
    username: 'staff',
    password: 'staff123',
    role: 'staff',
    fullName: 'Fleet Staff Inspector',
    email: 'staff@automotion.com',
    phone: '+1 (555) 000-0002',
    licenseNumber: 'DL-STAFF-001',
    licenseExpiry: '2030-12-31',
    verificationStatus: 'verified',
    status: 'active',
    createdAt: new Date().toISOString(),
    address: 'Inspection Bay 1',
  }
];

const BASE_VEHICLES: Vehicle[] = [];
const BASE_RENTALS: Rental[] = [];

// In-memory / cache storage
let inMemoryUsers: User[] = loadLocalCollection<User>(USERS_KEY, BASE_USERS);
let inMemoryVehicles: Vehicle[] = loadLocalCollection<Vehicle>(VEHICLES_KEY, BASE_VEHICLES);
let inMemoryRentals: Rental[] = loadLocalCollection<Rental>(RENTALS_KEY, BASE_RENTALS);

function loadLocalCollection<T>(key: string, defaultData: T[]): T[] {
  try {
    if (typeof localStorage === 'undefined') {
      return defaultData;
    }
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultData));
      return defaultData;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : defaultData;
  } catch (e) {
    console.error(`Failed to load ${key}:`, e);
    return defaultData;
  }
}

function saveLocalCollection<T>(key: string, data: T[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(data));
    }
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('nosql_store_updated', { detail: { key } }));
    }
  } catch (e) {
    console.error(`Failed to save ${key}:`, e);
  }
}

// Helper to recursively remove undefined values before writing to Firestore
function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanFirestoreData(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        cleaned[key] = cleanFirestoreData(val);
      }
    }
    return cleaned as T;
  }
  return obj;
}

// Check and seed baseline accounts into Firestore if empty
async function seedFirestoreIfEmpty() {
  const usersPath = 'users';
  try {
    const snap = await getDocs(collection(firestoreDb, usersPath));
    if (snap.empty) {
      for (const user of BASE_USERS) {
        await setDoc(doc(firestoreDb, usersPath, user.id), cleanFirestoreData(user));
      }
    }
  } catch (err) {
    console.warn('Initial Firestore seeding check note:', err);
  }
}

// Initialize Firestore Real-time synchronization
function initFirestoreSync() {
  testConnection();
  seedFirestoreIfEmpty();

  // Users listener
  const usersPath = 'users';
  onSnapshot(
    collection(firestoreDb, usersPath),
    (snapshot) => {
      const fetched: User[] = [];
      snapshot.forEach((d) => {
        fetched.push(d.data() as User);
      });
      if (fetched.length > 0) {
        // Ensure baseline admin and staff exist
        for (const base of BASE_USERS) {
          if (!fetched.some((u) => u.id === base.id || u.username === base.username)) {
            fetched.push(base);
          }
        }
        inMemoryUsers = fetched;
        saveLocalCollection(USERS_KEY, inMemoryUsers);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, usersPath);
    }
  );

  // Vehicles listener
  const vehiclesPath = 'vehicles';
  onSnapshot(
    collection(firestoreDb, vehiclesPath),
    (snapshot) => {
      const fetched: Vehicle[] = [];
      snapshot.forEach((d) => {
        fetched.push(d.data() as Vehicle);
      });
      inMemoryVehicles = fetched;
      saveLocalCollection(VEHICLES_KEY, inMemoryVehicles);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, vehiclesPath);
    }
  );

  // Rentals listener
  const rentalsPath = 'rentals';
  onSnapshot(
    collection(firestoreDb, rentalsPath),
    (snapshot) => {
      const fetched: Rental[] = [];
      snapshot.forEach((d) => {
        fetched.push(d.data() as Rental);
      });
      inMemoryRentals = fetched;
      saveLocalCollection(RENTALS_KEY, inMemoryRentals);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, rentalsPath);
    }
  );
}

// Start listeners immediately
initFirestoreSync();

export const db = {
  // Clear all data
  clearAll() {
    localStorage.removeItem(USERS_KEY);
    localStorage.removeItem(VEHICLES_KEY);
    localStorage.removeItem(RENTALS_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    inMemoryUsers = [...BASE_USERS];
    inMemoryVehicles = [];
    inMemoryRentals = [];
    window.dispatchEvent(new CustomEvent('nosql_store_updated', { detail: { key: 'all' } }));
  },

  // Reset to clean baseline
  async resetToDefault() {
    try {
      localStorage.setItem(USERS_KEY, JSON.stringify(BASE_USERS));
      localStorage.setItem(VEHICLES_KEY, JSON.stringify(BASE_VEHICLES));
      localStorage.setItem(RENTALS_KEY, JSON.stringify(BASE_RENTALS));
      localStorage.removeItem(CURRENT_USER_KEY);
      inMemoryUsers = [...BASE_USERS];
      inMemoryVehicles = [];
      inMemoryRentals = [];
      window.dispatchEvent(new CustomEvent('nosql_store_updated', { detail: { key: 'all' } }));

      // Clean Firestore collections and write base users
      for (const u of BASE_USERS) {
        await setDoc(doc(firestoreDb, 'users', u.id), cleanFirestoreData(u)).catch((e) =>
          handleFirestoreError(e, OperationType.WRITE, `users/${u.id}`)
        );
      }
    } catch (e) {
      console.error('Reset error:', e);
    }
  },

  // USERS COLLECTION
  getUsers(): User[] {
    return inMemoryUsers.length > 0 ? inMemoryUsers : loadLocalCollection<User>(USERS_KEY, BASE_USERS);
  },

  getCustomers(): User[] {
    return this.getUsers().filter(u => u.role === 'customer');
  },

  getStaff(): User[] {
    return this.getUsers().filter(u => u.role === 'staff');
  },

  getUserById(id: string): User | undefined {
    return this.getUsers().find(u => u.id === id);
  },

  getUserByUsername(username: string): User | undefined {
    const cleanUsername = username.trim().toLowerCase();
    return this.getUsers().find(u => u.username.toLowerCase() === cleanUsername);
  },

  // Register Customer / User
  registerCustomer(details: {
    username: string;
    password: string;
    fullName: string;
    email: string;
    phone: string;
    licenseNumber: string;
    licenseExpiry: string;
    address?: string;
    licenseImage?: string;
    role?: 'customer' | 'staff' | 'admin';
  }): { success: boolean; user?: User; error?: string } {
    const users = this.getUsers();
    const existing = users.find(u => u.username.toLowerCase() === details.username.trim().toLowerCase());
    if (existing) {
      return { success: false, error: 'Username already exists. Please choose another username.' };
    }

    const emailExisting = users.find(u => u.email.toLowerCase() === details.email.trim().toLowerCase());
    if (emailExisting) {
      return { success: false, error: 'An account with this email address already exists.' };
    }

    const role = details.role || 'customer';

    const newUser: User = {
      id: `usr_${role}_${Date.now()}`,
      username: details.username.trim(),
      password: details.password,
      role,
      fullName: details.fullName.trim(),
      email: details.email.trim(),
      phone: details.phone.trim(),
      licenseNumber: details.licenseNumber.trim(),
      licenseExpiry: details.licenseExpiry,
      address: details.address || '',
      licenseImage: details.licenseImage || '',
      verificationStatus: role === 'customer' ? 'pending' : 'verified',
      status: 'active',
      createdAt: new Date().toISOString(),
      staffNotes: role === 'customer' ? 'Awaiting staff verification review.' : 'Staff/Admin registered account'
    };

    inMemoryUsers.push(newUser);
    saveLocalCollection(USERS_KEY, inMemoryUsers);

    // Persist to Firestore
    const userDocPath = `users/${newUser.id}`;
    setDoc(doc(firestoreDb, 'users', newUser.id), cleanFirestoreData(newUser)).catch((err) => {
      handleFirestoreError(err, OperationType.CREATE, userDocPath);
    });

    return { success: true, user: newUser };
  },

  // Update Customer / User
  updateUser(updated: User): void {
    const idx = inMemoryUsers.findIndex(u => u.id === updated.id);
    if (idx !== -1) {
      inMemoryUsers[idx] = updated;
      saveLocalCollection(USERS_KEY, inMemoryUsers);
    }

    const path = `users/${updated.id}`;
    setDoc(doc(firestoreDb, 'users', updated.id), cleanFirestoreData(updated)).catch((err) => {
      handleFirestoreError(err, OperationType.UPDATE, path);
    });
  },

  // Verify Customer Status
  updateCustomerVerification(userId: string, status: 'verified' | 'pending' | 'rejected', notes?: string): void {
    const user = inMemoryUsers.find(u => u.id === userId);
    if (user) {
      user.verificationStatus = status;
      if (notes) {
        user.staffNotes = notes;
      }
      saveLocalCollection(USERS_KEY, inMemoryUsers);

      const path = `users/${userId}`;
      setDoc(doc(firestoreDb, 'users', userId), cleanFirestoreData(user)).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, path);
      });
    }
  },

  // Delete Customer
  deleteUser(userId: string): void {
    inMemoryUsers = inMemoryUsers.filter(u => u.id !== userId);
    saveLocalCollection(USERS_KEY, inMemoryUsers);

    const path = `users/${userId}`;
    deleteDoc(doc(firestoreDb, 'users', userId)).catch((err) => {
      handleFirestoreError(err, OperationType.DELETE, path);
    });
  },

  // Create User
  createUser(user: Omit<User, 'id' | 'createdAt'>): User {
    const newUser: User = {
      ...user,
      id: `usr_${user.role}_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    inMemoryUsers.push(newUser);
    saveLocalCollection(USERS_KEY, inMemoryUsers);

    const path = `users/${newUser.id}`;
    setDoc(doc(firestoreDb, 'users', newUser.id), cleanFirestoreData(newUser)).catch((err) => {
      handleFirestoreError(err, OperationType.CREATE, path);
    });

    return newUser;
  },

  // VEHICLES COLLECTION
  getVehicles(): Vehicle[] {
    return inMemoryVehicles.length > 0 ? inMemoryVehicles : loadLocalCollection<Vehicle>(VEHICLES_KEY, BASE_VEHICLES);
  },

  getAvailableVehicles(): Vehicle[] {
    return this.getVehicles().filter(v => v.status === 'available');
  },

  getVehicleById(id: string): Vehicle | undefined {
    return this.getVehicles().find(v => v.id === id);
  },

  // Update Vehicle Status
  updateVehicleStatus(
    id: string, 
    status: Vehicle['status'], 
    updates?: { fuelLevel?: number; mileage?: number; note?: string; staffName?: string }
  ): void {
    const vehicle = inMemoryVehicles.find(v => v.id === id);
    if (vehicle) {
      vehicle.status = status;
      if (updates?.fuelLevel !== undefined) vehicle.fuelLevel = updates.fuelLevel;
      if (updates?.mileage !== undefined) vehicle.mileage = updates.mileage;
      
      if (updates?.note && updates.staffName) {
        vehicle.maintenanceLog.unshift({
          id: `m_${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          description: updates.note,
          cost: 0,
          staffName: updates.staffName
        });
      }
      saveLocalCollection(VEHICLES_KEY, inMemoryVehicles);

      const path = `vehicles/${id}`;
      setDoc(doc(firestoreDb, 'vehicles', id), cleanFirestoreData(vehicle)).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, path);
      });
    }
  },

  // Add Vehicle
  addVehicle(vehicle: Omit<Vehicle, 'id' | 'maintenanceLog' | 'damageReports'>): Vehicle {
    const newVehicle: Vehicle = {
      ...vehicle,
      id: `veh_${vehicle.type}_${Date.now()}`,
      maintenanceLog: [],
      damageReports: []
    };
    inMemoryVehicles.unshift(newVehicle);
    saveLocalCollection(VEHICLES_KEY, inMemoryVehicles);

    const path = `vehicles/${newVehicle.id}`;
    setDoc(doc(firestoreDb, 'vehicles', newVehicle.id), cleanFirestoreData(newVehicle)).catch((err) => {
      handleFirestoreError(err, OperationType.CREATE, path);
    });

    return newVehicle;
  },

  // Edit Vehicle
  updateVehicle(updated: Vehicle): void {
    const idx = inMemoryVehicles.findIndex(v => v.id === updated.id);
    if (idx !== -1) {
      inMemoryVehicles[idx] = updated;
      saveLocalCollection(VEHICLES_KEY, inMemoryVehicles);
    }

    const path = `vehicles/${updated.id}`;
    setDoc(doc(firestoreDb, 'vehicles', updated.id), cleanFirestoreData(updated)).catch((err) => {
      handleFirestoreError(err, OperationType.UPDATE, path);
    });
  },

  // Delete Vehicle
  deleteVehicle(id: string): void {
    inMemoryVehicles = inMemoryVehicles.filter(v => v.id !== id);
    saveLocalCollection(VEHICLES_KEY, inMemoryVehicles);

    const path = `vehicles/${id}`;
    deleteDoc(doc(firestoreDb, 'vehicles', id)).catch((err) => {
      handleFirestoreError(err, OperationType.DELETE, path);
    });
  },

  // Log Maintenance
  addMaintenanceLog(vehicleId: string, record: Omit<MaintenanceRecord, 'id'>): void {
    const vehicle = inMemoryVehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      vehicle.maintenanceLog.unshift({
        ...record,
        id: `m_${Date.now()}`
      });
      saveLocalCollection(VEHICLES_KEY, inMemoryVehicles);

      const path = `vehicles/${vehicleId}`;
      setDoc(doc(firestoreDb, 'vehicles', vehicleId), cleanFirestoreData(vehicle)).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, path);
      });
    }
  },

  // Log Damage
  addDamageReport(vehicleId: string, report: Omit<DamageReport, 'id'>): void {
    const vehicle = inMemoryVehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      vehicle.damageReports.unshift({
        ...report,
        id: `d_${Date.now()}`
      });
      saveLocalCollection(VEHICLES_KEY, inMemoryVehicles);

      const path = `vehicles/${vehicleId}`;
      setDoc(doc(firestoreDb, 'vehicles', vehicleId), cleanFirestoreData(vehicle)).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, path);
      });
    }
  },

  // RENTALS COLLECTION
  getRentals(): Rental[] {
    return inMemoryRentals.length > 0 ? inMemoryRentals : loadLocalCollection<Rental>(RENTALS_KEY, BASE_RENTALS);
  },

  getRentalsByUser(userId: string): Rental[] {
    return this.getRentals().filter(r => r.userId === userId);
  },

  // Rent a Car / Motor with Pickup Schedule and Expected Return Schedule
  createRental(rentalData: Omit<Rental, 'id' | 'bookingCode' | 'createdAt'>): Rental {
    const bookingCode = `AM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Determine pickup & expected return schedule fallbacks if not provided
    const pickupDate = rentalData.pickupDate || rentalData.startDate;
    const pickupTime = rentalData.pickupTime || '10:00';
    const computedSched = calculateExpectedReturnSchedule(pickupDate, pickupTime, rentalData.days);

    const pickupDateTime = rentalData.pickupDateTime || computedSched.pickupIso;
    const expectedReturnDateTime = rentalData.expectedReturnDateTime || computedSched.expectedReturnIso;
    const expectedReturnDate = rentalData.expectedReturnDate || computedSched.expectedReturnDate;
    const expectedReturnTime = rentalData.expectedReturnTime || computedSched.expectedReturnTime;

    const baseRentalAmount = rentalData.baseRentalAmount ?? rentalData.totalAmount;
    const finalRentalAmount = rentalData.finalRentalAmount ?? rentalData.totalAmount;

    const newRental: Rental = {
      ...rentalData,
      id: `rent_${Date.now()}`,
      bookingCode,
      pickupDate,
      pickupTime,
      pickupDateTime,
      expectedReturnDate,
      expectedReturnTime,
      expectedReturnDateTime,
      gracePeriodMinutes: 59,
      lateMinutes: 0,
      chargeableLateHours: 0,
      lateReturnFee: 0,
      baseRentalAmount,
      finalRentalAmount,
      returnProcessed: false,
      createdAt: new Date().toISOString()
    };

    inMemoryRentals.unshift(newRental);
    saveLocalCollection(RENTALS_KEY, inMemoryRentals);

    // Update vehicle status to rented
    this.updateVehicleStatus(rentalData.vehicleId, 'rented');

    // Persist rental in Firestore
    const path = `rentals/${newRental.id}`;
    setDoc(doc(firestoreDb, 'rentals', newRental.id), cleanFirestoreData(newRental)).catch((err) => {
      handleFirestoreError(err, OperationType.CREATE, path);
    });

    return newRental;
  },

  // Complete Rental Return (Atomic & Idempotent with Grace Period and Late Return Fee)
  completeRentalReturn(
    rentalId: string, 
    details: { 
      returnNotes?: string; 
      returnMileage?: number; 
      returnFuelLevel?: number;
      actualReturnDateTime?: string;
      processedBy?: string;
    }
  ): Rental | null {
    const rental = inMemoryRentals.find(r => r.id === rentalId);
    if (!rental) return null;

    // Idempotency check: A completed rental must not receive another late fee if the return action is repeated
    if (rental.returnProcessed || rental.status === 'completed') {
      console.warn(`Rental ${rental.bookingCode} is already completed. Duplicate return processing prevented.`);
      return rental;
    }

    // 1. Capture actual return date & time (Philippine Time ISO)
    const actualReturnDateTime = details.actualReturnDateTime || new Date().toISOString();

    // 2. Identify expected return date & time
    let expectedReturn = rental.expectedReturnDateTime;
    if (!expectedReturn) {
      expectedReturn = createPhilippineIsoString(rental.endDate, '10:00');
    }

    // 3. Calculate total late time and late return fee (59-min grace period, ₱20/hour)
    const lateFeeCalc = calculateLateFee(expectedReturn, actualReturnDateTime);

    const baseAmount = rental.baseRentalAmount ?? rental.totalAmount;
    const lateFee = lateFeeCalc.lateReturnFee;
    const finalAmount = baseAmount + lateFee;

    // 4. Update rental financial and scheduling records
    rental.status = 'completed';
    rental.actualReturnDateTime = actualReturnDateTime;
    rental.gracePeriodMinutes = 59;
    rental.lateMinutes = lateFeeCalc.lateMinutes;
    rental.chargeableLateHours = lateFeeCalc.chargeableLateHours;
    rental.lateReturnFee = lateFee;
    rental.baseRentalAmount = baseAmount;
    rental.finalRentalAmount = finalAmount;
    rental.totalAmount = finalAmount; // Keep totalAmount in sync for backwards compatibility
    rental.returnProcessed = true;
    rental.returnProcessedAt = new Date().toISOString();
    if (details.processedBy) rental.returnProcessedBy = details.processedBy;
    if (details.returnNotes) rental.returnNotes = details.returnNotes;
    if (details.returnMileage !== undefined) rental.returnMileage = details.returnMileage;
    if (details.returnFuelLevel !== undefined) rental.returnFuelLevel = details.returnFuelLevel;

    saveLocalCollection(RENTALS_KEY, inMemoryRentals);

    // 5. Persist return to Firestore
    const path = `rentals/${rentalId}`;
    setDoc(doc(firestoreDb, 'rentals', rentalId), cleanFirestoreData(rental)).catch((err) => {
      handleFirestoreError(err, OperationType.UPDATE, path);
    });

    // 6. Return vehicle to cleaning / detailing bay
    this.updateVehicleStatus(rental.vehicleId, 'cleaning', {
      mileage: details.returnMileage,
      fuelLevel: details.returnFuelLevel,
      note: `Returned (Actual: ${actualReturnDateTime}). Late Fee: ₱${lateFee}. Moved to detailing bay.`
    });

    return rental;
  },

  // Cancel Rental
  cancelRental(rentalId: string, reason?: string): void {
    const rental = inMemoryRentals.find(r => r.id === rentalId);
    if (rental) {
      rental.status = 'cancelled';
      rental.paymentStatus = 'refunded';
      if (reason) rental.returnNotes = `Cancelled: ${reason}`;
      saveLocalCollection(RENTALS_KEY, inMemoryRentals);

      const path = `rentals/${rentalId}`;
      setDoc(doc(firestoreDb, 'rentals', rentalId), cleanFirestoreData(rental)).catch((err) => {
        handleFirestoreError(err, OperationType.UPDATE, path);
      });

      // Re-open vehicle
      this.updateVehicleStatus(rental.vehicleId, 'available');
    }
  },

  // REPORTS & ANALYTICS
  getReports(): RentalReportSummary {
    const rentals = this.getRentals();
    const vehicles = this.getVehicles();
    const customers = this.getCustomers();

    const totalRevenue = rentals
      .filter(r => r.status === 'completed' || r.status === 'active')
      .reduce((sum, r) => sum + r.totalAmount, 0);

    const totalLateFeesRevenue = rentals
      .filter(r => r.status === 'completed' || r.status === 'active')
      .reduce((sum, r) => sum + (r.lateReturnFee || 0), 0);

    const lateReturnsCount = rentals.filter(r => (r.lateReturnFee || 0) > 0).length;

    const activeRentalsCount = rentals.filter(r => r.status === 'active').length;
    const cars = vehicles.filter(v => v.type === 'car');
    const motors = vehicles.filter(m => m.type === 'motorcycle');

    const rentedCars = cars.filter(c => c.status === 'rented').length;
    const rentedMotors = motors.filter(m => m.status === 'rented').length;

    const carsUtilization = cars.length > 0 ? Math.round((rentedCars / cars.length) * 100) : 0;
    const motorsUtilization = motors.length > 0 ? Math.round((rentedMotors / motors.length) * 100) : 0;
    const fleetUtilizationRate = vehicles.length > 0 ? Math.round((activeRentalsCount / vehicles.length) * 100) : 0;

    const availableVehicles = vehicles.filter(v => v.status === 'available').length;
    const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance' || v.status === 'cleaning').length;
    const pendingVerifications = customers.filter(c => c.verificationStatus === 'pending').length;

    return {
      totalRevenue,
      totalRentals: rentals.length,
      activeRentalsCount,
      fleetUtilizationRate,
      carsUtilization,
      motorsUtilization,
      totalVehicles: vehicles.length,
      availableVehicles,
      maintenanceVehicles,
      totalCustomers: customers.length,
      pendingVerifications,
      totalLateFeesRevenue,
      lateReturnsCount
    };
  },

  // SESSION MANAGEMENT
  getCurrentUser(): User | null {
    try {
      const raw = localStorage.getItem(CURRENT_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setCurrentUser(user: User | null): void {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
    window.dispatchEvent(new CustomEvent('nosql_store_updated', { detail: { key: CURRENT_USER_KEY } }));
  }
};
