import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Package,
  AlertCircle,
  MapPin,
  CreditCard,
  CheckCircle2,
  Calendar,
  Search,
  Sparkles,
  Zap,
  ArrowUpRight,
  Filter,
  X,
  RefreshCw,
} from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
const PAYMENT_COLORS = {
  ไทยช่วยไทยพลัส: '#10b981', // Emerald 500
  โอนพร้อมเพย์: '#3b82f6', // Blue 500
  เงินสด: '#f59e0b', // Amber 500
};

// Helper แปลงวันที่ BE (พ.ศ.), CE (ค.ศ.) รองรับ slash และ dash
const formatDateForComparison = (datetimeString) => {
  if (!datetimeString) return '';
  try {
    const trimmed = String(datetimeString).trim();
    const datePart = trimmed.split(' ')[0];

    if (datePart.includes('-')) {
      const parts = datePart.split('-');
      if (parts[0].length === 4) {
        let y = parseInt(parts[0], 10);
        if (y > 2400) y -= 543;
        return `${y}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        let y = parseInt(parts[2], 10);
        if (y > 2400) y -= 543;
        return `${y}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    if (datePart.includes('/')) {
      const [day, month, yearRaw] = datePart.split('/');
      let year = parseInt(yearRaw, 10);
      if (isNaN(year)) return '';

      if (year > 2400) {
        year -= 543;
      }

      const paddedMonth = month.padStart(2, '0');
      const paddedDay = day.padStart(2, '0');
      return `${year}-${paddedMonth}-${paddedDay}`;
    }

    return '';
  } catch (e) {
    return '';
  }
};

export default function BeverageDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [filterMode, setFilterMode] = useState('day');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const [isLive, setIsLive] = useState(false);
  const [hideCanceled, setHideCanceled] = useState(true);

  const DATA_URL =
    'https://script.google.com/macros/s/AKfycbz8AiaKwcO7IhRqwCEsZhpPmTw9mIkWsnKB-2MDti0-hpDFQ6FGM4ExfijSDfdXm8mn/exec';

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(DATA_URL);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            '404 Not Found - ลิงก์ API ไม่ถูกต้อง หรือถูกยกเลิกการ Deploy ไปแล้ว'
          );
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();

      let parsedData = [];
      if (Array.isArray(result)) {
        parsedData = result;
      } else if (result && result.data && Array.isArray(result.data)) {
        parsedData = result.data;
      }

      if (parsedData.length > 0) {
        if (Array.isArray(parsedData[0])) {
          const headers = parsedData[0];
          const mappedData = parsedData.slice(1).map((row) => {
            const obj = {};
            headers.forEach((header, index) => {
              if (header === 'วัน-เวลา') obj.datetime = row[index];
              else if (header === 'รหัสบิล') obj.billId = row[index];
              else if (header === 'ชื่อลูกค้า') obj.customer = row[index];
              else if (header === 'รายการสินค้า') obj.items = row[index];
              else if (header === 'ยอดรวม (บาท)')
                obj.total = parseFloat(row[index]) || 0;
              else if (header === 'ช่องทางชำระ') obj.payment = row[index];
              else if (header === 'สถานะออเดอร์') obj.status = row[index];
              else if (header === 'จุดจัดส่ง') obj.deliveryPoint = row[index];
              else if (header === 'ที่อยู่จัดส่ง') obj.address = row[index];
              else if (header === 'หมายเหตุ') obj.remark = row[index];
              else obj[header] = row[index];
            });
            return obj;
          });
          setData(mappedData);
          setIsLive(true);
        } else {
          setData(parsedData);
          setIsLive(true);
        }
      } else {
        console.warn('API returned empty data.');
        setData([]);
        setIsLive(false);
        setError('ไม่พบข้อมูลจากระบบ (Empty Data)');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setData([]);
      setIsLive(false);
      setError(err.message || 'ไม่สามารถดึงข้อมูลได้ (Connection Error)');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set(
      data
        .map((item) => formatDateForComparison(item.datetime).split('-')[0])
        .filter(Boolean)
    );
    return Array.from(years).sort().reverse();
  }, [data]);

  const latestAvailableDate = useMemo(() => {
    if (!data || data.length === 0) return '';
    const dates = data
      .map((item) => formatDateForComparison(item.datetime))
      .filter(Boolean)
      .sort();
    return dates.length > 0 ? dates[dates.length - 1] : '';
  }, [data]);

  const displayData = useMemo(() => {
    let filtered = data;

    if (filterMode === 'day' && selectedDate) {
      filtered = filtered.filter(
        (item) => formatDateForComparison(item.datetime) === selectedDate
      );
    } else if (filterMode === 'month' && selectedMonth) {
      filtered = filtered.filter((item) =>
        formatDateForComparison(item.datetime).startsWith(selectedMonth)
      );
    } else if (filterMode === 'year' && selectedYear) {
      filtered = filtered.filter((item) =>
        formatDateForComparison(item.datetime).startsWith(selectedYear)
      );
    }

    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          (item.customer?.toLowerCase() || '').includes(lowerCaseSearch) ||
          (item.billId?.toLowerCase() || '').includes(lowerCaseSearch) ||
          (item.address?.toLowerCase() || '').includes(lowerCaseSearch)
      );
    }

    if (hideCanceled) {
      filtered = filtered.filter((item) => {
        const status = item.status || '';
        return (
          !status.includes('ยกเลิก') && !status.toLowerCase().includes('cancel')
        );
      });
    }

    return filtered;
  }, [
    data,
    searchTerm,
    selectedDate,
    selectedMonth,
    selectedYear,
    hideCanceled,
    filterMode,
  ]);

  const metrics = useMemo(() => {
    const totalSales = displayData.reduce(
      (sum, item) => sum + (parseFloat(item.total) || 0),
      0
    );
    const totalOrders = displayData.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    let totalItems = 0;
    displayData.forEach((order) => {
      if (order.items) {
        const lines = order.items.split('\n');
        lines.forEach((line) => {
          const match = line.match(/^(\d+)x/);
          if (match && match[1]) {
            totalItems += parseInt(match[1], 10);
          } else {
            totalItems += 1;
          }
        });
      }
    });

    return { totalSales, totalOrders, avgOrderValue, totalItems };
  }, [displayData]);

  const chartsData = useMemo(() => {
    const paymentMap = {};
    displayData.forEach((item) => {
      const pm = item.payment || 'Unknown';
      paymentMap[pm] = (paymentMap[pm] || 0) + 1;
    });
    const paymentData = Object.keys(paymentMap).map((key) => ({
      name: key,
      value: paymentMap[key],
    }));

    const deliveryMap = {};
    displayData.forEach((item) => {
      const dp = item.deliveryPoint || 'Unknown';
      deliveryMap[dp] = (deliveryMap[dp] || 0) + 1;
    });
    const deliveryData = Object.keys(deliveryMap).map((key) => ({
      name: key,
      value: deliveryMap[key],
    }));

    const trendMap = {};
    displayData.forEach((item) => {
      if (item.datetime) {
        const dateFormatted = formatDateForComparison(item.datetime);
        if (!dateFormatted) return;

        let sortKey = '';
        let displayKey = '';

        if (filterMode === 'day') {
          const timePart = item.datetime.split(' ')[1];
          if (timePart) {
            sortKey = timePart.split(':')[0];
            displayKey = sortKey + ':00';
          }
        } else if (filterMode === 'month') {
          sortKey = dateFormatted;
          const [yyyy, mm, dd] = dateFormatted.split('-');
          const monthNames = [
            '',
            'ม.ค.',
            'ก.พ.',
            'มี.ค.',
            'เม.ย.',
            'พ.ค.',
            'มิ.ย.',
            'ก.ค.',
            'ส.ค.',
            'ก.ย.',
            'ต.ค.',
            'พ.ย.',
            'ธ.ค.',
          ];
          displayKey = `${parseInt(dd, 10)} ${monthNames[parseInt(mm, 10)]}`;
        } else if (filterMode === 'year') {
          sortKey = dateFormatted.substring(0, 7);
          const [yyyy, mm] = dateFormatted.split('-');
          const monthNames = [
            '',
            'ม.ค.',
            'ก.พ.',
            'มี.ค.',
            'เม.ย.',
            'พ.ค.',
            'มิ.ย.',
            'ก.ค.',
            'ส.ค.',
            'ก.ย.',
            'ต.ค.',
            'พ.ย.',
            'ธ.ค.',
          ];
          const yearBE = parseInt(yyyy, 10) + 543;
          displayKey = `${monthNames[parseInt(mm, 10)]} ${yearBE
            .toString()
            .slice(-2)}`;
        }

        if (sortKey) {
          if (!trendMap[sortKey]) {
            trendMap[sortKey] = { time: displayKey, sales: 0 };
          }
          trendMap[sortKey].sales += parseFloat(item.total) || 0;
        }
      }
    });
    const trendData = Object.keys(trendMap)
      .sort()
      .map((key) => trendMap[key]);

    return { paymentData, deliveryData, trendData };
  }, [displayData, filterMode]);

  let chartTitle = 'แนวโน้มยอดขายรายชั่วโมง (Hourly Sales Trend)';
  if (filterMode === 'month')
    chartTitle = 'แนวโน้มยอดขายรายวัน (Daily Sales Trend)';
  if (filterMode === 'year')
    chartTitle = 'แนวโน้มยอดขายรายเดือน (Monthly Sales Trend)';

  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100 font-sans antialiased relative selection:bg-indigo-500 selection:text-white pb-12">
      {/* Ambient Radial Gradient Lights */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-[128px] pointer-events-none" />
      <div className="fixed top-1/3 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-[128px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8 relative z-10">
        
        {/* Header Section */}
        <header className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-6 shadow-2xl shadow-black/50">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            
            {/* Title & Live Status */}
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl shadow-lg shadow-indigo-500/30">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                    Beverage Shop
                  </h1>
                  <p className="text-xs text-slate-400 font-medium tracking-wide uppercase mt-0.5">
                    Enterprise Analytics Platform
                  </p>
                </div>
              </div>
            </div>

            {/* Global Controls Bar */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              
              {/* Live Status Indicator Pill */}
              <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-950/60 rounded-2xl border border-slate-800">
                {loading ? (
                  <span className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Syncing...
                  </span>
                ) : error ? (
                  <span className="flex items-center gap-2 text-xs font-semibold text-rose-400">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" /> Connection Issue
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                    {isLive ? 'Live System' : 'Offline Mode'}
                  </span>
                )}
              </div>

              {/* Filter Mode Switcher */}
              <div className="flex bg-slate-950/80 p-1 rounded-2xl border border-slate-800/80 text-xs font-semibold">
                {['day', 'month', 'year'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFilterMode(mode)}
                    className={`px-4 py-2 rounded-xl transition-all duration-200 capitalize ${
                      filterMode === mode
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`}
                  >
                    {mode === 'day' ? 'วัน' : mode === 'month' ? 'เดือน' : 'ปี'}
                  </button>
                ))}
              </div>

              {/* Date Input Field */}
              <div className="relative min-w-[150px] flex-1 sm:flex-none">
                <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                {filterMode === 'day' && (
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-2xl pl-10 pr-8 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                )}
                {filterMode === 'month' && (
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-2xl pl-10 pr-8 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                )}
                {filterMode === 'year' && (
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-2xl pl-10 pr-8 py-2.5 focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer appearance-none"
                  >
                    <option value="">ทุกปี (All Years)</option>
                    {availableYears.map((year) => (
                      <option key={year} value={year}>
                        {parseInt(year) + 543} ({year})
                      </option>
                    ))}
                  </select>
                )}
                {((filterMode === 'day' && selectedDate) ||
                  (filterMode === 'month' && selectedMonth) ||
                  (filterMode === 'year' && selectedYear)) && (
                  <button
                    onClick={() => {
                      setSelectedDate('');
                      setSelectedMonth('');
                      setSelectedYear('');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Hide Canceled Toggle */}
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-950/80 px-3.5 py-2.5 rounded-2xl border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={hideCanceled}
                  onChange={(e) => setHideCanceled(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500 bg-slate-900 w-3.5 h-3.5"
                />
                ซ่อนรายการยกเลิก
              </label>

              {/* Manual Refresh Button */}
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl hover:bg-slate-800 text-slate-300 hover:text-white transition-all disabled:opacity-50"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </header>

        {/* Date Zero Match Notification Banner */}
        {data.length > 0 &&
          displayData.length === 0 &&
          filterMode === 'day' &&
          selectedDate && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs backdrop-blur-md">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <span>
                  ไม่พบรายการออเดอร์ในวันที่ <strong>{selectedDate}</strong>
                  {latestAvailableDate && (
                    <> (ข้อมูลล่าสุดในระบบคือวันที่ <strong>{latestAvailableDate}</strong>)</>
                  )}
                </span>
              </div>
              {latestAvailableDate && (
                <button
                  onClick={() => setSelectedDate(latestAvailableDate)}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-1.5 rounded-xl transition-colors shrink-0 shadow-lg shadow-amber-500/20"
                >
                  เปิดดูวันที่ล่าสุด ({latestAvailableDate})
                </button>
              )}
            </div>
          )}

        {/* Top KPI Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KpiCard
            title="ยอดขายรวม"
            subtitle="Total Revenue"
            value={`฿${metrics.totalSales.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}`}
            icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
            accentColor="emerald"
            badgeText="ยอดขายสุทธิ"
          />
          <KpiCard
            title="ออเดอร์ทั้งหมด"
            subtitle="Total Orders"
            value={metrics.totalOrders.toLocaleString()}
            icon={<ShoppingCart className="w-5 h-5 text-indigo-400" />}
            accentColor="indigo"
            badgeText="คำสั่งซื้อ"
          />
          <KpiCard
            title="จำนวนสินค้าขายได้"
            subtitle="Total Items Sold"
            value={metrics.totalItems.toLocaleString()}
            icon={<Package className="w-5 h-5 text-purple-400" />}
            accentColor="purple"
            badgeText="ชิ้น"
          />
          <KpiCard
            title="ยอดเฉลี่ยต่อบิล"
            subtitle="Avg. Order Value"
            value={`฿${metrics.avgOrderValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            icon={<TrendingUp className="w-5 h-5 text-amber-400" />}
            accentColor="amber"
            badgeText="AOV"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Area Sales Trend Chart */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl shadow-xl lg:col-span-2 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  {chartTitle}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  การเติบโตและแนวโน้มรายรับตามช่วงเวลา
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
                Realtime Trend
              </span>
            </div>

            <div className="h-[320px] w-full">
              {chartsData.trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartsData.trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis
                      dataKey="time"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickFormatter={(value) => `฿${value}`}
                    />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-950/90 border border-slate-800 p-3 rounded-2xl shadow-2xl backdrop-blur-md">
                              <p className="text-xs text-slate-400 font-medium">{payload[0].payload.time}</p>
                              <p className="text-sm font-bold text-indigo-400 mt-1">
                                ฿{payload[0].value?.toLocaleString()}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#818cf8"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#salesGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                  <Filter className="w-8 h-8 opacity-40" />
                  <p className="text-xs">ไม่มีข้อมูลแนวโน้มยอดขายในช่วงนี้</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Method Pie Chart */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 p-6 rounded-3xl shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                สัดส่วนการชำระเงิน
              </h2>
            </div>

            <div className="h-[260px] w-full">
              {chartsData.paymentData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartsData.paymentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={6}
                      dataKey="value"
                    >
                      {chartsData.paymentData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            PAYMENT_COLORS[entry.name] ||
                            COLORS[index % COLORS.length]
                          }
                          stroke="#0f172a"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-950/90 border border-slate-800 p-2.5 rounded-xl shadow-xl backdrop-blur-md">
                              <p className="text-xs font-semibold text-white">{payload[0].name}</p>
                              <p className="text-xs text-indigo-400 font-bold mt-0.5">
                                {payload[0].value} รายการ
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      iconType="circle"
                      formatter={(value) => (
                        <span className="text-xs text-slate-300 font-medium px-1">
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                  ไม่มีข้อมูลชำระเงิน
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Table Container */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl">
          
          {/* Table Toolbar Header */}
          <div className="p-6 border-b border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                รายการออเดอร์ล่าสุด
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                พบทั้งหมด {displayData.length} รายการ
              </p>
            </div>

            {/* Search Input Box */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อลูกค้า, รหัสบิล, ที่อยู่..."
                className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-2xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={data.length === 0}
              />
            </div>
          </div>

          {/* Table Display */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800/80">
                <tr>
                  <th scope="col" className="px-6 py-4">เวลา</th>
                  <th scope="col" className="px-6 py-4">รหัสบิล</th>
                  <th scope="col" className="px-6 py-4">ลูกค้า & ที่อยู่</th>
                  <th scope="col" className="px-6 py-4">รายการสินค้า</th>
                  <th scope="col" className="px-6 py-4 text-right">ยอดรวม</th>
                  <th scope="col" className="px-6 py-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-slate-300">
                {loading && data.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-3">
                        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                        <p className="font-medium text-slate-300">กำลังเชื่อมต่อข้อมูลจาก Google Sheets...</p>
                      </div>
                    </td>
                  </tr>
                ) : displayData.length > 0 ? (
                  displayData.map((order, index) => {
                    const isCanceled =
                      (order.status || '').includes('ยกเลิก') ||
                      (order.status || '').toLowerCase().includes('cancel');

                    return (
                      <tr
                        key={order.billId || index}
                        className="hover:bg-slate-800/40 transition-colors duration-150"
                      >
                        <td className="px-6 py-4 font-mono text-slate-400 whitespace-nowrap">
                          {order.datetime?.split(' ')[1] || '-'}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-indigo-400 whitespace-nowrap">
                          #{order.billId}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-200">
                            {order.customer}
                          </div>
                          {order.address && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate max-w-xs">
                              <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                              {order.address}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-sm">
                            {(order.items || '').split('\n').map((item, i) => (
                              <span
                                key={i}
                                className="bg-slate-950/80 border border-slate-800 text-slate-300 px-2 py-0.5 rounded-lg text-[11px]"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-extrabold text-white text-sm whitespace-nowrap">
                          ฿{order.total?.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
                              isCanceled
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isCanceled ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'
                              }`}
                            />
                            {(order.status || '').replace(/[🔴🟢]/g, '').trim() || 'สำเร็จ'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center text-slate-400">
                      {error ? (
                        <div className="flex flex-col items-center gap-3 text-rose-400 max-w-md mx-auto">
                          <AlertCircle className="w-10 h-10" />
                          <p className="font-bold text-base">เกิดข้อผิดพลาดในการดึงข้อมูล</p>
                          <p className="text-xs text-slate-400">{error}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-500">
                          <Search className="w-8 h-8 opacity-40" />
                          <p>ไม่พบรายการข้อมูลตามเงื่อนไขที่เลือก</p>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

// Subcomponent: KPI Summary Card
function KpiCard({ title, subtitle, value, icon, accentColor, badgeText }) {
  const colorMap = {
    emerald: 'from-emerald-500/20 to-teal-500/5 border-emerald-500/30 text-emerald-400',
    indigo: 'from-indigo-500/20 to-violet-500/5 border-indigo-500/30 text-indigo-400',
    purple: 'from-purple-500/20 to-pink-500/5 border-purple-500/30 text-purple-400',
    amber: 'from-amber-500/20 to-orange-500/5 border-amber-500/30 text-amber-400',
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 p-5 rounded-3xl shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400">{title}</p>
          <h3 className="text-2xl font-black text-white mt-1 tracking-tight">{value}</h3>
        </div>
        <div className={`p-3 rounded-2xl bg-gradient-to-br ${colorMap[accentColor]} border shadow-md`}>
          {icon}
        </div>
      </div>
      
      <div className="mt-4 flex items-center justify-between text-[11px]">
        <span className="text-slate-500 font-medium">{subtitle}</span>
        <span className="text-slate-400 font-semibold flex items-center gap-0.5">
          {badgeText} <ArrowUpRight className="w-3 h-3 text-slate-500" />
        </span>
      </div>
    </div>
  );
}
