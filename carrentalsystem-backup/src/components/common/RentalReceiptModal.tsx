import React from 'react';
import { 
  X, 
  Printer, 
  Car, 
  Bike, 
  CheckCircle2, 
  ShieldCheck, 
  Calendar, 
  MapPin, 
  Receipt,
  Download
} from 'lucide-react';
import { Rental } from '../../types';
import { formatPhilippineDateTime, formatDurationMinutes } from '../../utils/time';

interface RentalReceiptModalProps {
  rental: Rental;
  onClose: () => void;
}

export const RentalReceiptModal: React.FC<RentalReceiptModalProps> = ({
  rental,
  onClose
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-100 my-8 animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Official Rental Receipt &amp; Agreement</h3>
              <p className="text-xs text-slate-400 font-mono">Reference: {rental.bookingCode}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Print Receipt"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="mt-6 space-y-6 bg-slate-950 p-6 rounded-2xl border border-slate-800 print:bg-white print:text-black">
          {/* Header branding */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-black text-cyan-400">AutoMotion Fleet Services</h2>
              <p className="text-xs text-slate-400">Licensed Motor &amp; Car Rental Authority</p>
              <p className="text-xs text-slate-400 mt-1">100 Automotive Blvd, Metro City</p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {rental.status.toUpperCase()} &bull; {rental.paymentStatus.toUpperCase()}
              </span>
              <p className="text-xs text-slate-400 font-mono mt-2">
                Date: {new Date(rental.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Customer & Vehicle Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">Customer Details</span>
              <p className="text-sm font-semibold text-white">{rental.customerName}</p>
              <p className="text-slate-300">{rental.customerEmail}</p>
              <p className="text-slate-300">{rental.customerPhone}</p>
              <p className="text-slate-400 font-mono">License: {rental.customerLicense}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">Rented Vehicle</span>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                {rental.vehicleType === 'car' ? <Car className="w-4 h-4 text-cyan-400" /> : <Bike className="w-4 h-4 text-amber-400" />}
                {rental.vehicleName}
              </div>
              <p className="font-mono text-cyan-300">Plate: {rental.vehiclePlate}</p>
              <p className="text-slate-300">Pickup: {rental.pickupLocation}</p>
              <p className="text-slate-300">Return: {rental.returnLocation}</p>
            </div>
          </div>

          {/* Rental Duration & Scheduling Details */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                Rental Schedule &amp; Return Audit
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Asia/Manila (UTC+8)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Pickup Date &amp; Time</span>
                <span className="font-semibold text-white font-mono text-[11px]">
                  {rental.pickupDateTime ? formatPhilippineDateTime(rental.pickupDateTime) : new Date(rental.startDate).toLocaleDateString()}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Expected Return Date &amp; Time</span>
                <span className="font-semibold text-cyan-300 font-mono text-[11px]">
                  {rental.expectedReturnDateTime ? formatPhilippineDateTime(rental.expectedReturnDateTime) : new Date(rental.endDate).toLocaleDateString()}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Actual Return Date &amp; Time</span>
                <span className={`font-semibold font-mono text-[11px] ${
                  rental.actualReturnDateTime ? 'text-amber-300' : 'text-slate-400'
                }`}>
                  {rental.actualReturnDateTime 
                    ? formatPhilippineDateTime(rental.actualReturnDateTime)
                    : (rental.status === 'completed' ? 'Completed' : 'Vehicle On Road (Active)')}
                </span>
              </div>
            </div>

            {/* Grace Period & Late Return Analysis */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
              <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Grace Period</span>
                <span className="font-semibold text-emerald-400">59 Minutes</span>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Total Elapsed Late Time</span>
                <span className={`font-semibold ${rental.lateMinutes && rental.lateMinutes > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                  {formatDurationMinutes(rental.lateMinutes ?? 0)}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Chargeable Late Hours</span>
                <span className="font-semibold text-white">
                  {rental.chargeableLateHours ?? 0} {rental.chargeableLateHours === 1 ? 'hr' : 'hrs'}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Late Return Fee</span>
                <span className={`font-semibold font-mono ${(rental.lateReturnFee ?? 0) > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}`}>
                  ₱{(rental.lateReturnFee ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Pricing Ledger */}
          <div className="space-y-2 text-xs pt-2">
            <div className="flex justify-between text-slate-300">
              <span>Base Rate (₱{rental.dailyRate} &times; {rental.days} {rental.days === 1 ? 'day' : 'days'}):</span>
              <span className="font-mono">₱{rental.subtotal.toFixed(2)}</span>
            </div>

            {rental.insuranceFee > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>Collision Protection Insurance:</span>
                <span className="font-mono">₱{rental.insuranceFee.toFixed(2)}</span>
              </div>
            )}

            {rental.addOnsTotal > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>Add-ons &amp; Extras ({rental.addOnsList.join(', ')}):</span>
                <span className="font-mono">₱{rental.addOnsTotal.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-300">
              <span>Refundable Security Deposit:</span>
              <span className="font-mono">₱{rental.securityDeposit.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-300">
              <span>State &amp; Local Tax:</span>
              <span className="font-mono">₱{rental.tax.toFixed(2)}</span>
            </div>

            {/* Original vs Late Fee Breakdown */}
            <div className="pt-2 border-t border-slate-800 flex justify-between text-slate-300">
              <span>Original Rental Amount:</span>
              <span className="font-mono font-medium text-white">
                ₱{((rental.baseRentalAmount ?? (rental.totalAmount - (rental.lateReturnFee ?? 0)))).toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-slate-300">
              <span className="flex items-center gap-1.5">
                <span>Late Return Penalty Fee:</span>
                {(rental.lateReturnFee ?? 0) === 0 && (
                  <span className="text-[10px] text-emerald-400 font-semibold">(Within Grace Period / On-Time)</span>
                )}
              </span>
              <span className={`font-mono font-bold ${(rental.lateReturnFee ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                ₱{(rental.lateReturnFee ?? 0).toFixed(2)}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-700 flex justify-between text-base font-bold text-white">
              <span>Final Total Rental Amount:</span>
              <span className="text-cyan-400 font-mono">
                ₱{(rental.finalRentalAmount ?? rental.totalAmount).toFixed(2)}
              </span>
            </div>

            <div className="text-[11px] text-slate-400 pt-1 flex justify-between">
              <span>Payment Method:</span>
              <span className="text-slate-200">{rental.paymentMethod}</span>
            </div>
          </div>

          {/* Return Condition & Notes (if any) */}
          {rental.returnNotes && (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
              <span className="font-bold text-amber-400">Return Inspection Log:</span>
              <p className="text-slate-300">{rental.returnNotes}</p>
              {rental.returnMileage && (
                <p className="text-slate-400 font-mono text-[11px]">Final Odometer: {rental.returnMileage} mi &bull; Fuel Level: {rental.returnFuelLevel}%</p>
              )}
            </div>
          )}

          {/* Barcode representation */}
          <div className="pt-2 text-center border-t border-slate-800">
            <div className="font-mono tracking-widest text-slate-500 text-xs">
              ||| | ||||| || |||||| | ||||| ||| |||| |
            </div>
            <p className="text-[10px] text-slate-500 mt-1 font-mono">{rental.id} &bull; NoSQL Stored Document</p>
          </div>
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold transition-colors"
          >
            Close Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
