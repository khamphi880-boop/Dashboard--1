import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
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
  RefreshCw,
  Zap,
  Layers,
  Activity,
  Sun,
  X,
  ArrowUpRight,
} from 'lucide-react';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];

const PAYMENT_COLORS = {
  ไทยช่วยไทยพลัส: '#10B981', // Emerald 500
  โอนพร้อมเพย์: '#3B82F6',   // Blue 500
  เงินสด: '#F59E0B',         // Amber 500
  Unknown: '#64748B',
};

const monthNamesThai = [
  '', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

// 🧠 Bulletproof Universal Date & Time Parser
const parseDateTime = (datetimeString) => {
  if (!datetimeString) return null;
  let str = String(datetimeString).trim();
  if (!str) return null;

  let year = 0, month = 0, day = 0, hour = 0, minute = 0;

  // 1. ISO string with 'T' (e.g. 2026-08-05T10:30:00.000Z)
  if (str.includes('T')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      year = d.getFullYear();
      month = d.getMonth() + 1;
      day = d.getDate();
      hour = d.getHours();
      minute = d.getMinutes();
      if (year > 2400) year -= 543;
      return buildParsedResult(year, month, day, hour, minute);
    }
  }

  // 2. Separate date and time parts
  const parts = str.split(/\s+/);
  const dateStr = parts[0];
  const timeStr = parts[1] || '';

  if (timeStr && timeStr.includes(':')) {
    const tParts = timeStr.split(':');
    hour = parseInt(tParts[0], 10) || 0;
    minute = parseInt(tParts[1], 10) || 0;
  }

  if (dateStr.includes('-')) {
    const dParts = dateStr.split('-');
    if (dParts.length >= 3) {
      if (dParts[0].length === 4) { // YYYY-MM-DD
        year = parseInt(dParts[0], 10);
        month = parseInt(dParts[1], 10);
        day = parseInt(dParts[2], 10);
      } else { // DD-MM-YYYY
        day = parseInt(dParts[0], 10);
        month = parseInt(dParts[1], 10);
        year = parseInt(dParts[2], 10);
      }
    }
  } else if (dateStr.includes('/')) {
    const dParts = dateStr.split('/');
    if (dParts.length >= 3) {
      if (dParts[0].length === 4) { // YYYY/MM/DD
        year = parseInt(dParts[0], 10);
        month = parseInt(dParts[1], 10);
        day = parseInt(dParts[2], 10);
      } else { // DD/MM/YYYY or D/M/YYYY
        day = parseInt(dParts[0], 10);
        month = parseInt(dParts[1], 10);
        year = parseInt(dParts[2], 10);
      }
    }
  } else {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      year = d.getFullYear();
      month = d.getMonth() + 1;
      day = d.getDate();
      hour = d.getHours();
      minute = d.getMinutes();
    }
  }

  if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
    return null;
  }

  if (year > 2400) year -= 543;

  return buildParsedResult(year, month, day, hour, minute);
};

const buildParsedResult = (year, month, day, hour, minute) => {
  const yyyy = String(year);
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const min = String(minute).padStart(2, '0');

  return {
    isoDate: `${yyyy}-${mm}-${dd}`,                             // "2026-08-05" (Standard comparison)
    isoMonth: `${yyyy}-${mm}`,                                  // "2026-08"
    hourStr: `${hh}:00`,                                        // "10:00"
    timeStr: `${hh}:${min}`,                                    // "10:30"
    year,
    month,
    day,
    hour,
    yearBE: year + 543,
    shortYearBE: String(year + 543).slice(-2),
    displayShortBE: `${parseInt(dd, 10)} ${monthNamesThai[month]} ${String(year + 543).slice(-2)}`, // "5 ส.ค. 69"
    displayDayMonth: `${parseInt(dd, 10)} ${monthNamesThai[month]}`,                                // "5 ส.ค."
    displayMonthBE: `${monthNamesThai[month]} ${String(year + 543).slice(-2)}`                      // "ส.ค. 69"
  };
};

const formatDateForComparison = (datetimeString) => {
  const parsed = parseDateTime(datetimeString);
  return parsed ? parsed.isoDate : '';
};

const formatDateToBE = (datetimeString) => {
  const parsed = parseDateTime(datetimeString);
  if (!parsed) return datetimeString || '-';
  const timeFormatted = parsed.timeStr !== '00:00' ? ` ${parsed.timeStr}` : '';
  return `${String(parsed.day).padStart(2, '0')}/${String(parsed.month).padStart(2, '0')}/${parsed.yearBE}${timeFormatted}`;
};

// Normalize backend field names to match frontend UI expectations
const normalizeOrder = (raw) => {
  if (!raw || typeof raw !== 'object') return raw;
  
  return {
    ...raw,
    datetime: raw.datetime || raw.timestampStr || raw['วัน-เวลา'] || raw['เวลา'] || '',
    billId: raw.billId || raw.orderId || raw['รหัสบิล'] || raw['บิล'] || '',
    customer: raw.customer || raw.lineName || raw['ชื่อลูกค้า'] || raw['ลูกค้า'] || '',
    items: raw.items || raw.itemsSummary || raw['รายการสินค้า'] || raw['รายการ'] || '',
    total: parseFloat(raw.total || raw['ยอดรวม (บาท)'] || raw['ยอดรวม'] || 0) || 0,
    payment: raw.payment || raw.paymentMethod || raw['ช่องทางชำระ'] || raw['ชำระ'] || 'เงินสด',
    status: raw.status || raw['สถานะออเดอร์'] || raw['สถานะ'] || '',
    deliveryPoint: raw.deliveryPoint || raw.deliveryLocation || raw['จุดจัดส่ง'] || '',
    address: raw.address || raw['ที่อยู่จัดส่ง'] || raw['ที่อยู่'] || '',
    remark: raw.remark || raw.note || raw['หมายเหตุ'] || ''
  };
};

const getAvatarColor = (name = '') => {
  const colors = [
    'from-indigo-500 to-purple-500',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-500',
    'from-orange-500 to-amber-500',
    'from-pink-500 to-rose-500',
  ];
  let charCode = 0;
  for (let i = 0; i < name.length; i++) {
    charCode += name.charCodeAt(i);
  }
  return colors[charCode % colors.length];
};

export default function BeverageDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [filterMode, setFilterMode] = useState('year');
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
          throw new Error('404 Not Found - ลิงก์ API ไม่ถูกต้อง หรือถูกยกเลิกการ Deploy');
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
              const cleanHeader = String(header || '').trim();
              if (cleanHeader.includes('วัน-เวลา') || cleanHeader.includes('เวลา')) obj.datetime = row[index];
              else if (cleanHeader.includes('รหัสบิล') || cleanHeader.includes('บิล')) obj.billId = row[index];
              else if (cleanHeader.includes('ชื่อลูกค้า') || cleanHeader.includes('ลูกค้า')) obj.customer = row[index];
              else if (cleanHeader.includes('รายการ')) obj.items = row[index];
              else if (cleanHeader.includes('ยอดรวม')) obj.total = parseFloat(row[index]) || 0;
              else if (cleanHeader.includes('ช่องทางชำระ') || cleanHeader.includes('ชำระ')) obj.payment = row[index];
              else if (cleanHeader.includes('สถานะ')) obj.status = row[index];
              else if (cleanHeader.includes('จุดจัดส่ง')) obj.deliveryPoint = row[index];
              else if (cleanHeader.includes('ที่อยู่')) obj.address = row[index];
              else if (cleanHeader.includes('หมายเหตุ')) obj.remark = row[index];
              else obj[cleanHeader] = row[index];
            });
            return normalizeOrder(obj);
          });
          setData(mappedData);
          setIsLive(true);
        } else {
          const normalizedData = parsedData.map(normalizeOrder);
          setData(normalizedData);
          setIsLive(true);
        }
      } else {
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

  useEffect(() => {
    if (data.length > 0 && !selectedYear) {
      const years = data
        .map((item) => formatDateForComparison(item.datetime).split('-')[0])
        .filter(Boolean)
        .sort();
      if (years.length > 0) {
        const latestYear = years[years.length - 1];
        setSelectedYear(latestYear);
      }
    }
  }, [data, selectedYear]);

  const availableYears = useMemo(() => {
    const years = new Set(
      data
        .map((item) => formatDateForComparison(item.datetime).split('-')[0])
        .filter(Boolean)
    );
    if (selectedYear) years.add(selectedYear);
    return Array.from(years).sort().reverse();
  }, [data, selectedYear]);

  const latestAvailableDate = useMemo(() => {
    if (!data || data.length === 0) return '';
    const dates = data
      .map((item) => formatDateForComparison(item.datetime))
      .filter(Boolean)
      .sort();
    return dates.length > 0 ? dates[dates.length - 1] : '';
  }, [data]);

  const todayMetrics = useMemo(() => {
    const now = new Date();
    const yCE = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayIso = `${yCE}-${m}-${d}`;

    const getOrdersForIsoDate = (isoDate) => {
      return data.filter((item) => {
        const status = item.status || '';
        const isCanceled = status.includes('ยกเลิก') || status.toLowerCase().includes('cancel');
        if (hideCanceled && isCanceled) return false;

        const dt = String(item.datetime || '').trim();
        if (!dt) return false;

        return formatDateForComparison(dt) === isoDate;
      });
    };

    let targetIso = todayIso;
    let isFallbackToLatest = false;
    let todayOrders = getOrdersForIsoDate(todayIso);

    if (todayOrders.length === 0 && latestAvailableDate) {
      targetIso = latestAvailableDate;
      todayOrders = getOrdersForIsoDate(latestAvailableDate);
      isFallbackToLatest = true;
    }

    const todaySales = todayOrders.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    return { 
      todaySales, 
      todayCount: todayOrders.length,
      targetIso,
      isFallbackToLatest
    };
  }, [data, hideCanceled, latestAvailableDate]);

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
      const itemsStr = order.items || '';
      if (itemsStr) {
        const lines = String(itemsStr).split(/\n|,/);
        lines.forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed) return;
          const match = trimmed.match(/^(\d+)\s*x/i) || trimmed.match(/x\s*(\d+)/i);
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

  // 📈 100% Chronological & Accurate Chart Generator
  const chartsData = useMemo(() => {
    const paymentMap = {};
    displayData.forEach((item) => {
      const pm = item.payment || 'เงินสด';
      paymentMap[pm] = (paymentMap[pm] || 0) + 1;
    });
    const paymentData = Object.keys(paymentMap).map((key) => ({
      name: key,
      value: paymentMap[key],
    }));

    const trendMap = {};

    displayData.forEach((item) => {
      if (!item.datetime) return;
      const parsed = parseDateTime(item.datetime);
      if (!parsed) return;

      let sortKey = '';
      let displayKey = '';

      if (filterMode === 'day' && selectedDate) {
        // 🕒 รายชั่วโมง (เรียงจาก 00:00 -> 23:00)
        sortKey = String(parsed.hour).padStart(2, '0');
        displayKey = parsed.hourStr;
      } else if (filterMode === 'year' && selectedYear) {
        // 🗓️ รายเดือน (เรียงจาก YYYY-01 -> YYYY-12)
        sortKey = parsed.isoMonth;
        displayKey = parsed.displayMonthBE;
      } else if (filterMode === 'month' && selectedMonth) {
        // 📅 รายวันในเดือน (เรียงจาก YYYY-MM-01 -> YYYY-MM-31)
        sortKey = parsed.isoDate;
        displayKey = parsed.displayDayMonth;
      } else {
        // 📆 รายวันทั่วไป (แสดงปีพ.ศ.กำกับ ป้องกันวันซ้ำข้ามปี)
        sortKey = parsed.isoDate;
        displayKey = parsed.displayShortBE;
      }

      if (!trendMap[sortKey]) {
        trendMap[sortKey] = { time: displayKey, sales: 0 };
      }
      trendMap[sortKey].sales += parseFloat(item.total) || 0;
    });

    // ✨ จัดเรียงคีย์ ISO ลำดับเวลาจากอดีตไปปัจจุบัน 100%
    const trendData = Object.keys(trendMap)
      .sort()
      .map((key) => trendMap[key]);

    return { paymentData, trendData };
  }, [displayData, filterMode, selectedDate, selectedMonth, selectedYear]);

  let chartTitle = 'แนวโน้มยอดขายรายวัน (Daily Sales Trend)';
  if (filterMode === 'day' && selectedDate)
    chartTitle = `แนวโน้มยอดขายรายชั่วโมง (วันที่ ${formatDateToBE(selectedDate)})`;
  if (filterMode === 'year' && selectedYear)
    chartTitle = `แนวโน้มยอดขายรายเดือน (ประจำปี พ.ศ. ${parseInt(selectedYear) + 543})`;

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white p-4 sm:p-6 lg:p-8">
      {/* Background Glow Overlay */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[128px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* HEADER SECTION */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-800/80 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight text-white font-sans">
                  DRINKHUB <span className="bg-gradient-to-r from-indigo-400 to-emerald-400 bg-clip-text text-transparent">PRO</span>
                </h1>
                <span className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
                  Enterprise
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-slate-400 text-xs font-medium">
                  Real-time beverage analytics & revenue engine {selectedYear ? `(พ.ศ. ${parseInt(selectedYear) + 543})` : ''}
                </p>
                {loading ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Syncing...
                  </span>
                ) : error ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
                    <AlertCircle className="w-3 h-3" /> API Error
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> {isLive ? 'Live Engine' : 'Offline'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* CONTROLS */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Segmented Period Tabs */}
            <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 shadow-inner">
              {['day', 'month', 'year'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 capitalize ${
                    filterMode === mode
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/25'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {mode === 'day' ? 'รายวัน' : mode === 'month' ? 'รายเดือน' : 'รายปี'}
                </button>
              ))}
            </div>

            {/* Date Inputs */}
            <div className="relative flex-1 sm:flex-none min-w-[150px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Calendar className="w-4 h-4" />
              </div>
              {filterMode === 'day' && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                />
              )}
              {filterMode === 'month' && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                />
              )}
              {filterMode === 'year' && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer font-mono"
                >
                  <option value="">ทั้งหมด (All Years)</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      พ.ศ. {parseInt(year) + 543} ({year})
                    </option>
                  ))}
                </select>
              )}
              {((filterMode === 'day' && selectedDate) ||
                (filterMode === 'month' && selectedMonth) ||
                (filterMode === 'year' && selectedYear)) && (
                <button
                  onClick={() => {
                    if (filterMode === 'day') setSelectedDate('');
                    if (filterMode === 'month') setSelectedMonth('');
                    if (filterMode === 'year') setSelectedYear('');
                  }}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Toggle Canceled */}
            <label className="flex items-center gap-2 cursor-pointer bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800/80 text-xs font-medium text-slate-300 hover:border-slate-700 transition-all">
              <input
                type="checkbox"
                checked={hideCanceled}
                onChange={(e) => setHideCanceled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600 relative"></div>
              <span>ซ่อนรายการยกเลิก</span>
            </label>

            {/* Refresh Button */}
            <button 
              onClick={fetchData}
              className="p-2 bg-slate-950/80 border border-slate-800/80 rounded-xl text-slate-400 hover:text-white hover:border-slate-700 transition-all shadow-sm"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* NOTIFICATION BANNER */}
        {data.length > 0 && displayData.length === 0 && filterMode === 'day' && selectedDate && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-amber-300 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                ไม่พบบันทึกรายการสำหรับวันที่ <strong className="text-white font-mono">{formatDateToBE(selectedDate)}</strong>
                {latestAvailableDate && (
                  <> (ข้อมูลล่าสุดในระบบคือวันที่ <strong className="text-amber-200 font-mono">{formatDateToBE(latestAvailableDate)}</strong>)</>
                )}
              </span>
            </div>
            {latestAvailableDate && (
              <button
                onClick={() => setSelectedDate(latestAvailableDate)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors shrink-0 shadow-md flex items-center gap-1"
              >
                สลับไปวันที่ล่าสุด <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* METRICS GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <KpiCard
            title={todayMetrics.isFallbackToLatest ? `ยอดขายวันล่าสุด (${formatDateToBE(todayMetrics.targetIso)})` : "ยอดขายวันนี้ (Today)"}
            value={`฿${todayMetrics.todaySales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={<Sun className="w-6 h-6 text-amber-400" />}
            glow="bg-amber-500"
            gradient="from-amber-500/20 to-orange-500/10"
            badge="Daily"
          />
          <KpiCard
            title="ยอดขายรวม (Total Revenue)"
            value={`฿${metrics.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={<DollarSign className="w-6 h-6 text-emerald-400" />}
            glow="bg-emerald-500"
            gradient="from-emerald-500/20 to-teal-500/10"
            badge="Revenue"
          />
          <KpiCard
            title="ออเดอร์ทั้งหมด (Total Orders)"
            value={metrics.totalOrders.toLocaleString()}
            icon={<ShoppingCart className="w-6 h-6 text-indigo-400" />}
            glow="bg-indigo-500"
            gradient="from-indigo-500/20 to-purple-500/10"
            badge="Volume"
          />
          <KpiCard
            title="แก้ว/สินค้าขายได้ (Total Items)"
            value={metrics.totalItems.toLocaleString()}
            icon={<Package className="w-6 h-6 text-purple-400" />}
            glow="bg-purple-500"
            gradient="from-purple-500/20 to-pink-500/10"
            badge="Units"
          />
          <KpiCard
            title="ยอดเฉลี่ยต่อบิล (Avg. Ticket)"
            value={`฿${metrics.avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={<TrendingUp className="w-6 h-6 text-cyan-400" />}
            glow="bg-cyan-500"
            gradient="from-cyan-500/20 to-blue-500/10"
            badge="Avg/Bill"
          />
        </div>

        {/* CHARTS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Area Chart */}
          <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-800/80 shadow-2xl lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  {chartTitle}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">ภาพรวมแนวโน้มรายได้ตามช่วงเวลา</p>
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              {chartsData.trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartsData.trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} tickFormatter={(val) => `฿${val}`} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#6366F1"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#salesGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                  <Layers className="w-8 h-8 mb-2 opacity-40" />
                  ไม่มีข้อมูลสำหรับแสดงผลกราฟในเลือกช่วงเวลานี้
                </div>
              )}
            </div>
          </div>

          {/* Donut Payment Chart */}
          <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-800/80 shadow-2xl flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                ช่องทางชำระเงิน (Payments)
              </h2>
              <p className="text-xs text-slate-400">สัดส่วนการชำระเงินของลูกค้า</p>
            </div>

            <div className="h-[200px] w-full my-2 relative flex items-center justify-center">
              {chartsData.paymentData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartsData.paymentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={6}
                      dataKey="value"
                    >
                      {chartsData.paymentData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PAYMENT_COLORS[entry.name] || COLORS[index % COLORS.length]}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-slate-500 text-xs">ไม่มีข้อมูล</div>
              )}
            </div>

            {/* Custom Payment Legend */}
            <div className="space-y-2">
              {chartsData.paymentData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-slate-950/40 px-3 py-1.5 rounded-xl border border-slate-800/50">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: PAYMENT_COLORS[item.name] || COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-slate-300 font-medium">{item.name}</span>
                  </div>
                  <span className="font-mono font-bold text-white">{item.value} บิล</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ORDERS TABLE SECTION */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-800/80 shadow-2xl overflow-hidden">
          
          <div className="p-6 border-b border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                รายการออเดอร์ล่าสุด (Live Transactions)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">แสดง {displayData.length} รายการที่ตรงตามเงื่อนไข</p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="ค้นหาชื่อลูกค้า, รหัสบิล, ที่อยู่..."
                className="w-full bg-slate-950/90 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th scope="col" className="px-6 py-4">วัน-เวลา (Time)</th>
                  <th scope="col" className="px-6 py-4">รหัสบิล (Bill ID)</th>
                  <th scope="col" className="px-6 py-4">ลูกค้า (Customer)</th>
                  <th scope="col" className="px-6 py-4">รายการสินค้า (Items)</th>
                  <th scope="col" className="px-6 py-4 text-right">ยอดรวม (Total)</th>
                  <th scope="col" className="px-6 py-4 text-center">สถานะ (Status)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs">
                {loading && data.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                        <span>กำลังเชื่อมต่อฐานข้อมูล...</span>
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
                        className="hover:bg-slate-800/30 transition-colors group"
                      >
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-400">
                          {formatDateToBE(order.datetime)}
                        </td>
                        <td className="px-6 py-4 font-mono font-medium text-indigo-400">
                          #{order.billId}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${getAvatarColor(order.customer)} flex items-center justify-center font-bold text-white shadow-md`}>
                              {order.customer ? order.customer.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-200">{order.customer || 'ลูกค้าทั่วไป'}</p>
                              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-600" /> {order.address || 'รับที่ร้าน'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {String(order.items || '-').split(/\n|,/).map((item, i) => (
                              <span
                                key={i}
                                className="bg-slate-950/80 border border-slate-800 text-slate-300 text-[11px] px-2 py-0.5 rounded-md truncate max-w-[200px]"
                                title={item.trim()}
                              >
                                {item.trim()}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-emerald-400 text-sm">
                          ฿{parseFloat(order.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border shadow-sm ${
                              isCanceled
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-rose-500/10'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10'
                            }`}
                          >
                            {isCanceled ? (
                              <AlertCircle className="w-3 h-3" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            {(order.status || '').replace(/[🔴🟢]/g, '').trim() || 'สำเร็จ'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                      ไม่พบข้อมูลรายการออเดอร์ตามเงื่อนไขที่เลือก
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

// KPI CARD COMPONENT WITH AMBIENT GLOW
function KpiCard({ title, value, icon, glow, gradient, badge }) {
  return (
    <div className="relative group overflow-hidden bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-800/80 hover:border-slate-700/80 transition-all duration-300 shadow-xl">
      {/* Background Ambient Glow */}
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-15 transition-opacity group-hover:opacity-30 ${glow}`} />
      
      <div className="flex justify-between items-start relative z-10">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded-md border border-slate-800">
            {badge}
          </span>
          <p className="text-xs font-medium text-slate-400 mt-3 mb-1">{title}</p>
          <h3 className="text-2xl font-black tracking-tight text-white font-mono">
            {value}
          </h3>
        </div>
        <div className={`p-3 rounded-2xl bg-gradient-to-br ${gradient} border border-white/10 shadow-lg`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// CUSTOM TOOLTIP FOR AREA CHART
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 p-3 rounded-2xl shadow-2xl font-mono">
        <p className="text-[11px] text-slate-400 mb-1">{label}</p>
        <p className="text-sm font-bold text-indigo-400">
          ฿{Number(payload[0].value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
};

// CUSTOM TOOLTIP FOR PIE CHART
const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 px-3 py-2 rounded-xl shadow-2xl text-xs">
        <p className="font-semibold text-white">{payload[0].name}</p>
        <p className="text-slate-400 font-mono mt-0.5">{payload[0].value} บิล</p>
      </div>
    );
  }
  return null;
};
