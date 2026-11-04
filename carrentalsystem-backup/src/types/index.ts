export type UserRole = 'customer' | 'staff' | 'admin';

export type VerificationStatus = 'verified' | 'pending' | 'rejected';
export type AccountStatus = 'active' | 'suspended' | 'banned';

export interface User {
  id: string;
  username: string;
  password: string; // Stored securely in client NoSQL document store
  role: UserRole;
  fullName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  licenseImage?: string;
  address?: string;
  verificationStatus: VerificationStatus;
  status: AccountStatus;
  createdAt: string;
  staffNotes?: string;
}

export type VehicleType = 'car' | 'motorcycle';
export type VehicleCategory = 
  | 'sedan' 
  | 'suv' 
  | 'luxury' 
  | 'sports' 
  | 'electric' 
  | 'cruiser' 
  | 'sportbike' 
  | 'scooter';

export type VehicleStatus = 
  | 'available' 
  | 'rented' 
  | 'maintenance' 
  | 'cleaning' 
  | 'out_of_service';

export interface MaintenanceRecord {
  id: string;
  date: string;
  description: string;
  cost: number;
  staffName: string;
}

export interface DamageReport {
  id: string;
  date: string;
  description: string;
  severity: 'minor' | 'moderate' | 'major';
  reportedBy: string;
}

export interface Vehicle {
  id: string;
  type: VehicleType;
  make: string;
  model: string;
  year: number;
  category: VehicleCategory;
  licensePlate: string;
  dailyRate: number;
  hourlyRate: number;
  transmission: 'Automatic' | 'Manual';
  fuelType: 'Gasoline' | 'Diesel' | 'Electric' | 'Hybrid';
  seats: number;
  mileage: number;
  fuelLevel: number; // 0 - 100%
  status: VehicleStatus;
  imageUrl: string;
  features: string[];
  location: string;
  description: string;
  maintenanceLog: MaintenanceRecord[];
  damageReports: DamageReport[];
}

export type RentalStatus = 'active' | 'completed' | 'cancelled' | 'pending';

export interface RentalAddOn {
  id: string;
  name: string;
  pricePerDay: number;
  selected: boolean;
}

export interface Rental {
  id: string;
  bookingCode: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerLicense: string;
  vehicleId: string;
  vehicleName: string;
  vehiclePlate: string;
  vehicleType: VehicleType;
  vehicleImage: string;
  startDate: string;
  endDate: string;
  days: number;
  pickupLocation: string;
  returnLocation: string;
  dailyRate: number;
  subtotal: number;
  insuranceFee: number;
  addOnsTotal: number;
  addOnsList: string[];
  securityDeposit: number;
  tax: number;
  totalAmount: number;
  status: RentalStatus;
  paymentStatus: 'paid' | 'pending' | 'refunded';
  paymentMethod: string;
  createdAt: string;
  returnNotes?: string;
  returnMileage?: number;
  returnFuelLevel?: number;

  // Rental Scheduling & Late Return Fee Integration
  pickupDateTime?: string;           // ISO timestamp in Asia/Manila
  pickupDate?: string;               // YYYY-MM-DD
  pickupTime?: string;               // HH:mm (e.g. 10:00)
  expectedReturnDateTime?: string;   // ISO timestamp in Asia/Manila
  expectedReturnDate?: string;       // YYYY-MM-DD
  expectedReturnTime?: string;       // HH:mm (e.g. 10:00)
  actualReturnDateTime?: string;     // ISO timestamp when vehicle was returned
  gracePeriodMinutes?: number;       // 59 minutes
  lateMinutes?: number;              // Total elapsed late minutes
  chargeableLateHours?: number;      // floor(lateMinutes / 60)
  lateReturnFee?: number;            // chargeableLateHours * ₱20
  baseRentalAmount?: number;         // Original rental amount before late fees
  finalRentalAmount?: number;        // baseRentalAmount + lateReturnFee
  returnProcessed?: boolean;         // Atomic idempotency flag
  returnProcessedAt?: string;        // Timestamp when return was processed
  returnProcessedBy?: string;        // Staff or admin identifier
}

export interface RentalReportSummary {
  totalRevenue: number;
  totalRentals: number;
  activeRentalsCount: number;
  fleetUtilizationRate: number;
  carsUtilization: number;
  motorsUtilization: number;
  totalVehicles: number;
  availableVehicles: number;
  maintenanceVehicles: number;
  totalCustomers: number;
  pendingVerifications: number;
  totalLateFeesRevenue: number;
  lateReturnsCount: number;
}
