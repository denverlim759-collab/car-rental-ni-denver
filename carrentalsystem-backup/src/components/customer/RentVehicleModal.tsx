import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  X, 
  Car, 
  Bike, 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  CreditCard, 
  Check, 
  AlertCircle, 
  Sparkles,
  CheckCircle2,
  Clock,
  Info
} from 'lucide-react';
import { Vehicle, User, Rental } from '../../types';
import { db } from '../../services/db';
import { 
  getCurrentPhilippineSchedule, 
  calculateExpectedReturnSchedule, 
  createPhilippineIsoString, 
  formatPhilippineDateTime 
} from '../../utils/time';

interface RentVehicleModalProps {
  vehicle: Vehicle;
  user: User;
  onClose: () => void;
  onSuccess: (rental: Rental) => void;
}

export const RentVehicleModal: React.FC<RentVehicleModalProps> = ({
  vehicle,
  user,
  onClose,
  onSuccess
}) => {
  // Current Philippine Schedule baseline
  const currentPst = getCurrentPhilippineSchedule();

  // Schedule States (Philippine Time UTC+8)
  const [pickupDate, setPickupDate] = useState(currentPst.date);
  const [pickupTime, setPickupTime] = useState('10:00');
  const [rentalDays, setRentalDays] = useState<number>(1); // Default 24 hours (1 day)

  // Computed Expected Return
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [expectedReturnTime, setExpectedReturnTime] = useState('');
  const [expectedReturnIso, setExpectedReturnIso] = useState('');
  const [pickupIso, setPickupIso] = useState('');

  // Automatically recalculate Expected Return Schedule (24-hour cycle from pickup)
  useEffect(() => {
    if (pickupDate && pickupTime) {
      const computed = calculateExpectedReturnSchedule(pickupDate, pickupTime, rentalDays);
      setExpectedReturnDate(computed.expectedReturnDate);
      setExpectedReturnTime(computed.expectedReturnTime);
      setExpectedReturnIso(computed.expectedReturnIso);
      setPickupIso(computed.pickupIso);
    }
  }, [pickupDate, pickupTime, rentalDays]);

  const [pickupLocation, setPickupLocation] = useState(vehicle.location || 'Downtown Main Hub');
  const [returnLocation, setReturnLocation] = useState(vehicle.location || 'Downtown Main Hub');

  // Insurance
  const [insurancePlan, setInsurancePlan] = useState<'basic' | 'premium' | 'none'>('premium');

  // Add-ons
  const [selectedAddons, setSelectedAddons] = useState<string[]>([
    vehicle.type === 'motorcycle' ? 'Dual Helmets Kit' : 'Garmin GPS Navigator'
  ]);

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState('Credit Card (Visa •••• 4242)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pricing calculations
  const diffDays = Math.max(1, rentalDays);
  const dailyRate = vehicle.dailyRate;
  const subtotal = dailyRate * diffDays;
  
  const insuranceRatePerDay = insurancePlan === 'premium' ? 20 : insurancePlan === 'basic' ? 10 : 0;
  const insuranceFee = insuranceRatePerDay * diffDays;

  // Addons calculations
  const availableAddons = vehicle.type === 'motorcycle' 
    ? [
        { id: 'helmets', name: 'Dual Helmets Kit', price: 10 },
        { id: 'mount', name: 'QuadLock Phone Mount', price: 5 },
        { id: 'jacket', name: 'All-Weather Armor Jacket', price: 15 },
        { id: 'roadside', name: '24/7 Roadside Assistance', price: 8 }
      ]
    : [
        { id: 'gps', name: 'Garmin GPS Navigator', price: 10 },
        { id: 'child_seat', name: 'Child Safety Seat', price: 12 },
        { id: 'driver', name: 'Additional Registered Driver', price: 15 },
        { id: 'toll', name: 'Unlimited Toll Pass Transponder', price: 14 }
      ];

  const addOnsTotal = selectedAddons.reduce((sum, addonName) => {
    const item = availableAddons.find(a => a.name === addonName);
    return sum + (item ? item.price * diffDays : 0);
  }, 0);

  const securityDeposit = vehicle.type === 'motorcycle' ? 250 : vehicle.category === 'luxury' ? 500 : 200;
  const tax = Math.round((subtotal + insuranceFee + addOnsTotal) * 0.08);
  const totalAmount = subtotal + insuranceFee + addOnsTotal + securityDeposit + tax;

  const toggleAddon = (name: string) => {
    setSelectedAddons(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleConfirmRental = () => {
    setError(null);

    if (!pickupDate || !pickupTime) {
      setError('Please select both a valid pickup date and time.');
      return;
    }

    const currentMs = Date.now();
    const pickupMs = new Date(pickupIso).getTime();
    const expectedReturnMs = new Date(expectedReturnIso).getTime();

    // Validation 1: Pickup date/time must not be in the past (allow 10-minute leeway for clock differences)
    if (pickupMs < currentMs - 10 * 60 * 1000) {
      setError('Pickup date and time cannot be in the past. Please choose a future pickup schedule.');
      return;
    }

    // Validation 2: Expected return must be later than pickup
    if (expectedReturnMs <= pickupMs) {
      setError('Expected return date and time must be later than pickup schedule.');
      return;
    }

    setIsSubmitting(true);

    try {
      const newRental = db.createRental({
        userId: user.id,
        customerName: user.fullName,
        customerEmail: user.email,
        customerPhone: user.phone,
        customerLicense: user.licenseNumber,
        vehicleId: vehicle.id,
        vehicleName: `${vehicle.make} ${vehicle.model} (${vehicle.year})`,
        vehiclePlate: vehicle.licensePlate,
        vehicleType: vehicle.type,
        vehicleImage: vehicle.imageUrl,
        startDate: pickupDate,
        endDate: expectedReturnDate,
        days: diffDays,
        pickupLocation,
        returnLocation,
        dailyRate,
        subtotal,
        insuranceFee,
        addOnsTotal,
        addOnsList: selectedAddons,
        securityDeposit,
        tax,
        totalAmount,
        baseRentalAmount: totalAmount,
        finalRentalAmount: totalAmount,
        status: 'active',
        paymentStatus: 'paid',
        paymentMethod,
        // Rental Scheduling & Grace Period
        pickupDate,
        pickupTime,
        pickupDateTime: pickupIso,
        expectedReturnDate,
        expectedReturnTime,
        expectedReturnDateTime: expectedReturnIso,
        gracePeriodMinutes: 59,
        lateMinutes: 0,
        chargeableLateHours: 0,
        lateReturnFee: 0,
      });

      // Celebration
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // Fallback
      }

      setIsSubmitting(false);
      onSuccess(newRental);
    } catch (err) {
      console.error(err);
      setError('Failed to process rental. Please check details and try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-100 my-8 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              {vehicle.type === 'car' ? <Car className="w-6 h-6" /> : <Bike className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-xl">
                  Rent {vehicle.make} {vehicle.model}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono uppercase">
                  {vehicle.category}
                </span>
              </div>
              <p className="text-xs text-slate-400">Select dates, protection plan, and equipment add-ons</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Booking Options */}
          <div className="lg:col-span-7 space-y-5">
            {/* Dates & Pickup Location */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  1. Pickup &amp; Return Schedule (Asia/Manila)
                </h4>
                <span className="text-[10px] text-cyan-400 font-mono bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                  UTC+8 Time
                </span>
              </div>

              {/* Pickup Schedule: Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-cyan-400" />
                    Pickup Date
                  </label>
                  <input
                    type="date"
                    min={currentPst.date}
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    Pickup Time
                  </label>
                  <input
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Rental Duration Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                  Rental Duration (24-Hour Cycle)
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 5, 7].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setRentalDays(num)}
                      className={`py-1.5 px-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        rentalDays === num
                          ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/30 font-bold'
                          : 'bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300'
                      }`}
                    >
                      {num} {num === 1 ? 'Day (24h)' : `${num}d`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Automatic Calculated Expected Return Schedule Card */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-950 to-slate-900 border border-cyan-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Calculated Expected Return Schedule</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40">
                    +{rentalDays * 24} Hours Automated
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Expected Return Date &amp; Time</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {expectedReturnIso ? formatPhilippineDateTime(expectedReturnIso) : 'Calculating...'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Station</span>
                    <span className="text-xs font-semibold text-slate-300">{returnLocation}</span>
                  </div>
                </div>

                {/* Grace Period & Late Fee Notice */}
                <div className="pt-2 border-t border-slate-800/80 flex items-start gap-2 text-[11px] text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="leading-snug">
                    <strong className="text-emerald-400">59-Minute Grace Period Included:</strong> Return within 59 mins after expected return time for ₱0 penalty fee. Late returns at 60 mins or more are charged at <span className="text-amber-300 font-mono font-semibold">₱20/hour</span>.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Pickup Station</label>
                  <select
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="Downtown Main Hub">Downtown Main Hub</option>
                    <option value="Airport Terminal 2">Airport Terminal 2</option>
                    <option value="North Bay Station">North Bay Station</option>
                    <option value="Hotel Direct Delivery">Hotel Direct Delivery</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Return Station</label>
                  <select
                    value={returnLocation}
                    onChange={(e) => setReturnLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="Downtown Main Hub">Downtown Main Hub</option>
                    <option value="Airport Terminal 2">Airport Terminal 2</option>
                    <option value="North Bay Station">North Bay Station</option>
                    <option value="Hotel Direct Delivery">Hotel Direct Delivery</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Insurance Options */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                2. Protection Plan
              </h4>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setInsurancePlan('none')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    insurancePlan === 'none'
                      ? 'bg-cyan-500/20 border-cyan-500 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-xs">Standard</div>
                  <div className="text-[10px] text-slate-400">Included</div>
                  <div className="text-[10px] text-cyan-400 font-mono mt-1">₱0 /day</div>
                </button>

                <button
                  type="button"
                  onClick={() => setInsurancePlan('basic')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    insurancePlan === 'basic'
                      ? 'bg-cyan-500/20 border-cyan-500 text-white'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-xs">Basic CDW</div>
                  <div className="text-[10px] text-slate-400">₱1,000 Excess</div>
                  <div className="text-[10px] text-cyan-400 font-mono mt-1">+₱10 /day</div>
                </button>

                <button
                  type="button"
                  onClick={() => setInsurancePlan('premium')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    insurancePlan === 'premium'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-xs flex items-center gap-1">
                    <span>Zero Excess</span>
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                  </div>
                  <div className="text-[10px] text-slate-400">Full Coverage</div>
                  <div className="text-[10px] text-emerald-400 font-mono mt-1">+₱20 /day</div>
                </button>
              </div>
            </div>

            {/* Addons Selection */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                3. Optional Equipment &amp; Extras
              </h4>

              <div className="grid grid-cols-2 gap-2">
                {availableAddons.map(addon => {
                  const isChecked = selectedAddons.includes(addon.name);
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => toggleAddon(addon.name)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-colors ${
                        isChecked 
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200' 
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <p className="font-medium">{addon.name}</p>
                        <p className="text-[10px] text-slate-400">+₱{addon.price}/day</p>
                      </div>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        isChecked ? 'bg-cyan-500 border-cyan-500 text-black' : 'border-slate-700'
                      }`}>
                        {isChecked && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Customer Details confirmation */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Renting Customer:</span>
                <span className="font-semibold text-white">{user.fullName}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                <span>Driver License:</span>
                <span className="text-slate-300">{user.licenseNumber} (Exp: {user.licenseExpiry})</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Verification State:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  user.verificationStatus === 'verified' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {user.verificationStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Vehicle Preview & Live Bill Breakdown */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            {/* Mini preview card */}
            <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
              <img
                src={vehicle.imageUrl}
                alt={vehicle.model}
                className="w-full h-36 object-cover"
              />
              <div className="p-3.5 space-y-1">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-white text-sm">{vehicle.make} {vehicle.model}</h4>
                  <span className="font-mono text-cyan-400 font-bold">₱{vehicle.dailyRate}/day</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Plate: {vehicle.licensePlate} &bull; {vehicle.transmission} &bull; {vehicle.fuelType}
                </p>
              </div>
            </div>

            {/* Order Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
              <h4 className="font-bold text-white uppercase tracking-wider text-[11px] pb-2 border-b border-slate-800">
                Price Calculation ({diffDays} {diffDays === 1 ? 'Day (24h)' : 'Days'})
              </h4>

              {/* Schedule Recap */}
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Pickup:</span>
                  <span className="font-semibold text-white">{formatPhilippineDateTime(pickupIso)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Return By:</span>
                  <span className="font-semibold text-cyan-300">{formatPhilippineDateTime(expectedReturnIso)}</span>
                </div>
                <div className="flex justify-between text-emerald-400 text-[10px] pt-1 border-t border-slate-800">
                  <span>Grace Period:</span>
                  <span>59 mins (₱0 late fee)</span>
                </div>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Vehicle Rate (₱{dailyRate} &times; {diffDays}d)</span>
                <span className="text-white font-mono">₱{subtotal.toFixed(2)}</span>
              </div>

              {insuranceFee > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Protection Coverage</span>
                  <span className="text-white font-mono">₱{insuranceFee.toFixed(2)}</span>
                </div>
              )}

              {addOnsTotal > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Equipment Add-ons</span>
                  <span className="text-white font-mono">₱{addOnsTotal.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-slate-400">
                <span>Security Deposit (Refundable)</span>
                <span className="text-white font-mono">₱{securityDeposit.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>State &amp; Local Tax (8%)</span>
                <span className="text-white font-mono">₱{tax.toFixed(2)}</span>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
                <span>Total Due Now</span>
                <span className="text-cyan-400 font-mono text-base">₱{totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="block text-[11px] text-slate-400">Payment Authorization</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              >
                <option value="Credit Card (Visa •••• 4242)">Credit Card (Visa •••• 4242)</option>
                <option value="Apple Pay / Digital Wallet">Apple Pay / Digital Wallet</option>
                <option value="Corporate Fleet Card">Corporate Fleet Card</option>
                <option value="Pay on Pickup (Cash / Card)">Pay on Pickup at Hub</option>
              </select>
            </div>

            {/* Confirm button */}
            <button
              onClick={handleConfirmRental}
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-xl shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Confirm Reservation &amp; Rent Car</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
