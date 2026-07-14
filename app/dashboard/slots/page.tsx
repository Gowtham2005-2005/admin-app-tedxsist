'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Clock, Calendar, MapPin, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DEFAULT_SLOT_CONFIG, SlotConfig, TimeSlot } from '@/lib/slots';

interface UserPayload extends JwtPayload {
  name: string;
  email: string;
}

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function SlotConfigPage() {
  const router = useRouter();
  const [config, setConfig] = useState<SlotConfig>(DEFAULT_SLOT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Auth guard
  useEffect(() => {
    const token = sessionStorage.getItem('Token');
    if (!token) { router.push('/'); return; }
    try { jwtDecode<UserPayload>(token); }
    catch { router.push('/'); }
  }, [router]);

  // Fetch saved config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/slots');
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
        }
      } catch (e) {
        console.error('Failed to load slot config:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        toast.success('Slot configuration saved!');
      } else {
        toast.error('Failed to save slot configuration.');
      }
    } catch {
      toast.error('Network error while saving.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig(DEFAULT_SLOT_CONFIG);
    toast.info('Reset to default configuration.');
  };

  const updateSlot = (index: number, field: keyof TimeSlot, value: string | number) => {
    setConfig(prev => {
      const slots = [...prev.slots];
      const updated = { ...slots[index], [field]: value };
      // Auto-update label when times change
      if (field === 'startTime' || field === 'endTime') {
        updated.label = `${updated.startTime} – ${updated.endTime}`;
      }
      slots[index] = updated;
      return { ...prev, slots };
    });
  };

  const addSlot = () => {
    const lastSlot = config.slots[config.slots.length - 1];
    setConfig(prev => ({
      ...prev,
      slots: [
        ...prev.slots,
        {
          id: generateId(),
          label: `${lastSlot?.endTime ?? '10:00'} – New`,
          startTime: lastSlot?.endTime ?? '10:00',
          endTime: '',
          capacity: 25,
        }
      ]
    }));
  };

  const removeSlot = (index: number) => {
    if (config.slots.length <= 1) {
      toast.error('You must have at least one slot.');
      return;
    }
    setConfig(prev => ({ ...prev, slots: prev.slots.filter((_, i) => i !== index) }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="animate-spin w-5 h-5" />
          <span>Loading slot configuration…</span>
        </div>
      </div>
    );
  }

  const totalCapacity = config.slots.reduce((sum, s) => sum + (Number(s.capacity) || 0), 0);

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Slot Configuration</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Define arrival time slots for selected participants. Slots are assigned round-robin when sending confirmation emails.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RefreshCw className="w-4 h-4 mr-2" /> Reset
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving…' : 'Save Configuration'}
          </Button>
        </div>
      </div>

      {/* Event Details */}
      <div className="bg-muted/20 rounded-xl border p-5 space-y-4">
        <h3 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
          <Calendar className="w-4 h-4" /> Event Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="eventName">Event Name</Label>
            <Input
              id="eventName"
              value={config.eventName}
              onChange={e => setConfig(p => ({ ...p, eventName: e.target.value }))}
              placeholder="TEDxSIST 2026"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eventDate" className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Event Date
            </Label>
            <Input
              id="eventDate"
              value={config.eventDate}
              onChange={e => setConfig(p => ({ ...p, eventDate: e.target.value }))}
              placeholder="July 17, 2026"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eventVenue" className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Venue
            </Label>
            <Input
              id="eventVenue"
              value={config.eventVenue}
              onChange={e => setConfig(p => ({ ...p, eventVenue: e.target.value }))}
              placeholder="Mj auditorium"
            />
          </div>
        </div>
      </div>

      {/* Slots */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2 text-sm uppercase tracking-wide text-muted-foreground">
            <Clock className="w-4 h-4" /> Arrival Slots
            <span className="text-xs normal-case font-normal bg-muted px-2 py-0.5 rounded-full">
              {config.slots.length} slots · {totalCapacity} total capacity
            </span>
          </h3>
          <Button variant="outline" size="sm" onClick={addSlot}>
            <Plus className="w-4 h-4 mr-1" /> Add Slot
          </Button>
        </div>

        <div className="space-y-3">
          {config.slots.map((slot, index) => (
            <div
              key={slot.id}
              className="bg-muted/10 border rounded-xl p-4 flex flex-wrap gap-4 items-end"
            >
              {/* Slot number badge */}
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                {index + 1}
              </div>

              <div className="flex flex-wrap gap-3 flex-1">
                <div className="space-y-1.5 min-w-[110px]">
                  <Label className="text-xs text-muted-foreground">Start Time</Label>
                  <Input
                    type="time"
                    value={slot.startTime}
                    onChange={e => updateSlot(index, 'startTime', e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5 min-w-[110px]">
                  <Label className="text-xs text-muted-foreground">End Time</Label>
                  <Input
                    type="time"
                    value={slot.endTime}
                    onChange={e => updateSlot(index, 'endTime', e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5 min-w-[90px]">
                  <Label className="text-xs text-muted-foreground">Capacity</Label>
                  <Input
                    type="number"
                    min={1}
                    value={slot.capacity}
                    onChange={e => updateSlot(index, 'capacity', parseInt(e.target.value) || 1)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5 flex-1 min-w-[140px]">
                  <Label className="text-xs text-muted-foreground">Label (auto-generated)</Label>
                  <Input
                    value={slot.label}
                    onChange={e => updateSlot(index, 'label', e.target.value)}
                    placeholder="09:00 – 09:15"
                    className="h-9"
                  />
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10 shrink-0"
                onClick={() => removeSlot(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div className="bg-muted/10 border rounded-xl p-5">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
          📬 Assignment Preview
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Participants will be assigned slots in this round-robin order:
        </p>
        <div className="flex flex-wrap gap-2">
          {config.slots.map((slot, i) => (
            <span
              key={slot.id}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border bg-background font-medium"
            >
              <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                {i + 1}
              </span>
              {slot.label}
              <span className="text-muted-foreground">· {slot.capacity} pax</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
