import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Appointment, BlockedSlot, BusinessSettings } from '../types/database';
import {
  CalendarDays,
  Settings,
  Lock,
  X,
  Clock,
  MapPin,
  Phone,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Trash2,
} from 'lucide-react';

type CalendarViewMode = 'month' | 'week' | 'day';

export const SmartCalendar: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [settings, setSettings] = useState<BusinessSettings>({
    id: '',
    user_id: '',
    work_start_time: '08:00',
    work_end_time: '19:00',
    work_days: [1, 2, 3, 4, 5, 6],
    updated_at: '',
  });

  // Navegação e Visualização do Calendário
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Modais
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Campos de Bloqueio de Horário
  const [blockTitle, setBlockTitle] = useState('Horário Indisponível / Compromisso Pessoal');
  const [blockDate, setBlockDate] = useState('');
  const [blockStart, setBlockStart] = useState('08:00');
  const [blockEnd, setBlockEnd] = useState('12:00');
  const [isFullDay, setIsFullDay] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchCalendarData = async () => {
    if (!user) return;

    const [appsRes, blocksRes, settingsRes] = await Promise.all([
      supabase
        .from('appointments')
        .select('*')
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true }),
      supabase.from('blocked_slots').select('*').order('block_date', { ascending: false }),
      supabase.from('business_settings').select('*').eq('user_id', user.id).maybeSingle(),
    ]);

    if (appsRes.data) setAppointments(appsRes.data);
    if (blocksRes.data) setBlockedSlots(blocksRes.data);
    if (settingsRes.data) {
      setSettings({
        ...settingsRes.data,
        work_start_time: settingsRes.data.work_start_time.slice(0, 5),
        work_end_time: settingsRes.data.work_end_time.slice(0, 5),
      });
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, [user]);

  const isChristmasAppointment = (app: Appointment) => {
    return (
      app.service_name.toLowerCase().includes('natal') ||
      app.service_name.includes('🎄') ||
      (app.notes && app.notes.includes('[NATAL]'))
    );
  };

  const getWhatsAppUrl = (app: Appointment) => {
    const digits = app.client_phone.replace(/\D/g, '');
    const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
    const [y, m, d] = app.appointment_date.split('-');
    const formattedDate = `${d}/${m}/${y}`;
    const cleanService = app.service_name.replace('🎄 ', '');
    const message = encodeURIComponent(
      `Olá ${app.client_name}! Tudo bem? Passando para confirmar seu agendamento de *${cleanService}* no dia *${formattedDate}* às *${app.start_time.slice(
        0,
        5
      )}*.`
    );
    return `https://wa.me/${withCountry}?text=${message}`;
  };

  const toDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleSaveBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    await supabase.from('blocked_slots').insert([
      {
        user_id: user.id,
        title: blockTitle.trim() || 'Bloqueado',
        block_date: blockDate,
        start_time: isFullDay ? '00:00' : blockStart,
        end_time: isFullDay ? '23:59' : blockEnd,
        is_full_day: isFullDay,
      },
    ]);

    setSaving(false);
    setIsBlockModalOpen(false);
    fetchCalendarData();
  };

  const handleDeleteBlock = async (id: string) => {
    await supabase.from('blocked_slots').delete().eq('id', id);
    fetchCalendarData();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    const payload = {
      user_id: user.id,
      work_start_time: settings.work_start_time,
      work_end_time: settings.work_end_time,
      work_days: settings.work_days,
      updated_at: new Date().toISOString(),
    };

    await supabase.from('business_settings').upsert(payload, { onConflict: 'user_id' });
    setSaving(false);
    setIsSettingsModalOpen(false);
    fetchCalendarData();
  };

  const toggleWorkDay = (dayIndex: number) => {
    setSettings((prev) => {
      const exists = prev.work_days.includes(dayIndex);
      return {
        ...prev,
        work_days: exists
          ? prev.work_days.filter((d) => d !== dayIndex)
          : [...prev.work_days, dayIndex].sort(),
      };
    });
  };

  // Gera os dias da grade Mensal
  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Dom) a 6 (Sab)
    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month, -i),
        isCurrentMonth: false,
      });
    }

    for (let d = 1; d <= lastDayOfMonth.getDate(); d++) {
      days.push({
        date: new Date(year, month, d),
        isCurrentMonth: true,
      });
    }

    while (days.length % 7 !== 0) {
      const nextDay = days.length - startDayOfWeek - lastDayOfMonth.getDate() + 1;
      days.push({
        date: new Date(year, month + 1, nextDay),
        isCurrentMonth: false,
      });
    }

    return days;
  };

  // Gera os 7 dias da Semana atual
  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - currentDate.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  };

  const daysOfWeekNames = [
    { index: 0, label: 'Dom' },
    { index: 1, label: 'Seg' },
    { index: 2, label: 'Ter' },
    { index: 3, label: 'Qua' },
    { index: 4, label: 'Qui' },
    { index: 5, label: 'Sex' },
    { index: 6, label: 'Sáb' },
  ];

  const todayStr = toDateStr(new Date());

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <CalendarDays className="w-7 h-7 text-brand-blue" />
            Calendário Inteligente
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Visualize sua agenda diária, semanal ou mensal com destaque para fotos natalinas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="px-3.5 py-2.5 bg-dark-900 hover:bg-dark-800 text-slate-200 border border-dark-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
          >
            <Settings className="w-4 h-4 text-brand-blue" />
            <span>Horário de Funcionamento</span>
          </button>

          <button
            onClick={() => {
              setBlockDate(toDateStr(currentDate));
              setIsBlockModalOpen(true);
            }}
            className="px-4 py-2.5 bg-brand-red hover:bg-brand-redHover text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-brand-red/20 transition-all"
          >
            <Lock className="w-4 h-4" />
            <span>Bloquear Data / Horário</span>
          </button>
        </div>
      </div>

      {/* Legenda de Cores */}
      <div className="flex flex-wrap items-center gap-5 text-xs text-slate-400 bg-dark-900 border border-dark-700 px-4 py-3 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-brand-blue inline-block" />
          <span>Agendamento Padrão (Azul)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-brand-red inline-block" />
          <span>🎄 Ensaio de Natal (Vermelho)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
          <span>Serviço Concluído</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
          <span>🔒 Horário Bloqueado</span>
        </div>
        <div className="ml-auto text-slate-400 hidden md:block">
          Expediente: {settings.work_start_time} às {settings.work_end_time}
        </div>
      </div>

      {/* Barra de Controle do Calendário (Navegação e Modos de Visão) */}
      <div className="bg-dark-900 border border-dark-700 rounded-2xl p-4 sm:p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-dark-700">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="p-2 bg-dark-950 hover:bg-dark-800 text-slate-200 border border-dark-700 rounded-xl transition-colors"
              title="Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleToday}
              className="px-3.5 py-2 bg-dark-950 hover:bg-dark-800 text-xs font-bold text-slate-200 border border-dark-700 rounded-xl transition-colors"
            >
              Hoje
            </button>
            <button
              onClick={handleNext}
              className="p-2 bg-dark-950 hover:bg-dark-800 text-slate-200 border border-dark-700 rounded-xl transition-colors"
              title="Próximo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-white capitalize ml-2">
              {viewMode === 'day'
                ? currentDate.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })
                : currentDate.toLocaleDateString('pt-BR', {
                    month: 'long',
                    year: 'numeric',
                  })}
            </h2>
          </div>

          {/* Botões Mês / Semana / Dia */}
          <div className="flex items-center gap-1 bg-dark-950 p-1 rounded-xl border border-dark-700 self-start sm:self-auto">
            {[
              { id: 'month', label: 'Mês' },
              { id: 'week', label: 'Semana' },
              { id: 'day', label: 'Dia' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as CalendarViewMode)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === tab.id
                    ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* VISÃO MENSAL */}
        {viewMode === 'month' && (
          <div>
            <div className="grid grid-cols-7 gap-2 mb-2 text-center">
              {daysOfWeekNames.map((d) => (
                <div
                  key={d.index}
                  className="text-xs font-bold uppercase tracking-wider text-slate-400 py-1"
                >
                  {d.label}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {getMonthDays().map(({ date, isCurrentMonth }, idx) => {
                const dateStr = toDateStr(date);
                const isToday = dateStr === todayStr;
                const dayApps = appointments.filter((a) => a.appointment_date === dateStr);
                const dayBlocks = blockedSlots.filter((b) => b.block_date === dateStr);
                const isWorkDay = settings.work_days.includes(date.getDay());

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setCurrentDate(date);
                      setViewMode('day');
                    }}
                    className={`min-h-[110px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      !isCurrentMonth
                        ? 'bg-dark-950/30 border-dark-700/40 opacity-45'
                        : isToday
                        ? 'bg-brand-blue/10 border-brand-blue'
                        : !isWorkDay
                        ? 'bg-dark-950/60 border-dark-700/60'
                        : 'bg-dark-950 border-dark-700 hover:border-brand-blue/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                          isToday ? 'bg-brand-blue text-white' : 'text-slate-300'
                        }`}
                      >
                        {date.getDate()}
                      </span>
                      {!isWorkDay && (
                        <span className="text-[9px] text-slate-500 uppercase">Folga</span>
                      )}
                    </div>

                    <div className="space-y-1 mt-1.5 overflow-hidden">
                      {dayBlocks.map((b) => (
                        <div
                          key={b.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Remover bloqueio "${b.title}"?`)) {
                              handleDeleteBlock(b.id);
                            }
                          }}
                          className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-semibold truncate"
                          title={`Bloqueado: ${b.title}`}
                        >
                          🔒 {b.is_full_day ? 'Dia Todo' : b.start_time.slice(0, 5)} {b.title}
                        </div>
                      ))}

                      {dayApps.slice(0, 3).map((app) => {
                        const isXmas = isChristmasAppointment(app);
                        return (
                          <div
                            key={app.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAppointment(app);
                            }}
                            className={`px-1.5 py-1 rounded text-[10px] font-semibold text-white truncate shadow-sm ${
                              app.status === 'completed'
                                ? 'bg-emerald-600'
                                : isXmas
                                ? 'bg-brand-red'
                                : 'bg-brand-blue'
                            }`}
                          >
                            {isXmas ? '🎄 ' : ''}
                            {app.start_time.slice(0, 5)} {app.client_name}
                          </div>
                        );
                      })}

                      {dayApps.length > 3 && (
                        <div className="text-[10px] text-slate-400 font-semibold pl-1">
                          + {dayApps.length - 3} agendamento(s)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VISÃO SEMANAL */}
        {viewMode === 'week' && (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {getWeekDays().map((date, idx) => {
              const dateStr = toDateStr(date);
              const isToday = dateStr === todayStr;
              const dayApps = appointments.filter((a) => a.appointment_date === dateStr);
              const dayBlocks = blockedSlots.filter((b) => b.block_date === dateStr);

              return (
                <div
                  key={idx}
                  className={`rounded-xl border p-3 min-h-[260px] flex flex-col ${
                    isToday
                      ? 'bg-brand-blue/10 border-brand-blue'
                      : 'bg-dark-950 border-dark-700'
                  }`}
                >
                  <div className="pb-2 mb-3 border-b border-dark-700 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        {daysOfWeekNames[date.getDay()].label}
                      </span>
                      <span className="text-base font-bold text-white">
                        {date.getDate()}/{date.getMonth() + 1}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setBlockDate(dateStr);
                        setIsBlockModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-brand-red rounded-lg hover:bg-dark-800"
                      title="Bloquear horário neste dia"
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2 flex-1">
                    {dayBlocks.map((b) => (
                      <div
                        key={b.id}
                        className="p-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between gap-1"
                      >
                        <div className="truncate">
                          <span className="font-bold block">🔒 {b.title}</span>
                          <span className="text-[10px]">
                            {b.is_full_day
                              ? 'Dia Inteiro'
                              : `${b.start_time.slice(0, 5)} - ${b.end_time.slice(0, 5)}`}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteBlock(b.id)}
                          className="text-amber-300 hover:text-red-400 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {dayApps.length === 0 && dayBlocks.length === 0 ? (
                      <p className="text-[11px] text-slate-500 text-center py-6">
                        Livre
                      </p>
                    ) : (
                      dayApps.map((app) => {
                        const isXmas = isChristmasAppointment(app);
                        return (
                          <div
                            key={app.id}
                            onClick={() => setSelectedAppointment(app)}
                            className={`p-2.5 rounded-xl text-white text-xs cursor-pointer transition-transform hover:scale-[1.02] shadow-md ${
                              app.status === 'completed'
                                ? 'bg-emerald-600'
                                : isXmas
                                ? 'bg-brand-red'
                                : 'bg-brand-blue'
                            }`}
                          >
                            <p className="font-bold truncate">
                              {isXmas ? '🎄 ' : ''}
                              {app.client_name}
                            </p>
                            <p className="text-[11px] opacity-90 truncate">
                              {app.service_name.replace(/^🎄\s*/, '')}
                            </p>
                            <p className="text-[10px] font-semibold mt-1 opacity-95">
                              ⏰ {app.start_time.slice(0, 5)} - {app.end_time.slice(0, 5)}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VISÃO DIÁRIA DETALHADA */}
        {viewMode === 'day' && (
          <div className="space-y-3">
            {(() => {
              const dateStr = toDateStr(currentDate);
              const dayApps = appointments.filter((a) => a.appointment_date === dateStr);
              const dayBlocks = blockedSlots.filter((b) => b.block_date === dateStr);

              if (dayApps.length === 0 && dayBlocks.length === 0) {
                return (
                  <div className="p-10 text-center bg-dark-950 rounded-2xl border border-dark-700">
                    <p className="text-base font-semibold text-white">
                      Nenhum compromisso ou bloqueio para esta data
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Horário de expediente configurado: {settings.work_start_time} às{' '}
                      {settings.work_end_time}
                    </p>
                  </div>
                );
              }

              return (
                <>
                  {dayBlocks.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-bold uppercase text-amber-400">
                          🔒 Horário Bloqueado na Agenda
                        </span>
                        <p className="text-base font-bold text-white mt-0.5">{b.title}</p>
                        <p className="text-xs text-slate-300 mt-0.5">
                          {b.is_full_day
                            ? 'Dia Inteiro Indisponível'
                            : `${b.start_time.slice(0, 5)} às ${b.end_time.slice(0, 5)}`}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteBlock(b.id)}
                        className="px-3 py-1.5 bg-brand-red text-white rounded-xl text-xs font-semibold"
                      >
                        Desbloquear
                      </button>
                    </div>
                  ))}

                  {dayApps.map((app) => {
                    const isXmas = isChristmasAppointment(app);
                    return (
                      <div
                        key={app.id}
                        onClick={() => setSelectedAppointment(app)}
                        className={`p-4 rounded-2xl border-l-4 border cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isXmas
                            ? 'bg-brand-red/15 border-l-brand-red border-brand-red/40'
                            : 'bg-brand-blue/15 border-l-brand-blue border-brand-blue/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold text-white ${
                                isXmas ? 'bg-brand-red' : 'bg-brand-blue'
                              }`}
                            >
                              {isXmas ? '🎄 NATAL' : '📷 PADRÃO'}
                            </span>
                            <span className="text-base font-bold text-white">
                              {app.client_name}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1">
                            {app.service_name.replace(/^🎄\s*/, '')} •{' '}
                            <strong>
                              {app.start_time.slice(0, 5)} às {app.end_time.slice(0, 5)}
                            </strong>
                          </p>
                        </div>

                        <a
                          href={getWhatsAppUrl(app)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Chamar no WhatsApp</span>
                        </a>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Modal de Bloqueio de Horários */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-dark-700">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-brand-red" />
                Bloquear Horário na Agenda
              </h2>
              <button
                onClick={() => setIsBlockModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-dark-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBlock} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Motivo / Título do Bloqueio *
                </label>
                <input
                  type="text"
                  required
                  value={blockTitle}
                  onChange={(e) => setBlockTitle(e.target.value)}
                  placeholder="Ex: Edição de Fotos, Folga, Manutenção..."
                  className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-red"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Data do Bloqueio *
                </label>
                <input
                  type="date"
                  required
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-red"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="fullDay"
                  checked={isFullDay}
                  onChange={(e) => setIsFullDay(e.target.checked)}
                  className="w-4 h-4 accent-brand-red rounded"
                />
                <label htmlFor="fullDay" className="text-sm text-slate-300 cursor-pointer">
                  Bloquear o dia inteiro
                </label>
              </div>

              {!isFullDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Início
                    </label>
                    <input
                      type="time"
                      required
                      value={blockStart}
                      onChange={(e) => setBlockStart(e.target.value)}
                      className="w-full px-3 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                      Término
                    </label>
                    <input
                      type="time"
                      required
                      value={blockEnd}
                      onChange={(e) => setBlockEnd(e.target.value)}
                      className="w-full px-3 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
                <button
                  type="button"
                  onClick={() => setIsBlockModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-dark-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-brand-red hover:bg-brand-redHover text-white rounded-xl text-sm font-semibold shadow-lg shadow-brand-red/25"
                >
                  {saving ? 'Bloqueando...' : 'Confirmar Bloqueio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Configuração de Horário de Funcionamento */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-dark-700">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-brand-blue" />
                Horário de Funcionamento
              </h2>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-dark-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Dias de Atendimento na Semana
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {daysOfWeekNames.map((d) => {
                    const active = settings.work_days.includes(d.index);
                    return (
                      <button
                        key={d.index}
                        type="button"
                        onClick={() => toggleWorkDay(d.index)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          active
                            ? 'bg-brand-blue text-white border-brand-blue'
                            : 'bg-dark-950 text-slate-500 border-dark-700'
                        }`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Abertura do Expediente
                  </label>
                  <input
                    type="time"
                    value={settings.work_start_time}
                    onChange={(e) =>
                      setSettings({ ...settings, work_start_time: e.target.value })
                    }
                    className="w-full px-3 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Fechamento do Expediente
                  </label>
                  <input
                    type="time"
                    value={settings.work_end_time}
                    onChange={(e) =>
                      setSettings({ ...settings, work_end_time: e.target.value })
                    }
                    className="w-full px-3 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-dark-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-brand-blue hover:bg-brand-blueHover text-white rounded-xl text-sm font-semibold"
                >
                  {saving ? 'Salvando...' : 'Salvar Expediente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhes ao Clicar no Compromisso no Calendário */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-dark-700">
              <h2 className="text-lg font-bold text-white">Compromisso na Agenda</h2>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-dark-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 my-4 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold text-white inline-block mb-1 ${
                      isChristmasAppointment(selectedAppointment)
                        ? 'bg-brand-red'
                        : 'bg-brand-blue'
                    }`}
                  >
                    {isChristmasAppointment(selectedAppointment)
                      ? '🎄 ENSAIO DE NATAL'
                      : '📷 SESSÃO PADRÃO'}
                  </span>
                  <p className="text-base font-bold text-white">
                    {selectedAppointment.client_name}
                  </p>
                  <p className="text-brand-blue font-medium">
                    {selectedAppointment.service_name.replace(/^🎄\s*/, '')}
                  </p>
                </div>

                <a
                  href={getWhatsAppUrl(selectedAppointment)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>
              </div>

              <div className="flex items-center gap-2 text-slate-300 text-xs">
                <Clock className="w-4 h-4 text-brand-blue" />
                <span>
                  {selectedAppointment.start_time.slice(0, 5)} às{' '}
                  {selectedAppointment.end_time.slice(0, 5)} ({selectedAppointment.duration} min)
                </span>
              </div>

              <div className="flex items-center gap-2 text-slate-300 text-xs">
                <Phone className="w-4 h-4 text-brand-blue" />
                <span>{selectedAppointment.client_phone}</span>
              </div>

              {selectedAppointment.location && (
                <div className="flex items-center gap-2 text-slate-300 text-xs">
                  <MapPin className="w-4 h-4 text-brand-red" />
                  <span>{selectedAppointment.location}</span>
                </div>
              )}

              {selectedAppointment.notes && (
                <p className="text-xs text-slate-400 bg-dark-950 p-3 rounded-xl border border-dark-700">
                  {selectedAppointment.notes}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-dark-700">
              <button
                onClick={() => setSelectedAppointment(null)}
                className="px-4 py-2 bg-brand-blue text-white rounded-xl text-xs font-semibold"
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