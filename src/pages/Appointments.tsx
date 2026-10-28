import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type {
  Appointment,
  AppointmentStatus,
  PaymentStatus,
  Client,
  Service,
  BlockedSlot,
} from '../types/database';
import {
  CalendarCheck,
  Plus,
  Search,
  Clock,
  MapPin,
  Phone,
  Pencil,
  Trash2,
  XCircle,
  CheckCircle2,
  Eye,
  X,
  AlertTriangle,
  DollarSign,
  MessageCircle,
  Sparkles,
} from 'lucide-react';

export const Appointments: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'christmas' | 'regular'>('all');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<Appointment | null>(null);
  const [viewingApp, setViewingApp] = useState<Appointment | null>(null);
  const [saving, setSaving] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const [clientId, setClientId] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [serviceId, setServiceId] = useState<string>('');
  const [serviceName, setServiceName] = useState('');
  const [isChristmasSession, setIsChristmasSession] = useState<boolean>(false);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [duration, setDuration] = useState('60');
  const [endTime, setEndTime] = useState('10:00');
  const [price, setPrice] = useState('');
  const [paidAmount, setPaidAmount] = useState('0');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<AppointmentStatus>('scheduled');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [appsRes, clientsRes, servicesRes, blocksRes] = await Promise.all([
      supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: false })
        .order('start_time', { ascending: true }),
      supabase.from('clients').select('*').order('name', { ascending: true }),
      supabase.from('services').select('*').order('name', { ascending: true }),
      supabase.from('blocked_slots').select('*'),
    ]);

    if (appsRes.data) setAppointments(appsRes.data);
    if (clientsRes.data) setClients(clientsRes.data);
    if (servicesRes.data) setServices(servicesRes.data);
    if (blocksRes.data) setBlockedSlots(blocksRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const isChristmasAppointment = (app: Appointment): boolean => {
    return Boolean(
      app.service_name.toLowerCase().includes('natal') ||
        app.service_name.includes('🎄') ||
        (app.notes && app.notes.includes('[NATAL]'))
    );
  };

  const getWhatsAppUrl = (app: Appointment): string => {
    const digits = app.client_phone.replace(/\D/g, '');
    const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
    const [y, m, d] = app.appointment_date.split('-');
    const formattedDate = `${d}/${m}/${y}`;
    const cleanService = app.service_name.replace('🎄 ', '');
    const message = encodeURIComponent(
      `Olá ${app.client_name}! Tudo bem? Passando para confirmar seu agendamento de *${cleanService}* no dia *${formattedDate}* às *${app.start_time.slice(0, 5)}*.`
    );
    return `https://wa.me/${withCountry}?text=${message}`;
  };

  useEffect(() => {
    if (!startTime || !duration) return;
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + Number(duration);
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    setEndTime(`${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`);
  }, [startTime, duration]);

  const handlePaymentStatusChange = (newStatus: PaymentStatus) => {
    setPaymentStatus(newStatus);
    if (newStatus === 'paid') {
      setPaidAmount(price || '0');
    } else if (newStatus === 'pending') {
      setPaidAmount('0');
    }
  };

  const handleSelectClient = (id: string) => {
    setClientId(id);
    const found = clients.find((c) => c.id === id);
    if (found) {
      setClientName(found.name);
      setClientPhone(found.phone);
    }
  };

  const handleSelectService = (id: string) => {
    setServiceId(id);
    const found = services.find((s) => s.id === id);
    if (found) {
      setServiceName(found.name);
      setPrice(String(found.default_price));
      setDuration(String(found.default_duration));
      if (found.name.toLowerCase().includes('natal')) {
        setIsChristmasSession(true);
      }
      if (paymentStatus === 'paid') {
        setPaidAmount(String(found.default_price));
      }
    }
  };

  const timeToMinutes = (t: string) => {
    const [h, m] = t.slice(0, 5).split(':').map(Number);
    return h * 60 + m;
  };

  const checkScheduleConflict = (): string | null => {
    if (status === 'cancelled') return null;

    const newStart = timeToMinutes(startTime);
    const newEnd = timeToMinutes(endTime);

    const dayBlocks = blockedSlots.filter((b) => b.block_date === appointmentDate);
    for (const block of dayBlocks) {
      if (block.is_full_day) {
        return `Esta data está bloqueada na agenda (${block.title}).`;
      }
      const bStart = timeToMinutes(block.start_time);
      const bEnd = timeToMinutes(block.end_time);
      if (newStart < bEnd && newEnd > bStart) {
        return `Horário indisponível devido a um bloqueio: "${block.title}" (${block.start_time.slice(0, 5)} às ${block.end_time.slice(0, 5)}).`;
      }
    }

    const dayApps = appointments.filter(
      (a) =>
        a.appointment_date === appointmentDate &&
        a.status !== 'cancelled' &&
        a.id !== editingApp?.id
    );

    for (const app of dayApps) {
      const aStart = timeToMinutes(app.start_time);
      const aEnd = timeToMinutes(app.end_time);
      if (newStart < aEnd && newEnd > aStart) {
        return `Conflito de horário com o agendamento de "${app.client_name}" (${app.start_time.slice(0, 5)} às ${app.end_time.slice(0, 5)}).`;
      }
    }

    return null;
  };

  const openNewModal = () => {
    setEditingApp(null);
    setConflictError(null);
    setClientId('');
    setClientName('');
    setClientPhone('');
    setServiceId('');
    setServiceName('');
    setIsChristmasSession(false);
    setAppointmentDate(new Date().toISOString().split('T')[0]);
    setStartTime('09:00');
    setDuration('60');
    setEndTime('10:00');
    setPrice('');
    setPaidAmount('0');
    setLocation('');
    setNotes('');
    setStatus('scheduled');
    setPaymentStatus('pending');
    setIsFormOpen(true);
  };

  const openEditModal = (app: Appointment) => {
    setEditingApp(app);
    setConflictError(null);
    setClientId(app.client_id || '');
    setClientName(app.client_name);
    setClientPhone(app.client_phone);
    setServiceId(app.service_id || '');
    const christmas = isChristmasAppointment(app);
    setIsChristmasSession(christmas);
    setServiceName(app.service_name.replace(/^🎄\s*/, ''));
    setAppointmentDate(app.appointment_date);
    setStartTime(app.start_time.slice(0, 5));
    setDuration(String(app.duration));
    setEndTime(app.end_time.slice(0, 5));
    setPrice(String(app.price));
    setPaidAmount(String(app.paid_amount));
    setLocation(app.location || '');
    setNotes((app.notes || '').replace('[NATAL] ', '').replace('[NATAL]', ''));
    setStatus(app.status);
    setPaymentStatus(app.payment_status);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setConflictError(null);

    const conflict = checkScheduleConflict();
    if (conflict) {
      setConflictError(conflict);
      return;
    }

    setSaving(true);

    const numericPrice = Number(price) || 0;
    const numericPaid =
      paymentStatus === 'paid'
        ? numericPrice
        : paymentStatus === 'pending'
        ? 0
        : Number(paidAmount) || 0;

    let finalClientId = clientId || null;
    if (!finalClientId && clientName.trim()) {
      const existingClient = clients.find(
        (c) => c.name.toLowerCase() === clientName.trim().toLowerCase()
      );
      if (existingClient) {
        finalClientId = existingClient.id;
      } else {
        const { data: newClient } = await supabase
          .from('clients')
          .insert([
            {
              user_id: user.id,
              name: clientName.trim(),
              phone: clientPhone.trim(),
              email: '',
              notes: 'Cadastrado automaticamente via Agendamento',
            },
          ])
          .select()
          .single();

        if (newClient) finalClientId = newClient.id;
      }
    }

    const cleanServiceName = serviceName.trim().replace(/^🎄\s*/, '');
    const finalServiceName = isChristmasSession ? `🎄 ${cleanServiceName}` : cleanServiceName;

    const cleanNotes = notes.trim().replace(/^\[NATAL\]\s*/, '');
    const finalNotes = isChristmasSession ? `[NATAL] ${cleanNotes}`.trim() : cleanNotes;

    const payload = {
      user_id: user.id,
      client_id: finalClientId,
      client_name: clientName.trim(),
      client_phone: clientPhone.trim(),
      service_id: serviceId || null,
      service_name: finalServiceName,
      appointment_date: appointmentDate,
      start_time: startTime,
      end_time: endTime,
      duration: Number(duration) || 60,
      price: numericPrice,
      paid_amount: numericPaid,
      location: location.trim(),
      notes: finalNotes,
      status,
      payment_status: paymentStatus,
    };

    if (editingApp) {
      await supabase.from('appointments').update(payload).eq('id', editingApp.id);
    } else {
      await supabase.from('appointments').insert([payload]);
    }

    setSaving(false);
    setIsFormOpen(false);
    fetchData();
  };

  const handleQuickStatusChange = async (app: Appointment, newStatus: AppointmentStatus) => {
    await supabase.from('appointments').update({ status: newStatus }).eq('id', app.id);
    fetchData();
  };

  const handleDelete = async (app: Appointment) => {
    if (!window.confirm(`Deseja excluir o agendamento de "${app.client_name}"?`)) {
      return;
    }
    await supabase.from('appointments').delete().eq('id', app.id);
    fetchData();
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const filteredAppointments = appointments.filter((app) => {
    const matchesSearch =
      app.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const isXmas = isChristmasAppointment(app);
    const matchesCategory =
      categoryFilter === 'all' ||
      (categoryFilter === 'christmas' && isXmas) ||
      (categoryFilter === 'regular' && !isXmas);

    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <CalendarCheck className="w-7 h-7 text-brand-blue" />
            Agendamentos
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Controle completo de sessões normais (Azul) e Ensaios de Natal (Vermelho)
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="px-4 py-2.5 bg-brand-blue hover:bg-brand-blueHover text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-brand-blue/25 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Agendamento</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, serviço ou local..."
            className="w-full pl-10 pr-4 py-2.5 bg-dark-900 border border-dark-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-blue"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-dark-900 p-1 rounded-xl border border-dark-700">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                categoryFilter === 'all' ? 'bg-dark-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos Tipos
            </button>
            <button
              onClick={() => setCategoryFilter('christmas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                categoryFilter === 'christmas'
                  ? 'bg-brand-red text-white shadow-md shadow-brand-red/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🎄 Natal
            </button>
            <button
              onClick={() => setCategoryFilter('regular')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                categoryFilter === 'regular'
                  ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Padrão
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'scheduled', label: 'Agendados' },
              { id: 'completed', label: 'Concluídos' },
              { id: 'cancelled', label: 'Cancelados' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
                    : 'bg-dark-900 text-slate-400 border border-dark-700 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-28 bg-dark-900/60 border border-dark-700 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-12 text-center">
          <CalendarCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white">Nenhum agendamento encontrado</h3>
          <p className="text-slate-400 text-sm mt-1">
            Crie um novo agendamento para organizar sua rotina e controlar seus recebimentos.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((app) => {
            const isXmas = isChristmasAppointment(app);

            return (
              <div
                key={app.id}
                className={`bg-dark-900 border-l-4 border rounded-2xl p-5 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-md ${
                  app.status === 'cancelled'
                    ? 'border-l-slate-600 border-dark-700 opacity-65'
                    : isXmas
                    ? 'border-l-brand-red border-brand-red/40 bg-gradient-to-r from-brand-red/10 via-dark-900 to-dark-900'
                    : 'border-l-brand-blue border-dark-700 hover:border-brand-blue/60'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold text-white ${
                        isXmas ? 'bg-brand-red' : 'bg-brand-blue'
                      }`}
                    >
                      {isXmas ? '🎄 ENSAIO DE NATAL' : '📷 PADRÃO'}
                    </span>

                    <span className="text-base font-bold text-white">{app.client_name}</span>
                    <span className="text-xs text-slate-400">
                      • {app.service_name.replace(/^🎄\s*/, '')}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        app.status === 'completed'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : app.status === 'cancelled'
                          ? 'bg-brand-red/15 text-red-400'
                          : 'bg-brand-blue/15 text-blue-400'
                      }`}
                    >
                      {app.status === 'completed'
                        ? 'Concluído'
                        : app.status === 'cancelled'
                        ? 'Cancelado'
                        : 'Agendado'}
                    </span>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        app.payment_status === 'paid'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : app.payment_status === 'partial'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-slate-700/60 text-slate-300'
                      }`}
                    >
                      {app.payment_status === 'paid'
                        ? 'Pago Total'
                        : app.payment_status === 'partial'
                        ? `Parcial (${formatCurrency(Number(app.paid_amount))})`
                        : 'Pagamento Pendente'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300">
                    <span className="flex items-center gap-1.5 font-medium text-white">
                      <Clock className={`w-3.5 h-3.5 ${isXmas ? 'text-brand-red' : 'text-brand-blue'}`} />
                      {formatDate(app.appointment_date)} • {app.start_time.slice(0, 5)} às{' '}
                      {app.end_time.slice(0, 5)} ({app.duration} min)
                    </span>

                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {app.client_phone}
                    </span>

                    {app.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-brand-red" />
                        {app.location}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-dark-700">
                  <div className="text-left lg:text-right mr-1">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                      Valor do Serviço
                    </span>
                    <span className="text-base font-bold text-emerald-400">
                      {formatCurrency(Number(app.price))}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <a
                      href={getWhatsAppUrl(app)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                      title="Chamar cliente no WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </a>

                    <button
                      onClick={() => setViewingApp(app)}
                      className="p-2 text-slate-300 hover:text-white bg-dark-800 hover:bg-dark-700 rounded-xl transition-colors"
                      title="Visualizar detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => openEditModal(app)}
                      className="p-2 text-slate-300 hover:text-white bg-dark-800 hover:bg-dark-700 rounded-xl transition-colors"
                      title="Editar agendamento"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {app.status === 'scheduled' && (
                      <button
                        onClick={() => handleQuickStatusChange(app, 'completed')}
                        className="p-2 text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-600 rounded-xl transition-colors"
                        title="Marcar como Concluído"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}

                    {app.status !== 'cancelled' && (
                      <button
                        onClick={() => handleQuickStatusChange(app, 'cancelled')}
                        className="p-2 text-amber-400 hover:text-white bg-amber-500/10 hover:bg-amber-600 rounded-xl transition-colors"
                        title="Cancelar Agendamento"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(app)}
                      className="p-2 text-red-400 hover:text-white bg-brand-red/10 hover:bg-brand-red rounded-xl transition-colors"
                      title="Excluir Agendamento"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-dark-700">
              <h2 className="text-lg font-bold text-white">
                {editingApp ? 'Editar Agendamento' : 'Novo Agendamento'}
              </h2>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-dark-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {conflictError && (
              <div className="mt-4 p-3.5 rounded-xl bg-brand-red/15 border border-brand-red text-red-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-brand-red shrink-0" />
                <span>{conflictError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 mt-5">
              <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Sparkles className={`w-5 h-5 ${isChristmasSession ? 'text-brand-red' : 'text-brand-blue'}`} />
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-wider">
                      Cor de Identificação do Cliente
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Fotos Natalinas (Vermelho) vs Agendamentos Normais (Azul)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsChristmasSession(false)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                      !isChristmasSession
                        ? 'bg-brand-blue text-white border-brand-blue'
                        : 'bg-dark-900 text-slate-400 border-dark-700'
                    }`}
                  >
                    📷 Normal (Azul)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsChristmasSession(true)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                      isChristmasSession
                        ? 'bg-brand-red text-white border-brand-red'
                        : 'bg-dark-900 text-slate-400 border-dark-700'
                    }`}
                  >
                    🎄 Natal (Vermelho)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Selecionar Cliente
                  </label>
                  <select
                    value={clientId}
                    onChange={(e) => handleSelectClient(e.target.value)}
                    className="w-full px-3 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white"
                  >
                    <option value="">-- Digitar Novo --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Nome do Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Nome completo"
                    className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(98) 99999-9999"
                    className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Catálogo de Serviços
                  </label>
                  <select
                    value={serviceId}
                    onChange={(e) => handleSelectService(e.target.value)}
                    className="w-full px-3 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white"
                  >
                    <option value="">-- Personalizado --</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({formatCurrency(Number(s.default_price))})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Tipo de Serviço *
                  </label>
                  <input
                    type="text"
                    required
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    placeholder="Ex: Ensaio de Natal, Casamento..."
                    className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Início *
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Duração (min) *
                  </label>
                  <input
                    type="number"
                    min="15"
                    step="15"
                    required
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Término *
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Valor Total (R$) *
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={price}
                      onChange={(e) => {
                        setPrice(e.target.value);
                        if (paymentStatus === 'paid') setPaidAmount(e.target.value);
                      }}
                      placeholder="450.00"
                      className="w-full pl-9 pr-3 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Status Pagamento
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => handlePaymentStatusChange(e.target.value as PaymentStatus)}
                    className="w-full px-3 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white"
                  >
                    <option value="pending">Pendente</option>
                    <option value="partial">Parcial (Sinal)</option>
                    <option value="paid">Pago Total</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Valor Já Pago (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={paymentStatus !== 'partial'}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full px-3 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Status Agenda
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                    className="w-full px-3 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white"
                  >
                    <option value="scheduled">Agendado</option>
                    <option value="completed">Concluído</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Local do Serviço
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Estúdio Cenário de Natal, Externa..."
                  className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Observações do Agendamento
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalhes do figurino, família, iluminação..."
                  className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-dark-700">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-dark-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-5 py-2.5 text-white rounded-xl text-sm font-semibold shadow-lg disabled:opacity-50 ${
                    isChristmasSession
                      ? 'bg-brand-red hover:bg-brand-redHover'
                      : 'bg-brand-blue hover:bg-brand-blueHover'
                  }`}
                >
                  {saving
                    ? 'Salvando...'
                    : editingApp
                    ? 'Salvar Alterações'
                    : isChristmasSession
                    ? '🎄 Confirmar Ensaio de Natal'
                    : 'Confirmar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingApp && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-dark-700">
              <h2 className="text-lg font-bold text-white">Detalhes do Agendamento</h2>
              <button
                onClick={() => setViewingApp(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-dark-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 my-5 text-sm">
              <div className="p-4 rounded-xl bg-dark-950 border border-dark-700 flex items-start justify-between">
                <div>
                  <p className="text-base font-bold text-white">{viewingApp.client_name}</p>
                  <p className="text-slate-300">{viewingApp.service_name}</p>
                  <p className="text-xs text-brand-blue mt-1">{viewingApp.client_phone}</p>
                </div>

                <a
                  href={getWhatsAppUrl(viewingApp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-700">
                  <p className="text-xs text-slate-500">Data e Horário</p>
                  <p className="font-semibold text-white mt-1">
                    {formatDate(viewingApp.appointment_date)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {viewingApp.start_time.slice(0, 5)} às {viewingApp.end_time.slice(0, 5)}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-dark-950 border border-dark-700">
                  <p className="text-xs text-slate-500">Financeiro</p>
                  <p className="font-bold text-emerald-400 mt-1">
                    Total: {formatCurrency(Number(viewingApp.price))}
                  </p>
                  <p className="text-xs text-slate-400">
                    Recebido: {formatCurrency(Number(viewingApp.paid_amount))}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-dark-700">
              <button
                onClick={() => {
                  const app = viewingApp;
                  setViewingApp(null);
                  openEditModal(app);
                }}
                className="px-4 py-2 bg-brand-blue text-white rounded-xl text-xs font-semibold"
              >
                Editar
              </button>
              <button
                onClick={() => setViewingApp(null)}
                className="px-4 py-2 bg-dark-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};