import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Appointment, Expense } from '../types/database';
import {
  LayoutDashboard,
  CalendarCheck,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  MapPin,
  ArrowRight,
  Plus,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!user) return;
      setLoading(true);

      const [appsRes, expRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('*')
          .order('appointment_date', { ascending: true })
          .order('start_time', { ascending: true }),
        supabase.from('expenses').select('*'),
      ]);

      if (appsRes.data) setAppointments(appsRes.data);
      if (expRes.data) setExpenses(expRes.data);
      setLoading(false);
    };

    fetchDashboard();
  }, [user]);

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonthStr = todayStr.slice(0, 7);

  // Agendamentos de Hoje (ativos)
  const todayAppointments = appointments.filter(
    (a) => a.appointment_date === todayStr && a.status !== 'cancelled'
  );

  // Próximos Compromissos (a partir de amanhã, ativos)
  const upcomingAppointments = appointments
    .filter((a) => a.appointment_date > todayStr && a.status === 'scheduled')
    .slice(0, 5);

  // Cálculos do Mês Atual (ignorando cancelados)
  const monthValidApps = appointments.filter(
    (a) => a.appointment_date.startsWith(currentMonthStr) && a.status !== 'cancelled'
  );

  const monthExpenses = expenses.filter((e) =>
    e.expense_date.startsWith(currentMonthStr)
  );

  const monthlyRevenue = monthValidApps.reduce((acc, a) => acc + Number(a.price), 0);

  const monthlyReceived = monthValidApps.reduce((acc, a) => {
    const paid = a.payment_status === 'paid' ? Number(a.price) : Number(a.paid_amount || 0);
    return acc + paid;
  }, 0);

  const monthlyPending = Math.max(0, monthlyRevenue - monthlyReceived);

  const monthlyExpenseTotal = monthExpenses.reduce((acc, e) => acc + Number(e.amount), 0);

  const monthlyProfit = monthlyReceived - monthlyExpenseTotal;

  // Resumo da Agenda no Mês
  const scheduledCount = monthValidApps.filter((a) => a.status === 'scheduled').length;
  const completedCount = monthValidApps.filter((a) => a.status === 'completed').length;

  // Dados para o Gráfico de Área (Últimos 6 meses)
  const getChartData = () => {
    const data: { mes: string; Recebido: number; Despesas: number; Lucro: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short' });

      const mApps = appointments.filter(
        (a) => a.status !== 'cancelled' && a.appointment_date.startsWith(key)
      );
      const mExps = expenses.filter((e) => e.expense_date.startsWith(key));

      const rec = mApps.reduce(
        (acc, a) =>
          acc + (a.payment_status === 'paid' ? Number(a.price) : Number(a.paid_amount || 0)),
        0
      );
      const desp = mExps.reduce((acc, e) => acc + Number(e.amount), 0);

      data.push({
        mes: label,
        Recebido: rec,
        Despesas: desp,
        Lucro: rec - desp,
      });
    }
    return data;
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <LayoutDashboard className="w-7 h-7 text-brand-red" />
            Painel de Controle 
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Visão geral da sua agenda de hoje, próximos trabalhos e desempenho financeiro do mês
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/agendamentos"
            className="px-4 py-2.5 bg-brand-blue hover:bg-brand-blueHover text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-brand-blue/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Agendamento</span>
          </Link>
        </div>
      </div>

      {/* 5 Cards Financeiros Principais do Mês */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
            <span>Faturamento Mensal</span>
            <TrendingUp className="w-4 h-4 text-brand-blue" />
          </div>
          <p className="text-xl font-bold text-white mt-2">{formatCurrency(monthlyRevenue)}</p>
          <span className="text-[11px] text-slate-500">Total agendado no mês</span>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
            <span>Valores Recebidos</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-emerald-400 mt-2">
            {formatCurrency(monthlyReceived)}
          </p>
          <span className="text-[11px] text-slate-500">Em caixa neste mês</span>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
            <span>Valores Pendentes</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-bold text-amber-400 mt-2">
            {formatCurrency(monthlyPending)}
          </p>
          <span className="text-[11px] text-slate-500">A receber no mês</span>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
            <span>Despesas do Mês</span>
            <TrendingDown className="w-4 h-4 text-brand-red" />
          </div>
          <p className="text-xl font-bold text-red-400 mt-2">
            {formatCurrency(monthlyExpenseTotal)}
          </p>
          <span className="text-[11px] text-slate-500">Custos operacionais</span>
        </div>

        <div className="bg-gradient-to-br from-brand-blue/20 to-dark-900 border border-brand-blue/40 rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-white font-bold uppercase">
            <span>Lucro do Mês</span>
            <DollarSign className="w-4 h-4 text-brand-blue" />
          </div>
          <p
            className={`text-xl font-extrabold mt-2 ${
              monthlyProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {formatCurrency(monthlyProfit)}
          </p>
          <span className="text-[11px] text-slate-300">Recebidos - Despesas</span>
        </div>
      </div>

      {/* Agendamentos de Hoje e Próximos Compromissos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agendamentos de Hoje */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-brand-blue" />
                Agendamentos de Hoje ({todayAppointments.length})
              </h2>
              <span className="text-xs text-slate-400">{formatDate(todayStr)}</span>
            </div>

            {loading ? (
              <p className="text-sm text-slate-400 py-6 text-center">Carregando agenda...</p>
            ) : todayAppointments.length === 0 ? (
              <div className="py-8 text-center bg-dark-950/60 rounded-xl border border-dark-700/60">
                <p className="text-sm text-slate-300 font-medium">
                  Nenhum ensaio agendado para hoje.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Aproveite para editar fotos ou prospectar novos clientes!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {todayAppointments.map((app) => (
                  <div
                    key={app.id}
                    className="p-3.5 rounded-xl bg-dark-950 border border-brand-blue/40 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-white">{app.client_name}</p>
                      <p className="text-xs text-brand-blue font-medium">{app.service_name}</p>
                      {app.location && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-brand-red" />
                          {app.location}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-lg bg-brand-blue text-white text-xs font-bold">
                        {app.start_time.slice(0, 5)} - {app.end_time.slice(0, 5)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Resumo Rápido da Agenda no Mês */}
          <div className="mt-5 pt-4 border-t border-dark-700 flex items-center justify-between text-xs text-slate-400">
            <span>
              Resumo do mês: <strong className="text-white">{scheduledCount}</strong> a realizar •{' '}
              <strong className="text-emerald-400">{completedCount}</strong> concluídos
            </span>
            <Link
              to="/calendario"
              className="text-brand-blue hover:underline font-semibold flex items-center gap-1"
            >
              Abrir Calendário <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Próximos Compromissos */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-blue" />
                Próximos Compromissos
              </h2>
              <Link
                to="/agendamentos"
                className="text-xs text-brand-blue hover:underline font-semibold"
              >
                Ver todos
              </Link>
            </div>

            {loading ? (
              <p className="text-sm text-slate-400 py-6 text-center">Carregando...</p>
            ) : upcomingAppointments.length === 0 ? (
              <div className="py-8 text-center bg-dark-950/60 rounded-xl border border-dark-700/60">
                <p className="text-sm text-slate-400">
                  Não há compromissos futuros agendados no momento.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {upcomingAppointments.map((app) => (
                  <div
                    key={app.id}
                    className="p-3 rounded-xl bg-dark-950 border border-dark-700 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-white">{app.client_name}</p>
                      <p className="text-xs text-slate-400">{app.service_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-brand-blue">
                        {formatDate(app.appointment_date)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {app.start_time.slice(0, 5)} ({formatCurrency(Number(app.price))})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico Financeiro no Dashboard */}
      <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white">
            Desempenho Financeiro (Recebido x Despesas x Lucro)
          </h2>
          <Link
            to="/financeiro"
            className="text-xs text-brand-blue hover:underline font-semibold flex items-center gap-1"
          >
            Relatório Completo <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={getChartData()}>
              <defs>
                <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#252b3d" />
              <XAxis dataKey="mes" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f121c',
                  borderColor: '#252b3d',
                  borderRadius: '12px',
                  color: '#fff',
                }}
                formatter={(value: any) => formatCurrency(Number(value))}
              />
              <Area
                type="monotone"
                dataKey="Recebido"
                stroke="#2563eb"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRec)"
              />
              <Area
                type="monotone"
                dataKey="Lucro"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorLucro)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};