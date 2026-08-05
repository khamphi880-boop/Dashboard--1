import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { ShoppingCart, DollarSign, TrendingUp, Package, AlertCircle, MapPin, CreditCard, CheckCircle2, Calendar, Sun, Sparkles } from 'lucide-react';

// [MODIFIED] High-contrast neon color palette for dark luxury theme
const COLORS = ['#38bdf8', '#10b981', '#f59e0b', '#a855f7', '#ec4899'];
const PAYMENT_COLORS = {
  "ไทยช่วยไทยพลัส": "#10b981",
  "โอนพร้อมเพย์": "#38bdf8",
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

// Universal date parser bug fix for YYYY-MM-DD and timezone strings
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

// Helper function to convert any date/time string to Thai B.E. (พ.ศ.) format for UI display
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

  useEffect(() => {
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
           console.warn("API returned empty data.");
           setData([]); 
           setIsLive(false); 
           setError("ไม่พบข้อมูลจากระบบ (Empty Data)");
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setData([]); 
        setIsLive(false); 
        setError(err.message || "ไม่สามารถดึงข้อมูลได้ (Connection Error)");
      } finally {
        setLoading(false);
      }
    };

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

  let chartTitle = "แนวโน้มยอดขายรายวัน (Daily Sales Trend)";
  if (filterMode === 'day' && selectedDate) chartTitle = `แนวโน้มยอดขายรายชั่วโมง ประจำวันที่ ${formatDateToBE(selectedDate)}`;
  if (filterMode === 'year' && selectedYear) chartTitle = `แนวโน้มยอดขายรายเดือน (Monthly Sales Trend) ประจำปี พ.ศ. ${parseInt(selectedYear) + 543}`;

  const currentYearBE = selectedYear ? parseInt(selectedYear) + 543 : '';

  return (
    // [MODIFIED] High-end Dark Executive Glassmorphic Background with Ambient Gradient Lights
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans relative overflow-x-hidden selection:bg-amber-500 selection:text-slate-950">
      
      {/* Ambient background glows for high-value aesthetic */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed top-1/3 right-10 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Header Section - Dark Glass Card */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-800/80 shadow-2xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl p-2 bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-500/30 rounded-2xl shadow-inner">🥤</span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Beverage Shop Executive Dashboard 
                  {currentYearBE ? <span className="text-amber-400 font-mono text-xl">(พ.ศ. {currentYearBE})</span> : ''}
                </h1>
                <p className="text-slate-400 text-xs mt-1 flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-400 animate-pulse" />
                  ระบบวิเคราะห์และสรุปผลยอดขาย Real-time ระดับพรีเมียม
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-3">
              {loading ? (
                <span className="text-xs px-3 py-1 rounded-full border bg-indigo-500/10 text-indigo-400 border-indigo-500/30 flex items-center gap-1.5 shadow-sm">
                  <svg className="animate-spin h-3 w-3 text-indigo-400" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Synchronizing...
                </span>
              ) : error ? (
                <span className="text-xs px-3 py-1 rounded-full border bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-sm">
                  🔴 {error}
                </span>
              ) : (
                <span className={`text-xs px-3 py-1 rounded-full border shadow-sm flex items-center gap-1.5 ${
                  isLive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                  {isLive ? 'Live System Connected' : 'Waiting for Data'}
                </span>
              )}
            </div>
          </div>
          
          {/* Controls / Filter Section */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs w-full sm:w-auto shadow-inner">
              <button
                  onClick={() => setFilterMode('day')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-all duration-200 ${filterMode === 'day' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                  วัน
              </button>
              <button
                  onClick={() => setFilterMode('month')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-all duration-200 ${filterMode === 'month' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                  เดือน
              </button>
              <button
                  onClick={() => setFilterMode('year')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg transition-all duration-200 ${filterMode === 'year' ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                  ปี
              </button>
            </div>

            <div className="relative w-full sm:w-auto min-w-[170px]">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                    <Calendar size={16} />
                </div>
                
                {filterMode === 'day' && (
                  <input 
                      type="date" 
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 block w-full pl-9 pr-8 py-2.5 shadow-inner transition-all"
                  />
                )}

                {filterMode === 'month' && (
                  <input 
                      type="month" 
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 block w-full pl-9 pr-8 py-2.5 shadow-inner transition-all"
                  />
                )}

                {filterMode === 'year' && (
                  <select 
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 block w-full pl-9 pr-8 py-2.5 shadow-inner transition-all appearance-none cursor-pointer font-medium"
                  >
                      <option value="" className="bg-slate-900 text-slate-300">เลือกปี (ทุกปี)</option>
                      {availableYears.map(year => (
                          <option key={year} value={year} className="bg-slate-900 text-slate-200">พ.ศ. {parseInt(year) + 543}</option>
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
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300 transition-colors"
                    title="Clear filter"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                )}
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-950/80 px-3.5 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 shadow-inner transition-all select-none">
              <input 
                type="checkbox" 
                checked={hideCanceled} 
                onChange={(e) => setHideCanceled(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-950 w-4 h-4"
              />
              ซ่อนยกเลิก
            </label>
          </div>
        </header>

        {data.length > 0 && displayData.length === 0 && filterMode === 'day' && selectedDate && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-lg backdrop-blur-md">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-400 shrink-0" />
              <span>
                ยังไม่มีข้อมูลรายการออเดอร์ในวันที่ <strong>{formatDateToBE(selectedDate)}</strong>
                {latestAvailableDate && (
                  <> (ข้อมูลล่าสุดในระบบคือวันที่ <strong>{formatDateToBE(latestAvailableDate)}</strong>)</>
                )}
              </span>
            </div>
            {latestAvailableDate && (
              <button 
                onClick={() => setSelectedDate(latestAvailableDate)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors shrink-0 shadow-md shadow-amber-500/20"
              >
                ดูวันที่ล่าสุด ({formatDateToBE(latestAvailableDate)})
              </button>
            )}
          </div>
        )}

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Today's / Latest Day Sales Card */}
          <KpiCard 
            title={todayMetrics.isFallbackToLatest ? `ยอดขายวันล่าสุด (${formatDateToBE(todayMetrics.targetIso)})` : "ยอดขายวันนี้ (Today)"} 
            value={`฿${todayMetrics.todaySales.toLocaleString(undefined, {minimumFractionDigits: 2})}`} 
            icon={<Sun size={22} className="text-amber-400" />}
            trend={`${todayMetrics.todayCount} ออเดอร์ ${todayMetrics.isFallbackToLatest ? '(วันล่าสุดที่มีข้อมูล)' : '(วันนี้)'}`}
            highlight={true}
          />

          {/* Total Sales */}
          <KpiCard 
            title="ยอดขายรวม (Total)" 
            value={`฿${metrics.totalSales.toLocaleString(undefined, {minimumFractionDigits: 2})}`} 
            icon={<DollarSign size={22} className="text-emerald-400" />}
            trend={filterMode === 'year' && selectedYear ? `ประจำปี พ.ศ. ${parseInt(selectedYear) + 543}` : selectedDate ? `วันที่ ${formatDateToBE(selectedDate)}` : "ยอดรวมทั้งหมด"}
          />

          {/* Total Orders */}
          <KpiCard 
            title="ออเดอร์ทั้งหมด (Orders)" 
            value={metrics.totalOrders} 
            icon={<ShoppingCart size={22} className="text-sky-400" />}
          />

          {/* Total Items */}
          <KpiCard 
            title="จำนวนสินค้า (Items)" 
            value={metrics.totalItems} 
            icon={<Package size={22} className="text-purple-400" />}
          />

          {/* Avg Order */}
          <KpiCard 
            title="ยอดเฉลี่ย/บิล (Avg.)" 
            value={`฿${metrics.avgOrderValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
            icon={<TrendingUp size={22} className="text-teal-400" />}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Line Chart Panel */}
          <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-800/80 shadow-2xl lg:col-span-2 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-sm shadow-sky-400" />
                {chartTitle}
              </h2>
            </div>
            <div className="h-[300px] w-full">
              {chartsData.trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartsData.trendData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={(value) => `฿${value}`} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#f8fafc', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                      formatter={(value) => [`฿${value}`, 'Sales']}
                    />
                    <Line type="monotone" dataKey="sales" stroke="#38bdf8" strokeWidth={3} dot={{r: 4, fill: '#38bdf8', strokeWidth: 2, stroke: '#0f172a'}} activeDot={{ r: 8, fill: '#38bdf8', stroke: '#ffffff' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                  ไม่มีข้อมูลสำหรับแสดงผลกราฟ
                </div>
              )}
            </div>
          </div>

          {/* Pie Chart Panel */}
          <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-800/80 shadow-2xl flex flex-col justify-between">
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2 mb-4">
              <CreditCard size={18} className="text-indigo-400" /> ช่องทางชำระเงิน
            </h2>
            <div className="h-[250px] w-full">
              {chartsData.paymentData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartsData.paymentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={88}
                      paddingAngle={6}
                      dataKey="value"
                    >
                      {chartsData.paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[entry.name] || COLORS[index % COLORS.length]} stroke="#0f172a" strokeWidth={2} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #334155', color: '#f8fafc', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                  ไม่มีข้อมูล
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Table - Dark Executive Glass Style */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-800/80 shadow-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800/80 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-100">
                รายการออเดอร์ {selectedYear ? `(ประจำปี พ.ศ. ${parseInt(selectedYear) + 543})` : ''}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">ตารางแสดงรายละเอียดธุรกรรมการสั่งซื้อล่าสุด</p>
            </div>
            
            <div className="relative w-full sm:w-72">
              <input 
                type="text" 
                placeholder="ค้นหาชื่อ, รหัสบิล, ที่อยู่..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={data.length === 0}
              />
              <svg className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] text-slate-400 uppercase tracking-wider bg-slate-950/60 border-b border-slate-800">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold">วัน-เวลา</th>
                  <th scope="col" className="px-6 py-4 font-semibold">รหัสบิล (Bill ID)</th>
                  <th scope="col" className="px-6 py-4 font-semibold">ลูกค้า (Customer)</th>
                  <th scope="col" className="px-6 py-4 font-semibold">รายการ (Items)</th>
                  <th scope="col" className="px-6 py-4 font-semibold text-right">ยอดรวม (Total)</th>
                  <th scope="col" className="px-6 py-4 font-semibold text-center">สถานะ (Status)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {loading && data.length === 0 ? (
                   <tr>
                     <td colSpan="6" className="px-6 py-16 text-center text-slate-400">
                       <div className="flex flex-col items-center gap-3">
                         <svg className="animate-spin h-7 w-7 text-indigo-400" viewBox="0 0 24 24">
                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                         </svg>
                         <span className="font-medium text-slate-300">กำลังดึงข้อมูลจากระบบ...</span>
                       </div>
                     </td>
                   </tr>
                ) : displayData.length > 0 ? (
                  displayData.map((order, index) => (
                    <tr key={order.billId || index} className="hover:bg-slate-800/40 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        {formatDateToBE(order.datetime)}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-amber-400 font-medium">
                        {order.billId}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-200">
                        {order.customer}
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin size={11} className="text-slate-500" /> {order.address}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {String(order.items || order['รายการสินค้า'] || '-').split(/\n/).map((item, i) => (
                            <div key={i} className="text-slate-300 bg-slate-950/60 px-2.5 py-1 rounded-lg text-[11px] border border-slate-800/80 w-max max-w-xs truncate shadow-inner" title={item}>
                              {item}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-100 text-right font-mono text-sm">
                        ฿{order.total.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium border shadow-sm ${
                          (order.status || '').includes('ยกเลิก') || (order.status || '').toLowerCase().includes('cancel')
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}>
                          {((order.status || '').includes('ยกเลิก') || (order.status || '').toLowerCase().includes('cancel')) ? (
                            <AlertCircle size={13} /> 
                          ) : (
                            <CheckCircle2 size={13} /> 
                          )}
                          {(order.status || '').replace(/[🔴🟢]/g, '').trim() || 'สำเร็จ'}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center text-slate-400">
                      {error ? (
                        <div className="flex flex-col items-center gap-2 text-rose-400">
                          <AlertCircle size={36} />
                          <p className="font-semibold text-base">เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูล</p>
                          <p className="text-xs text-rose-400/80">{error}</p>
                        </div>
                      ) : (
                        `ไม่พบข้อมูลใน พ.ศ. ${selectedYear ? parseInt(selectedYear) + 543 : ''}`
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

// [MODIFIED] Executive KPI Card with radiant gold/amber gradient highlight and metallic glow
function KpiCard({ title, value, icon, trend, highlight }) {
  return (
    <div className={`p-5 rounded-3xl transition-all duration-300 relative overflow-hidden backdrop-blur-xl border ${
      highlight 
        ? 'bg-gradient-to-br from-amber-500/20 via-slate-900/90 to-slate-900 border-amber-500/40 shadow-xl shadow-amber-500/5' 
        : 'bg-slate-900/60 border-slate-800/80 shadow-xl hover:border-slate-700/80'
    }`}>
      {highlight && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
      )}
      
      <div className="flex items-center justify-between relative z-10">
        <p className="text-xs font-medium text-slate-400 tracking-wide">{title}</p>
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-transform duration-300 ${
          highlight 
            ? 'bg-amber-500/20 border-amber-500/30 text-amber-300' 
            : 'bg-slate-950/60 border-slate-800 text-slate-300'
        }`}>
          {icon}
        </div>
      </div>

      <div className="mt-3 relative z-10">
        <h3 className={`text-2xl font-bold font-mono tracking-tight ${highlight ? 'text-amber-300' : 'text-slate-100'}`}>
          {value}
        </h3>
        {trend && (
          <p className="text-[11px] mt-1.5 text-slate-400 font-medium flex items-center gap-1">
            {trend}
          </p>
        )}
      </div>
    </div>
  );
}
