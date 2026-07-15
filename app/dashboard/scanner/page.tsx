'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { CheckCircle2, XCircle, ScanLine, Clock, User, RefreshCw, QrCode, Camera, CameraOff, Loader2 } from 'lucide-react';
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

interface SlotConfig {
  label: string;
  startTime: string;
  endTime: string;
}

function getCurrentSlotLabel(slots: SlotConfig[]): string | null {
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
  const [slots, setSlots] = useState<SlotConfig[]>([]);
  const [currentSlot, setCurrentSlot] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<{ id: string; name: string; slot: string; time: string; valid: boolean }[]>([]);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const slotsRef = useRef<SlotConfig[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html5QrcodeRef = useRef<any>(null);
  const isScanningRef = useRef(false); // debounce camera double-reads

  // Keep slotsRef in sync so camera callback always has latest slots
  useEffect(() => { slotsRef.current = slots; }, [slots]);

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
    const tick = () => setCurrentSlot(getCurrentSlotLabel(slotsRef.current));
    tick();
    const timer = setInterval(tick, 30000);
    return () => clearInterval(timer);
  }, []);

  // Auto-focus input when camera is off
  useEffect(() => {
    if (!cameraEnabled) inputRef.current?.focus();
  }, [scanResult, cameraEnabled]);

  // ── Core QR validation logic ──────────────────────────────────────────────
  const validateQR = useCallback(async (rawData: string) => {
    const trimmed = rawData.trim();
    if (!trimmed) return;
    if (isScanningRef.current) return; // debounce
    isScanningRef.current = true;

    setScanning(true);
    setScanResult(null);

    try {
      // QR payload format: "participantId|slotLabel"
      const parts = trimmed.split('|');
      const participantId = parts[0];
      const qrSlot = parts.slice(1).join('|') || null; // handles "09:00 – 09:15" style labels

      const res = await fetch(`/api/scanner/getParticipant?id=${encodeURIComponent(participantId)}`);
      
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

      if (!res.ok) {
        if (res.status === 404) {
          setScanResult({ status: 'invalid', message: 'Participant not found. QR code may be invalid.', currentTime: timeStr });
          setScanHistory(prev => [{ id: trimmed, name: 'Unknown', slot: 'N/A', time: timeStr, valid: false }, ...prev.slice(0, 19)]);
          return;
        }
        throw new Error('Failed to fetch participant data');
      }

      const resData = await res.json();
      const data = resData.data;

      if (data.entry_scanned) {
        setScanResult({
          status: 'already_used',
          participantId,
          name: data.name,
          email: data.email,
          regno: data.regno,
          slot: data.assigned_slot ?? qrSlot ?? 'N/A',
          currentTime: timeStr,
          message: `Already checked in at ${data.scanned_at ? new Date(data.scanned_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'earlier'}.`,
        });
        setScanHistory(prev => [{ id: participantId, name: data.name, slot: data.assigned_slot ?? 'N/A', time: timeStr, valid: false }, ...prev.slice(0, 19)]);
        return;
      }

      // Check late arrival — use slotsRef to always get latest
      if (qrSlot) {
        const assignedSlotConfig = slotsRef.current.find(s => s.label === qrSlot);
        if (assignedSlotConfig) {
          const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          if (hhmm > assignedSlotConfig.endTime) {
            setScanResult({
              status: 'wrong_slot',
              participantId,
              name: data.name,
              email: data.email,
              regno: data.regno,
              slot: qrSlot,
              currentTime: timeStr,
              message: `Late arrival! Assigned to ${qrSlot}. Entry denied after ${assignedSlotConfig.endTime}.`,
            });
            setScanHistory(prev => [{ id: participantId, name: data.name, slot: qrSlot, time: timeStr, valid: false }, ...prev.slice(0, 19)]);
            return;
          }
        }
      }

      // ✅ Valid — mark entry
      const updateRes = await fetch(`/api/scanner/markEntry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantId, scannedAt: now.toISOString() })
      });

      if (!updateRes.ok) {
        throw new Error('Failed to update participant entry');
      }

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
      setScanHistory(prev => [{ id: participantId, name: data.name, slot: result.slot!, time: timeStr, valid: true }, ...prev.slice(0, 19)]);

    } catch (e) {
      console.error('Scan error:', e);
      toast.error('Error validating QR code.');
    } finally {
      setScanning(false);
      setQrInput('');
      // Allow next scan after 3 seconds
      setTimeout(() => { isScanningRef.current = false; }, 3000);
    }
  }, []);

  // ── Camera start/stop ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!cameraEnabled) {
      // Stop camera if running
      if (html5QrcodeRef.current) {
        html5QrcodeRef.current.stop()
          .then(() => html5QrcodeRef.current.clear())
          .catch(console.error);
        html5QrcodeRef.current = null;
      }
      return;
    }

    setCameraLoading(true);
    let cancelled = false;

    const startCamera = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) return;

        const qr = new Html5Qrcode('qr-camera-region');
        html5QrcodeRef.current = qr;

        await qr.start(
          { facingMode: 'environment' }, // use rear camera on phones
          { fps: 5, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            validateQR(decodedText);
          },
          () => { /* ignore scan errors */ }
        );
      } catch (err) {
        console.error('Camera start failed:', err);
        toast.error('Could not access camera. Please allow camera permission and try again.');
        if (!cancelled) setCameraEnabled(false);
      } finally {
        if (!cancelled) setCameraLoading(false);
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (html5QrcodeRef.current) {
        html5QrcodeRef.current.stop()
          .then(() => html5QrcodeRef.current?.clear())
          .catch(console.error);
        html5QrcodeRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraEnabled]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') validateQR(qrInput);
  };

  const statusConfig = {
    valid: { icon: CheckCircle2, bg: 'bg-green-500/10 border-green-500/30', text: 'text-green-400', iconColor: 'text-green-400', label: '✅ ENTRY APPROVED' },
    invalid: { icon: XCircle, bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400', iconColor: 'text-red-400', label: '❌ INVALID QR' },
    already_used: { icon: XCircle, bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-400', iconColor: 'text-yellow-400', label: '⚠️ ALREADY SCANNED' },
    wrong_slot: { icon: Clock, bg: 'bg-orange-500/10 border-orange-500/30', text: 'text-orange-400', iconColor: 'text-orange-400', label: '🕐 WRONG SLOT' },
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
        {/* Scanner Panel */}
        <div className="space-y-5">
          <div className="bg-muted/10 border rounded-xl p-6 space-y-4">
            {/* Mode Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                <QrCode className="w-4 h-4" />
                {cameraEnabled ? 'Camera scanning active' : 'Manual / hardware scanner'}
              </div>
              <Button
                variant={cameraEnabled ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCameraEnabled(v => !v)}
                disabled={cameraLoading}
                className="gap-2"
              >
                {cameraLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : cameraEnabled
                    ? <CameraOff className="w-4 h-4" />
                    : <Camera className="w-4 h-4" />
                }
                {cameraLoading ? 'Starting…' : cameraEnabled ? 'Stop Camera' : 'Use Camera'}
              </Button>
            </div>

            {/* Camera Viewport */}
            {cameraEnabled && (
              <div className="rounded-xl overflow-hidden border bg-black relative min-h-[280px] flex items-center justify-center">
                {cameraLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70 text-sm z-10 bg-black">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span>Starting camera…</span>
                  </div>
                )}
                <div id="qr-camera-region" className="w-full" />
              </div>
            )}

            {/* Manual / Hardware Input */}
            {!cameraEnabled && (
              <>
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
              </>
            )}

            {/* Camera scanning status */}
            {cameraEnabled && scanning && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Validating scanned code…
              </div>
            )}
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
                <Button variant="outline" size="sm" onClick={() => { setScanResult(null); if (!cameraEnabled) inputRef.current?.focus(); }}>
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
