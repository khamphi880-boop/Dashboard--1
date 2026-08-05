import React, { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  ShoppingCart, DollarSign, TrendingUp, Package, AlertCircle, 
  MapPin, CreditCard, CheckCircle2, Calendar, Sun, Search, 
  Sparkles, RefreshCw, Filter, Layers, ArrowUpRight, X
} from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
const PAYMENT_COLORS = {
  "ไทยช่วยไทยพลัส": "#10b981",
  "โอนพร้อมเพย์": "#6366f1",
  "เงินสด": "#f59e0b"
};

// Normalize backend field names to match frontend UI expectations
const normalizeOrder = (raw) => {
  if (!raw || typeof raw !== 'object') return raw;
  
  return {
    ...raw,
    datetime: raw.datetime || raw.timestampStr || raw['วัน-เวลา'] || raw['เวลา'] || '',
    billId: raw.billId || raw.orderId || raw['รหัสบิล'] || '',
    customer: raw.customer || raw.lineName || raw['ชื่อลูกค้า'] || '',
    items: raw.items || raw.itemsSummary || raw['รายการสินค้า'] || raw['รายการ'] || '',
    total: parseFloat(raw.total || raw['ยอดรวม (บาท)'] || raw['ยอดรวม'] || 0) || 0,
    payment: raw.payment || raw.paymentMethod || raw['ช่องทางชำระ'] || '',
    status: raw.status || raw['สถานะออเดอร์'] || raw['สถานะ'] || '',
    deliveryPoint: raw.deliveryPoint || raw.deliveryLocation || raw['จุดจัดส่ง'] || '',
    address: raw.address || raw['ที่อยู่จัดส่ง'] || raw['ที่อยู่'] || '',
    remark: raw.remark || raw.note || raw['หมายเหตุ'] || ''
  };
};

const formatDateForComparison = (datetimeString) => {
  if (!datetimeString) return "";
  try {
    let str = String(datetimeString).trim();

    if (str.includes('T')) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        let y = d.getFullYear();
        if (y > 2400) y -= 543;
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    }

    const dateOnly = str.split(' ')[0].trim();

    if (dateOnly.includes('/')) {
      const parts = dateOnly.split('/');
      if (parts.length >= 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        let year = parseInt(parts[2], 10);

        if (isNaN(day) || isNaN(month) || isNaN(year)) return "";
        if (year > 2400) year -= 543;

        const formattedMonth = String(month).padStart(2, '0');
        const formattedDay = String(day).padStart(2, '0');
        return `${year}-${formattedMonth}-${formattedDay}`;
      }
    }

    if (dateOnly.includes('-')) {
      const parts = dateOnly.split('-');
      if (parts.length >= 3) {
        if (parts[0].length === 4) {
          let year = parseInt(parts[0], 10);
          if (year > 2400) year -= 543;
          const month = String(parseInt(parts[1], 10)).padStart(2, '0');
          const day = String(parseInt(parts[2], 10)).padStart(2, '0'); 
          return `${year}-${month}-${day}`;
        } else {
          let year = parseInt(parts[2], 10);
          if (year > 2400) year -= 543;
          const month = String(parseInt(parts[1], 10)).padStart(2, '0');
          const day = String(parseInt(parts[0], 10)).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      }
    }

    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      let y = d.getFullYear();
      if (y > 2400) y -= 543;
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    return "";
  } catch (e) {
    return "";
  }
};

const formatDateToBE = (datetimeString) => {
  if (!datetimeString) return '-';
  try {
    let str = String(datetimeString).trim();
    let timePart = '';

    if (str.includes(' ')) {
      const parts = str.split(' ');
      str = parts[0];
      timePart = parts.slice(1).join(' ');
    } else if (str.includes('T')) {
      const parts = str.split('T');
      str = parts[0];
      timePart = parts[1].split('.')[0];
    }

    let year, month, day;

    if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length >= 3) {
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
        year = parseInt(parts[2], 10);
      }
    } else if (str.includes('-')) {
      const parts = str.split('-');
      if (parts.length >= 3) {
        if (parts[0].length === 4) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          day = parseInt(parts[2], 10);
        } else {
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          year = parseInt(parts[2], 10);
        }
      }
    }

    if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
      return datetimeString;
    }

    if (year < 2400) {
      year += 543;
    }

    const dd = String(day).padStart(2, '0');
    const mm = String(month).padStart(2, '0');
    const yyyy = String(year);

    return timePart ? `${dd}/${mm}/${yyyy} ${timePart}` : `${dd}/${mm}/${yyyy}`;
  } catch (e) {
    return datetimeString;
  }
};

// Custom Glassmorphic Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 backdrop-blur-md text-white border border-slate-700/50 p-3.5 rounded-xl shadow-2xl space-y-1">
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-base font-bold text-indigo-400">
          ฿{Number(payload[0].value).toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
      </div>
    );
  }
  return null;
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

  const DATA_URL = "https://script.google.com/macros/s/AKfycbzcNRoFsQ2gkzcLQ21qQdYx1VR8S0m1xMj3hN2TJFkp2Dx2e7wrVc9MInQtssJEgeL0/exec";

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(DATA_URL);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("404 Not Found - ลิงก์ API ไม่ถูกต้อง หรือถูกยกเลิกการ Deploy ไปแล้ว");
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
           const mappedData = parsedData.slice(1).map(row => {
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
         setError("ไม่พบข้อมูลจากระบบ (Empty Data)");
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setData([]); 
      setIsLive(false); 
      setError(err.message || "ไม่สามารถดึงข้อมูลได้ (Connection Error)");
    } font-sans
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (data.length > 0 && !selectedYear) {
      const years = data
        .map(item => formatDateForComparison(item.datetime).split('-')[0])
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
      data.map(item => formatDateForComparison(item.datetime).split('-')[0]).filter(Boolean)
    );
    if (selectedYear) {
      years.add(selectedYear);
    }
    return Array.from(years).sort().reverse();
  }, [data, selectedYear]);

  const latestAvailableDate = useMemo(() => {
    if (!data || data.length === 0) return '';
    const dates = data
      .map(item => formatDateForComparison(item.datetime))
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
      return data.filter(item => {
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
      const [sY, sM, sD] = selectedDate.split('-');
      const sY_BE = parseInt(sY, 10) + 543;
      const dNum = parseInt(sD, 10);
      const mNum = parseInt(sM, 10);

      filtered = filtered.filter(item => {
        const dt = String(item.datetime || '').trim();
        if (!dt) return false;

        const parsed = formatDateForComparison(dt);
        if (parsed === selectedDate) return true;

        const patterns = [
          `${dNum}/${mNum}/${sY_BE}`,
          `${sD}/${sM}/${sY_BE}`,
          `${dNum}/${mNum}/${sY}`,
          `${sD}/${sM}/${sY}`
        ];
        return patterns.some(p => dt.includes(p));
      });
    } else if (filterMode === 'month' && selectedMonth) {
      filtered = filtered.filter(item => formatDateForComparison(item.datetime).startsWith(selectedMonth));
    } else if (filterMode === 'year' && selectedYear) {
      filtered = filtered.filter(item => formatDateForComparison(item.datetime).startsWith(selectedYear));
    }

    if (searchTerm) {
       const lowerCaseSearch = searchTerm.toLowerCase();
       filtered = filtered.filter(item => 
        (item.customer?.toLowerCase() || '').includes(lowerCaseSearch) ||
        (item.billId?.toLowerCase() || '').includes(lowerCaseSearch) ||
        (item.address?.toLowerCase() || '').includes(lowerCaseSearch)
      );
    }
    
    if (hideCanceled) {
      filtered = filtered.filter(item => {
        const status = item.status || '';
        return !status.includes('ยกเลิก') && !status.toLowerCase().includes('cancel');
      });
    }
    
    return filtered;
  }, [data, searchTerm, selectedDate, selectedMonth, selectedYear, hideCanceled, filterMode]);

  const metrics = useMemo(() => {
    const totalSales = displayData.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
    const totalOrders = displayData.length;
    const avgOrderValue = totalOrders > 0 ? (totalSales / totalOrders) : 0;
    
    let totalItems = 0;
    displayData.forEach(order => {
      const itemsStr = order.items || order['รายการสินค้า'] || order['รายการ'] || '';
      if (itemsStr) {
        const lines = String(itemsStr).split(/\n|,/);
        lines.forEach(line => {
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

  const chartsData = useMemo(() => {
    const paymentMap = {};
    displayData.forEach(item => {
      const pm = item.payment || 'ไม่ระบุ';
      paymentMap[pm] = (paymentMap[pm] || 0) + 1;
    });
    const paymentData = Object.keys(paymentMap).map(key => ({ name: key, value: paymentMap[key] }));

    const trendMap = {};
    const isHourlyMode = filterMode === 'day' && selectedDate;

    displayData.forEach(item => {
      if (item.datetime) {
        const dateFormatted = formatDateForComparison(item.datetime);
        if (!dateFormatted) return;

        let sortKey = '';
        let displayKey = '';

        if (isHourlyMode) {
          let timeStr = '';
          const rawDt = String(item.datetime);
          if (rawDt.includes('T')) {
            const d = new Date(rawDt);
            if (!isNaN(d.getTime())) {
              timeStr = String(d.getHours()).padStart(2, '0');
            }
          } else if (rawDt.includes(' ')) {
            timeStr = rawDt.split(' ')[1].split(':')[0];
          }

          if (timeStr) {
            sortKey = timeStr.padStart(2, '0');
            displayKey = sortKey + ":00";
          }
        } else if (filterMode === 'year' && selectedYear) {
          sortKey = dateFormatted.substring(0, 7);
          const [yyyy, mm] = dateFormatted.split('-');
          const monthNames = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
          const yearBE = parseInt(yyyy, 10) + 543;
          displayKey = `${monthNames[parseInt(mm, 10)]} ${yearBE.toString().slice(-2)}`;
        } else {
          sortKey = dateFormatted;
          const [yyyy, mm, dd] = dateFormatted.split('-');
          const monthNames = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
          displayKey = `${parseInt(dd, 10)} ${monthNames[parseInt(mm, 10)]}`;
        }

        if (sortKey) {
          if (!trendMap[sortKey]) {
            trendMap[sortKey] = { time: displayKey, sales: 0 };
          }
          trendMap[sortKey].sales += (parseFloat(item.total) || 0);
        }
      }
    });
    const trendData = Object.keys(trendMap).sort().map(key => trendMap[key]);

    return { paymentData, trendData };
  }, [displayData, filterMode, selectedDate, selectedYear]);

  let chartTitle = "แนวโน้มยอดขายรายวัน (Daily Revenue)";
  if (filterMode === 'day' && selectedDate) chartTitle = `แนวโน้มยอดขายรายชั่วโมง (วันที่ ${formatDateToBE(selectedDate)})`;
  if (filterMode === 'year' && selectedYear) chartTitle = `แนวโน้มยอดขายรายเดือน (ประจำปี พ.ศ. ${parseInt(selectedYear) + 543})`;

  const currentYearBE = selectedYear ? parseInt(selectedYear) + 543 : '';

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 p-4 sm:p-6 md:p-10 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute top-[30%] -right-[10%] w-[40%] h-[40%] rounded-full bg-emerald-600/10 blur-[140px]" />
      </div>

      <div className="max-w-[1550px] mx-auto space-y-8">
        
        {/* Top Navigation / Executive Bar */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-800/80 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[1px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center text-2xl">
                🥤
              </div>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  Beverage Analytics
                </h1>
                <span className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs px-2.5 py-0.5 rounded-full font-semibold tracking-wide uppercase">
                  Enterprise
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-slate-400 text-sm">
                <span>สรุปยอดขาย Real-time {currentYearBE ? `(ปี พ.ศ. ${currentYearBE})` : ''}</span>
                <span className="text-slate-700">•</span>
                
                {loading ? (
                  <span className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                    <RefreshCw size={13} className="animate-spin" /> Syncing...
                  </span>
                ) : error ? (
                  <span className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                    <AlertCircle size={13} /> Connection Error
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    Live Data Active
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Controls & Filter Bar */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Filter Mode Selector */}
            <div className="bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 flex items-center shadow-inner">
              {['day', 'month', 'year'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-300 ${
                    filterMode === mode
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode === 'day' ? 'รายวัน' : mode === 'month' ? 'รายเดือน' : 'รายปี'}
                </button>
              ))}
            </div>

            {/* Date Selector Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Calendar size={16} />
              </div>

              {filterMode === 'day' && (
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent block w-full pl-10 pr-9 py-2.5 shadow-sm transition-all focus:outline-none"
                />
              )}

              {filterMode === 'month' && (
                <input 
                  type="month" 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent block w-full pl-10 pr-9 py-2.5 shadow-sm transition-all focus:outline-none"
                />
              )}

              {filterMode === 'year' && (
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent block w-full pl-10 pr-9 py-2.5 shadow-sm transition-all appearance-none cursor-pointer font-medium focus:outline-none min-w-[140px]"
                >
                  <option value="">เลือกปี (ทั้งหมด)</option>
                  {availableYears.map(year => (
                    <option key={year} value={year} className="bg-slate-900 text-white">
                      พ.ศ. {parseInt(year) + 543}
                    </option>
                  ))}
                </select>
              )}

              {((filterMode === 'day' && selectedDate) || 
                (filterMode === 'month' && selectedMonth) || 
                (filterMode === 'year' && selectedYear)) && (
                <button 
                  onClick={() => {
                    if(filterMode === 'day') setSelectedDate('');
                    if(filterMode === 'month') setSelectedMonth('');
                    if(filterMode === 'year') setSelectedYear('');
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Hide Canceled Toggle */}
            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer bg-slate-950/80 px-4 py-2.5 rounded-2xl border border-slate-800 shadow-sm hover:border-slate-700 transition-all select-none">
              <input 
                type="checkbox" 
                checked={hideCanceled} 
                onChange={(e) => setHideCanceled(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-950 w-4 h-4 cursor-pointer"
              />
              ซ่อนออเดอร์ยกเลิก
            </label>

            {/* Sync Button */}
            <button 
              onClick={fetchData}
              className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-slate-400 hover:text-white hover:border-slate-700 transition-all shadow-sm"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {/* System Notification Banner */}
        {data.length > 0 && displayData.length === 0 && filterMode === 'day' && selectedDate && (
          <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 text-amber-300 flex items-center justify-between text-xs shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-3">
              <AlertCircle size={18} className="text-amber-400 shrink-0" />
              <span>
                ไม่พบข้อมูลในวันที่ <strong className="text-amber-200">{formatDateToBE(selectedDate)}</strong>
                {latestAvailableDate && (
                  <> (ข้อมูลล่าสุดในระบบคือวันที่ <strong className="text-amber-200">{formatDateToBE(latestAvailableDate)}</strong>)</>
                )}
              </span>
            </div>
            {latestAvailableDate && (
              <button 
                onClick={() => setSelectedDate(latestAvailableDate)}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-medium px-3.5 py-1.5 rounded-xl border border-amber-500/30 transition-all shrink-0 flex items-center gap-1.5"
              >
                สลับไปวันที่ล่าสุด <ArrowUpRight size={14} />
              </button>
            )}
          </div>
        )}

        {/* Key Metrics Cards (Executive KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          
          <LuxuryKpiCard 
            title={todayMetrics.isFallbackToLatest ? `ยอดขายวันล่าสุด (${formatDateToBE(todayMetrics.targetIso)})` : "ยอดขายวันนี้ (Today)"} 
            value={`฿${todayMetrics.todaySales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
            icon={<Sun size={22} className="text-amber-400" />}
            subtitle={`${todayMetrics.todayCount} รายการสั่งซื้อ`}
            highlight={true}
          />

          <LuxuryKpiCard 
            title="ยอดขายรวม (Total Revenue)" 
            value={`฿${metrics.totalSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
            icon={<DollarSign size={22} className="text-emerald-400" />}
            subtitle={filterMode === 'year' && selectedYear ? `ประจำปี พ.ศ. ${parseInt(selectedYear) + 543}` : selectedDate ? `วันที่ ${formatDateToBE(selectedDate)}` : "ช่วงเวลาที่เลือกทั้งหมด"}
          />

          <LuxuryKpiCard 
            title="ออเดอร์ทั้งหมด (Orders)" 
            value={metrics.totalOrders.toLocaleString()} 
            icon={<ShoppingCart size={22} className="text-indigo-400" />}
            subtitle="รายการบิลสำเร็จ"
          />

          <LuxuryKpiCard 
            title="จำนวนแก้ว/สินค้า (Items)" 
            value={metrics.totalItems.toLocaleString()} 
            icon={<Package size={22} className="text-purple-400" />}
            subtitle="จำนวนชิ้นทั้งหมด"
          />

          <LuxuryKpiCard 
            title="ยอดเฉลี่ย/บิล (Avg. Bill)" 
            value={`฿${metrics.avgOrderValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
            icon={<TrendingUp size={22} className="text-cyan-400" />}
            subtitle="Average Order Value"
          />
        </div>

        {/* Analytics Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Area Chart (Sales Trend) */}
          <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-800/80 shadow-2xl lg:col-span-2 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Sparkles size={18} className="text-indigo-400" />
                  {chartTitle}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">กราฟแสดงการเติบโตและสถิติตามช่วงเวลา</p>
              </div>
            </div>

            <div className="h-[320px] w-full">
              {chartsData.trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartsData.trendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 11}} tickFormatter={(val) => `฿${val}`} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#818cf8" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorSales)" 
                      activeDot={{ r: 6, fill: '#818cf8', stroke: '#fff', strokeWidth: 2 }} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2">
                  <Layers size={32} strokeWidth={1.5} />
                  <span className="text-xs">ไม่มีข้อมูลกราฟในช่วงเวลานี้</span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Method Pie Chart */}
          <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-800/80 shadow-2xl flex flex-col justify-between">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-1">
                <CreditCard size={18} className="text-emerald-400" /> สัดส่วนการชำระเงิน
              </h2>
              <p className="text-xs text-slate-400">แยกตามประเภท Payment Channels</p>
            </div>

            <div className="h-[250px] w-full relative flex items-center justify-center my-4">
              {chartsData.paymentData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartsData.paymentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={6}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartsData.paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle"
                      formatter={(value) => <span className="text-xs text-slate-300 font-medium">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                  ไม่มีข้อมูลสัดส่วน
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Executive Data Table Section */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-800/80 shadow-2xl overflow-hidden">
          
          {/* Table Header Controls */}
          <div className="p-6 border-b border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                รายการสั่งซื้อทั้งหมด
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedYear ? `ข้อมูลประจำปี พ.ศ. ${parseInt(selectedYear) + 543}` : 'แสดงข้อมูลรายการบิลย้อนหลัง'}
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <input 
                type="text" 
                placeholder="ค้นหาชื่อลูกค้า, รหัสบิล, ที่อยู่..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={data.length === 0}
              />
              <Search size={16} className="text-slate-500 absolute left-3.5 top-3" />
            </div>
          </div>
          
          {/* Main Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-950/60 uppercase text-[11px] font-semibold text-slate-400 border-b border-slate-800/80 tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-4">วัน-เวลา</th>
                  <th scope="col" className="px-6 py-4">รหัสบิล</th>
                  <th scope="col" className="px-6 py-4">ลูกค้า & ที่อยู่</th>
                  <th scope="col" className="px-6 py-4">รายการสินค้า</th>
                  <th scope="col" className="px-6 py-4 text-right">ยอดรวม</th>
                  <th scope="col" className="px-6 py-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading && data.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <RefreshCw size={24} className="animate-spin text-indigo-500" />
                        <span className="text-sm font-medium">กำลังประมวลผลข้อมูล Real-time...</span>
                      </div>
                    </td>
                  </tr>
                ) : displayData.length > 0 ? (
                  displayData.map((order, index) => {
                    const isCanceled = (order.status || '').includes('ยกเลิก') || (order.status || '').toLowerCase().includes('cancel');
                    const firstChar = (order.customer || 'C').charAt(0).toUpperCase();

                    return (
                      <tr key={order.billId || index} className="hover:bg-slate-800/30 transition-colors group">
                        <td className="px-6 py-4 font-mono text-slate-400 whitespace-nowrap">
                          {formatDateToBE(order.datetime)}
                        </td>
                        <td className="px-6 py-4 font-mono text-indigo-400 font-medium">
                          #{order.billId}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
                              {firstChar}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
                                {order.customer || 'ลูกค้าทั่วไป'}
                              </div>
                              {order.address && (
                                <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <MapPin size={11} className="text-slate-500 shrink-0" /> 
                                  <span className="truncate max-w-[200px]">{order.address}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {String(order.items || order['รายการสินค้า'] || '-').split(/\n|,/).map((item, i) => (
                              <span key={i} className="bg-slate-950/80 border border-slate-800 text-slate-300 px-2.5 py-1 rounded-lg text-[11px] font-medium">
                                {item.trim()}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-sm text-emerald-400">
                            ฿{Number(order.total).toLocaleString(undefined, {minimumFractionDigits: 2})}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border ${
                            isCanceled 
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isCanceled ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            {(order.status || '').replace(/[🔴🟢]/g, '').trim() || 'สำเร็จ'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle size={32} className="text-slate-600" />
                        <span className="text-slate-400 text-sm font-medium">ไม่พบรายการสั่งซื้อตามเงื่อนไขที่คุณเลือก</span>
                      </div>
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

// Sub-component: Luxury Executive KPI Card
function LuxuryKpiCard({ title, value, icon, subtitle, highlight }) {
  return (
    <div className={`p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group shadow-xl ${
      highlight 
        ? 'bg-gradient-to-br from-indigo-900/40 via-purple-900/20 to-slate-900/80 border-indigo-500/40 shadow-indigo-500/10' 
        : 'bg-slate-900/60 backdrop-blur-xl border-slate-800/80 hover:border-slate-700/80'
    }`}>
      {highlight && (
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all" />
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        <div className={`p-3 rounded-2xl border ${
          highlight 
            ? 'bg-amber-500/10 border-amber-500/20' 
            : 'bg-slate-950/80 border-slate-800'
        }`}>
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-extrabold text-white tracking-tight">{value}</h3>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-1 font-medium">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
