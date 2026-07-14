'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { db } from '@/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { CheckCircle2, XCircle, ScanLine, Clock, User, RefreshCw, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface UserPayload extends JwtPayload { name: string; email: string; }

interface ScanResult {
  status: 'valid' | 'invalid' | 'already_used' | 'wrong_slot';
  participantId?: string;
  name?: string;
  email?: string;
  regno?: string;
  slot?: string;
  currentTime?: string;
  message: string;
}

function getCurrentSlotLabel(slots: { label: string; startTime: string; endTime: string }[]): string | null {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  for (const slot of slots) {
    if (hhmm >= slot.startTime && hhmm < slot.endTime) return slot.label;
  }
  return null;
}

export default function ScannerPage() {
  const router = useRouter();
  const [qrInput, setQrInput] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [slots, setSlots] = useState<{ label: string; startTime: string; endTime: string }[]>([]);
  const [currentSlot, setCurrentSlot] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<{ id: string; name: string; slot: string; time: string; valid: boolean }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auth guard
  useEffect(() => {
    const token = sessionStorage.getItem('Token');
    if (!token) { router.push('/'); return; }
    try { jwtDecode<UserPayload>(token); } catch { router.push('/'); }
  }, [router]);

  // Load slot config
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const res = await fetch('/api/slots');
        if (res.ok) {
          const data = await res.json();
          setSlots(data.slots ?? []);
        }
      } catch (e) {
        console.error('Failed to load slots:', e);
      }
    };
    fetchSlots();
  }, []);

  // Tick clock for current slot
  useEffect(() => {
    const tick = () => setCurrentSlot(getCurrentSlotLabel(slots));
    tick();
    const timer = setInterval(tick, 30000);
    return () => clearInterval(timer);
  }, [slots]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, [scanResult]);

  const validateQR = async (rawData: string) => {
    const trimmed = rawData.trim();
    if (!trimmed) return;

    setScanning(true);
    setScanResult(null);

    try {
      // QR encodes: "participantId|slotLabel"
      const parts = trimmed.split('|');
      const participantId = parts[0];
      const qrSlot = parts.slice(1).join('|') || null; // handles labels with "–"

      const participantRef = doc(db, 'participants', participantId);
      const snap = await getDoc(participantRef);

      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

      if (!snap.exists()) {
        const result: ScanResult = {
          status: 'invalid',
          message: 'Participant not found. QR code may be invalid.',
          currentTime: timeStr,
        };
        setScanResult(result);
        setScanning(false);
        return;
      }

      const data = snap.data();

      if (data.entry_scanned) {
        const result: ScanResult = {
          status: 'already_used',
          participantId,
          name: data.name,
          email: data.email,
          regno: data.regno,
          slot: data.assigned_slot ?? qrSlot ?? 'N/A',
          currentTime: timeStr,
          message: `Already checked in at ${data.scanned_at ?? 'earlier'}.`,
        };
        setScanResult(result);
        setScanning(false);
        return;
      }

      // Check slot if available (allow early arrival, reject late arrival)
      if (qrSlot) {
        const assignedSlotConfig = slots.find(s => s.label === qrSlot);
        if (assignedSlotConfig) {
          const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          
          if (hhmm > assignedSlotConfig.endTime) {
            const result: ScanResult = {
              status: 'wrong_slot',
              participantId,
              name: data.name,
              email: data.email,
              regno: data.regno,
              slot: qrSlot,
              currentTime: timeStr,
              message: `Late arrival! Participant assigned to ${qrSlot}. Entry denied after ${assignedSlotConfig.endTime}.`,
            };
            setScanResult(result);
            setScanning(false);
            return;
          }
        }
      }

      // ✅ Valid — check them in
      await updateDoc(participantRef, {
        entry_scanned: true,
        scanned_at: now.toISOString(),
      });

      const result: ScanResult = {
        status: 'valid',
        participantId,
        name: data.name,
        email: data.email,
        regno: data.regno,
        slot: qrSlot ?? data.assigned_slot ?? 'N/A',
        currentTime: timeStr,
        message: 'Entry approved! Welcome to TEDxSIST.',
      };
      setScanResult(result);

      setScanHistory(prev => [
        { id: participantId, name: data.name, slot: result.slot!, time: timeStr, valid: true },
        ...prev.slice(0, 19),
      ]);
    } catch (e) {
      console.error('Scan error:', e);
      toast.error('Error validating QR code.');
    } finally {
      setScanning(false);
      setQrInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      validateQR(qrInput);
    }
  };

  const statusConfig = {
    valid: {
      icon: CheckCircle2,
      bg: 'bg-green-500/10 border-green-500/30',
      text: 'text-green-400',
      iconColor: 'text-green-400',
      label: '✅ ENTRY APPROVED',
    },
    invalid: {
      icon: XCircle,
      bg: 'bg-red-500/10 border-red-500/30',
      text: 'text-red-400',
      iconColor: 'text-red-400',
      label: '❌ INVALID QR',
    },
    already_used: {
      icon: XCircle,
      bg: 'bg-yellow-500/10 border-yellow-500/30',
      text: 'text-yellow-400',
      iconColor: 'text-yellow-400',
      label: '⚠️ ALREADY SCANNED',
    },
    wrong_slot: {
      icon: Clock,
      bg: 'bg-orange-500/10 border-orange-500/30',
      text: 'text-orange-400',
      iconColor: 'text-orange-400',
      label: '🕐 WRONG SLOT',
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">QR Entry Scanner</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Scan participant QR codes to validate entry and slot assignment.
          </p>
        </div>
        {currentSlot && (
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-4 py-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Current slot: <span className="text-primary">{currentSlot}</span></span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scanner Input */}
        <div className="space-y-5">
          <div className="bg-muted/10 border rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
              <QrCode className="w-4 h-4" />
              Scan or paste QR code data
            </div>

            <div className="relative">
              <Input
                ref={inputRef}
                value={qrInput}
                onChange={e => setQrInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Scan QR code or type participant ID…"
                className="h-12 pr-24 font-mono text-sm"
                disabled={scanning}
                autoFocus
              />
              <Button
                className="absolute right-1 top-1 h-10"
                onClick={() => validateQR(qrInput)}
                disabled={scanning || !qrInput.trim()}
              >
                {scanning ? <RefreshCw className="animate-spin w-4 h-4" /> : <ScanLine className="w-4 h-4" />}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Press <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono">Enter</kbd> after scanning with a hardware QR reader, or click Scan.
            </p>
          </div>

          {/* Result Panel */}
          {scanResult && (() => {
            const cfg = statusConfig[scanResult.status];
            const Icon = cfg.icon;
            return (
              <div className={`border rounded-xl p-6 ${cfg.bg} space-y-4`}>
                <div className="flex items-center gap-3">
                  <Icon className={`w-8 h-8 ${cfg.iconColor}`} />
                  <span className={`text-lg font-bold ${cfg.text}`}>{cfg.label}</span>
                </div>
                {scanResult.name && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold text-foreground">{scanResult.name}</span>
                      <span className="text-muted-foreground text-xs">({scanResult.participantId})</span>
                    </div>
                    {(scanResult.regno || scanResult.email) && (
                      <div className="flex flex-col gap-1 pl-6 text-xs text-muted-foreground">
                        {scanResult.regno && <span>Reg No: {scanResult.regno}</span>}
                        {scanResult.email && <span>Email: {scanResult.email}</span>}
                      </div>
                    )}
                  </div>
                )}
                {scanResult.slot && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>Assigned slot: <strong className="text-foreground">{scanResult.slot}</strong></span>
                  </div>
                )}
                <p className={`text-sm ${cfg.text}`}>{scanResult.message}</p>
                <Button variant="outline" size="sm" onClick={() => { setScanResult(null); inputRef.current?.focus(); }}>
                  Scan Next
                </Button>
              </div>
            );
          })()}
        </div>

        {/* Scan History */}
        <div className="bg-muted/10 border rounded-xl p-5">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4 flex items-center gap-2">
            <ScanLine className="w-4 h-4" /> Recent Scans
            <span className="ml-auto text-xs font-normal normal-case">
              {scanHistory.length} scanned this session
            </span>
          </h3>

          {scanHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm gap-2">
              <QrCode className="w-10 h-10 opacity-30" />
              <p>No scans yet. Start scanning!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {scanHistory.map((h, i) => (
                <div key={i} className="flex items-center gap-3 bg-background rounded-lg px-3 py-2 border">
                  {h.valid
                    ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    : <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{h.name}</p>
                    <p className="text-xs text-muted-foreground">{h.slot}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{h.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
