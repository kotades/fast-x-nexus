'use client';

/**
 * /src/components/admin/DisbursePayoutModal.tsx
 * Fast X Nexus — Paystack Direct Courier Escrow Payout Modal
 *
 * Industrial financial disbursement modal:
 * - 100% Crisp Light-Mode Interface
 * - Live Paystack NUBAN bank resolution & account verification
 * - Direct Paystack Transfer API execution from 70% escrow holdings
 * - Audit receipt generation with transfer reference & bank details
 */

import React, { useState, useEffect, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  disburseCourierPayoutAction,
  resolveCourierAccountAction,
  getNigerianBanksAction,
  type CourierPayoutSummary,
} from '@/app/actions/admin';
import type { PaystackBank } from '@/lib/paystack';

interface DisbursePayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  courier: CourierPayoutSummary | null;
  onSuccess?: () => void;
}

export function DisbursePayoutModal({
  isOpen,
  onClose,
  courier,
  onSuccess,
}: DisbursePayoutModalProps) {
  const [banks, setBanks] = useState<PaystackBank[]>([]);
  const [selectedBankCode, setSelectedBankCode] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [resolvingAccount, setResolvingAccount] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [isPending, startTransition] = useTransition();

  const [receipt, setReceipt] = useState<{
    reference: string;
    transferCode: string;
    amountNaira: number;
    recipientName: string;
    bankName: string;
    status: string;
  } | null>(null);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  // Initialize data when modal opens
  useEffect(() => {
    if (isOpen && courier) {
      setPayoutAmount(courier.pendingNgn || courier.totalRiderEarnedNgn || 5000);
      setReceipt(null);
      setPayoutError(null);

      // Pre-fill existing bank details if available
      if (courier.bankDetails) {
        setSelectedBankCode(courier.bankDetails.bank_code || '058');
        setAccountNumber(courier.bankDetails.account_number || '');
        setAccountName(courier.bankDetails.account_name || '');
      } else {
        setSelectedBankCode('058'); // Default GTBank
        setAccountNumber('');
        setAccountName('');
      }

      // Load banks list
      getNigerianBanksAction().then((res) => {
        if (res && res.length > 0) {
          setBanks(res);
        }
      });
    }
  }, [isOpen, courier]);

  // Resolve account when 10 digits are entered
  const handleResolveAccount = async (accNum: string, bCode: string) => {
    if (accNum.length !== 10 || !bCode) return;

    setResolvingAccount(true);
    setAccountError(null);
    try {
      const res = await resolveCourierAccountAction(accNum, bCode);
      if (res.success && res.accountName) {
        setAccountName(res.accountName);
      } else {
        setAccountError(res.error || 'Could not resolve account name');
      }
    } catch (e: any) {
      setAccountError(e.message || 'Error resolving account');
    } finally {
      setResolvingAccount(false);
    }
  };

  const handleAccountNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setAccountNumber(val);
    if (val.length === 10) {
      handleResolveAccount(val, selectedBankCode);
    } else {
      setAccountName('');
      setAccountError(null);
    }
  };

  const handleBankChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedBankCode(val);
    if (accountNumber.length === 10) {
      handleResolveAccount(accountNumber, val);
    }
  };

  const handleExecutePayout = () => {
    if (!courier || payoutAmount <= 0 || accountNumber.length !== 10) return;

    const selectedBank = banks.find((b) => b.code === selectedBankCode);
    const bankName = selectedBank?.name || 'Commercial Bank';

    startTransition(async () => {
      setPayoutError(null);
      const res = await disburseCourierPayoutAction({
        riderId: courier.riderId,
        amountNaira: payoutAmount,
        orderIds: courier.eligibleOrderIds,
        bankDetails: {
          bank_name: bankName,
          bank_code: selectedBankCode,
          account_number: accountNumber,
          account_name: accountName || courier.name,
        },
      });

      if (res.success && res.reference) {
        setReceipt({
          reference: res.reference,
          transferCode: res.transferCode || 'TRF_SUCCESS',
          amountNaira: res.amountNaira || payoutAmount,
          recipientName: res.recipientName || accountName || courier.name,
          bankName: res.bankName || bankName,
          status: res.status || 'success',
        });
        if (onSuccess) onSuccess();
      } else {
        setPayoutError(res.error || 'Transfer failed. Check Paystack balance or recipient details.');
      }
    });
  };

  if (!isOpen || !courier) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isPending && onClose()}
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-white border border-slate-200 shadow-2xl rounded-lg flex flex-col overflow-hidden text-slate-900 z-10"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                <span className="material-symbols-outlined text-lg">payments</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold tracking-tight text-slate-900 uppercase">
                    Paystack Direct Escrow Payout
                  </h2>
                  <span className="px-1.5 py-0.5 text-[9.5px] font-mono font-bold uppercase bg-blue-100 text-blue-800 border border-blue-300 rounded">
                    70% Escrow
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-normal">
                  Disburse settled escrow funds directly to courier bank account via Paystack Transfer API.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isPending}
              className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
            {/* Courier Info Card */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-900">{courier.name}</span>
                  <span className="text-[10px] font-mono uppercase bg-slate-200 text-slate-700 px-1 py-0.2 rounded">
                    {courier.vehicleType}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {courier.phone || 'No direct phone'} • {courier.totalDeliveredOrders} Delivered Waybills
                </p>
              </div>

              <div className="text-right font-mono">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
                  Pending Escrow
                </span>
                <span className="text-sm font-black text-emerald-700">
                  ₦{courier.pendingNgn.toLocaleString('en-NG')}
                </span>
              </div>
            </div>

            {/* If Receipt exists: show official receipt */}
            {receipt ? (
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3 font-mono">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <span className="material-symbols-outlined text-lg text-emerald-600">
                    check_circle
                  </span>
                  <span>Disbursement Successful</span>
                </div>

                <div className="border-t border-emerald-200 pt-3 space-y-2 text-xs text-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Paystack Reference:</span>
                    <span className="font-bold text-slate-900">{receipt.reference}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount Disbursed:</span>
                    <span className="font-bold text-emerald-700">
                      ₦{receipt.amountNaira.toLocaleString('en-NG')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Recipient:</span>
                    <span className="font-bold">{receipt.recipientName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Destination Bank:</span>
                    <span>{receipt.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="px-1.5 py-0.2 uppercase font-black text-[10px] bg-emerald-200 text-emerald-900 rounded">
                      {receipt.status}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full mt-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded cursor-pointer transition-colors"
                >
                  Done & Return to Ledger
                </button>
              </div>
            ) : (
              /* Payout Form */
              <div className="space-y-4">
                {/* Bank Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider font-mono">
                    Destination Bank
                  </label>
                  <select
                    value={selectedBankCode}
                    onChange={handleBankChange}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:border-primary font-mono cursor-pointer"
                  >
                    {banks.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Account Number & Auto-Resolve */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider font-mono">
                    NUBAN Account Number (10 Digits)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={10}
                      value={accountNumber}
                      onChange={handleAccountNumberChange}
                      placeholder="e.g. 0123456789"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-900 font-mono tracking-widest focus:outline-none focus:border-primary"
                    />
                    {resolvingAccount && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-sm animate-spin text-slate-400">
                        progress_activity
                      </span>
                    )}
                  </div>

                  {/* Account Name Banner */}
                  {accountName && (
                    <div className="mt-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded flex items-center gap-1.5 text-xs font-mono text-emerald-900">
                      <span className="material-symbols-outlined text-sm text-emerald-600">
                        verified
                      </span>
                      <span className="font-bold">{accountName}</span>
                      <span className="text-[10px] text-emerald-600 ml-auto font-normal">
                        Verified by Paystack
                      </span>
                    </div>
                  )}

                  {accountError && (
                    <p className="mt-1 text-[11px] text-red-600 font-mono">{accountError}</p>
                  )}
                </div>

                {/* Amount to Disburse */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider font-mono">
                    Disbursement Amount (NGN)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-500 font-mono">
                      ₦
                    </span>
                    <input
                      type="number"
                      value={payoutAmount || ''}
                      onChange={(e) => setPayoutAmount(Math.max(0, Number(e.target.value)))}
                      className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded text-xs text-slate-900 font-mono font-bold focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-1">
                    <span>Outstanding: ₦{courier.pendingNgn.toLocaleString('en-NG')}</span>
                    <button
                      type="button"
                      onClick={() => setPayoutAmount(courier.pendingNgn)}
                      className="text-primary hover:underline font-bold cursor-pointer"
                    >
                      Set 100% Escrow
                    </button>
                  </div>
                </div>

                {payoutError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded font-mono">
                    {payoutError}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {!receipt && (
            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 hover:border-slate-400 rounded cursor-pointer transition-colors disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecutePayout}
                disabled={
                  isPending ||
                  payoutAmount <= 0 ||
                  accountNumber.length !== 10 ||
                  resolvingAccount
                }
                className="px-5 py-2.5 text-xs font-mono font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white rounded shadow-sm flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">
                      progress_activity
                    </span>
                    <span>TRANSFERRING...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">send</span>
                    <span>DISBURSE ₦{payoutAmount.toLocaleString('en-NG')} VIA PAYSTACK</span>
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
