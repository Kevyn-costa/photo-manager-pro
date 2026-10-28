import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Appointment, Expense } from '../types/database';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Clock,
  Plus,
  Trash2,
  X,
  Calendar,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export const Finance: React.FC = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtro de Período (Mês/Ano no formato YYYY-MM ou 'all')
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return new Date().toISOString().slice(0, 7);
  });

  // Modal de Nova Despesa
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Equipamentos');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchFinanceData = async () => {
    if (!user) return;
    setLoading(true);

    const [appsRes, expRes] = await Promise.all([
      supabase.from('appointments').select('*').order('appointment_date', { ascending: false }),
      supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
    ]);

    if (appsRes.data) setAppointments(appsRes.data);
    if (expRes.data) setExpenses(expRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchFinanceData();
  }, [user]);

  // Filtra agendamentos e despesas pelo período selecionado
  const periodAppointments = appointments.filter((app) => {
    if (selectedMonth === 'all') return true;
    return app.appointment_date.startsWith(selectedMonth);
  });

  const periodExpenses = expenses.filter((exp) => {
    if (selectedMonth === 'all') return true;
    return exp.expense_date.startsWith(selectedMonth);
  });

  // Agendamentos válidos (NÃO considera serviços cancelados)
  const validAppointments = periodAppointments.filter((app) => app.status !== 'cancelled');

  // 1. Faturamento Previsto (Soma total contratada de agendados + concluídos, exceto cancelados)
  const expectedRevenue = validAppointments.reduce((acc, app) => acc + Number(app.price), 0);

  // 2. Faturamento Realizado (Apenas serviços com status 'completed', não cancelados)
  const realizedRevenue = validAppointments
    .filter((app) => app.status === 'completed')
    .reduce((acc, app) => acc + Number(app.price), 0);

  // 3. Valores Recebidos em Caixa (Soma de tudo que já foi pago total ou parcialmente em serviços não cancelados)
  const totalReceived = validAppointments.reduce((acc, app) => {
    const paid =
      app.payment_status === 'paid' ? Number(app.price) : Number(app.paid_amount || 0);
    return acc + paid;
  }, 0);

  // 4. Valores Pendentes a Receber (Diferença entre o valor contratado e o valor já pago)
  const totalPending = Math.max(0, expectedRevenue - totalReceived);

  // 5. Total de Despesas no período
  const totalExpenses = periodExpenses.reduce((acc, exp) => acc + Number(exp.amount), 0);

  // 6. Lucro Líquido Real (Valores efetivamente recebidos menos Despesas)
  const netProfit = totalReceived - totalExpenses;

  // Dados para o Gráfico dos últimos 6 meses
  const getChartData = () => {
    const months: { key: string; label: string; Receitas: number; Despesas: number; Lucro: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

      const monthApps = appointments.filter(
        (a) => a.status !== 'cancelled' && a.appointment_date.startsWith(key)
      );
      const monthExps = expenses.filter((e) => e.expense_date.startsWith(key));

      const rec = monthApps.reduce((acc, a) => {
        const paid = a.payment_status === 'paid' ? Number(a.price) : Number(a.paid_amount || 0);
        return acc + paid;
      }, 0);

      const desp = monthExps.reduce((acc, e) => acc + Number(e.amount), 0);

      months.push({
        key,
        label,
        Receitas: rec,
        Despesas: desp,
        Lucro: rec - desp,
      });
    }
    return months;
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    await supabase.from('expenses').insert([
      {
        user_id: user.id,
        title: title.trim(),
        category,
        amount: Number(amount) || 0,
        expense_date: expenseDate,
        notes: notes.trim(),
      },
    ]);

    setSaving(false);
    setIsExpenseModalOpen(false);
    setTitle('');
    setAmount('');
    setNotes('');
    fetchFinanceData();
  };

  const handleDeleteExpense = async (id: string, expTitle: string) => {
    if (!window.confirm(`Deseja excluir a despesa "${expTitle}"?`)) return;
    await supabase.from('expenses').delete().eq('id', id);
    fetchFinanceData();
  };

  const handleMarkAsFullyPaid = async (app: Appointment) => {
    await supabase
      .from('appointments')
      .update({
        payment_status: 'paid',
        paid_amount: app.price,
      })
      .eq('id', app.id);
    fetchFinanceData();
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Filtro de Período */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <DollarSign className="w-7 h-7 text-brand-blue" />
            Gestão Financeira
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Faturamento previsto vs. realizado, recebimentos parciais, despesas e lucro real
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-dark-900 border border-dark-700 rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-brand-blue" />
            <input
              type="month"
              value={selectedMonth === 'all' ? '' : selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value || 'all')}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none"
            />
            <button
              onClick={() => setSelectedMonth('all')}
              className={`text-[11px] px-2 py-0.5 rounded-md font-semibold transition-colors ${
                selectedMonth === 'all'
                  ? 'bg-brand-blue text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tudo
            </button>
          </div>

          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="px-4 py-2.5 bg-brand-red hover:bg-brand-redHover text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-brand-red/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Lançar Despesa</span>
          </button>
        </div>
      </div>

      {/* Cards de Indicadores Financeiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Faturamento Previsto
            </span>
            <TrendingUp className="w-5 h-5 text-brand-blue" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{formatCurrency(expectedRevenue)}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Total contratado (ignora cancelados)
          </p>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Faturamento Realizado
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">
            {formatCurrency(realizedRevenue)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Apenas serviços já concluídos
          </p>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Valores Recebidos (Caixa)
            </span>
            <Wallet className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{formatCurrency(totalReceived)}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Soma de pagamentos totais + sinais
          </p>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Valores Pendentes
            </span>
            <Clock className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2">{formatCurrency(totalPending)}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Restante a receber dos clientes
          </p>
        </div>

        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Despesas do Período
            </span>
            <TrendingDown className="w-5 h-5 text-brand-red" />
          </div>
          <p className="text-2xl font-bold text-red-400 mt-2">{formatCurrency(totalExpenses)}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Custos operacionais, equipamentos e tráfego
          </p>
        </div>

        <div
          className={`border rounded-2xl p-5 ${
            netProfit >= 0
              ? 'bg-gradient-to-br from-brand-blue/20 to-dark-900 border-brand-blue/40'
              : 'bg-gradient-to-br from-brand-red/20 to-dark-900 border-brand-red/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Lucro Líquido Real
            </span>
            <DollarSign className="w-5 h-5 text-brand-blue" />
          </div>
          <p
            className={`text-2xl font-extrabold mt-2 ${
              netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {formatCurrency(netProfit)}
          </p>
          <p className="text-[11px] text-slate-300 mt-1">
            Valores Recebidos ({formatCurrency(totalReceived)}) - Despesas ({formatCurrency(totalExpenses)})
          </p>
        </div>
      </div>

      {/* Gráfico de Receitas x Despesas (Últimos 6 Meses) */}
      <div className="bg-dark-900 border border-dark-700 rounded-2xl p-6">
        <h2 className="text-base font-bold text-white mb-4">
          Evolução Financeira (Últimos 6 Meses)
        </h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={getChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252b3d" />
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
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
              <Legend />
              <Bar dataKey="Receitas" fill="#2563eb" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Despesas" fill="#dc2626" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Lucro" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Duas Colunas: Recebimentos Pendentes/Parciais e Lista de Despesas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna 1: Pagamentos Pendentes ou Parciais */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 flex flex-col">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            Valores a Receber (Pendentes / Parciais)
          </h3>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-96">
            {validAppointments.filter((a) => a.payment_status !== 'paid').length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                Nenhum pagamento pendente neste período!
              </p>
            ) : (
              validAppointments
                .filter((a) => a.payment_status !== 'paid')
                .map((app) => {
                  const restante = Number(app.price) - Number(app.paid_amount || 0);
                  return (
                    <div
                      key={app.id}
                      className="p-3.5 rounded-xl bg-dark-950 border border-dark-700 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-white">{app.client_name}</p>
                        <p className="text-xs text-slate-400">
                          {app.service_name} • {formatDate(app.appointment_date)}
                        </p>
                        <p className="text-xs text-amber-400 mt-1">
                          Falta receber: <strong>{formatCurrency(restante)}</strong> (Já pago:{' '}
                          {formatCurrency(Number(app.paid_amount))})
                        </p>
                      </div>

                      <button
                        onClick={() => handleMarkAsFullyPaid(app)}
                        className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-semibold transition-all shrink-0"
                      >
                        Dar Baixa Total
                      </button>
                    </div>
                  );
                })
            )}
          </div>
        </div>

        {/* Coluna 2: Histórico de Despesas */}
        <div className="bg-dark-900 border border-dark-700 rounded-2xl p-5 flex flex-col">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-brand-red" />
            Despesas Lançadas no Período
          </h3>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-96">
            {loading ? (
              <p className="text-sm text-slate-400 text-center py-8">Carregando...</p>
            ) : periodExpenses.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                Nenhuma despesa registrada neste período.
              </p>
            ) : (
              periodExpenses.map((exp) => (
                <div
                  key={exp.id}
                  className="p-3.5 rounded-xl bg-dark-950 border border-dark-700 flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{exp.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-dark-800 text-slate-300 border border-dark-700">
                        {exp.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatDate(exp.expense_date)} {exp.notes ? `• ${exp.notes}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-red-400">
                      - {formatCurrency(Number(exp.amount))}
                    </span>
                    <button
                      onClick={() => handleDeleteExpense(exp.id, exp.title)}
                      className="p-1.5 text-slate-400 hover:text-brand-red rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Lançar Nova Despesa */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-dark-700">
              <h2 className="text-lg font-bold text-white">Registrar Nova Despesa</h2>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-dark-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Descrição da Despesa *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Lente 50mm, Assinatura Lightroom, Combustível..."
                  className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white focus:outline-none focus:border-brand-red"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white"
                  >
                    <option value="Equipamentos">Equipamentos</option>
                    <option value="Software / Assinaturas">Software / Assinaturas</option>
                    <option value="Transporte / Locomoção">Transporte / Locomoção</option>
                    <option value="Estúdio / Aluguel">Estúdio / Aluguel</option>
                    <option value="Marketing / Anúncios">Marketing / Anúncios</option>
                    <option value="Álbuns / Impressão">Álbuns / Impressão</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="150.00"
                    className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Data da Despesa *
                </label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Observações
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Opcional"
                  className="w-full px-3.5 py-2.5 bg-dark-950 border border-dark-700 rounded-xl text-sm text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-dark-700">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-dark-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-brand-red hover:bg-brand-redHover text-white rounded-xl text-sm font-semibold"
                >
                  {saving ? 'Salvando...' : 'Salvar Despesa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};