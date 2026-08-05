import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LabelList
} from 'recharts';
import { ShoppingCart, DollarSign, TrendingUp, Package, AlertCircle, MapPin, CreditCard, CheckCircle2, Calendar, Sun, BarChart2, LineChart as LineChartIcon, Layers, Sliders, Eye, ChevronLeft, ChevronRight, RefreshCw, Sparkles, Filter, Search } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
const PAYMENT_COLORS = {
  "ไทยช่วยไทยพลัส": "#10b981",
  "โอนพร้อมเพย์": "#3b82f6",
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

// Smart Bulletproof Date Parser
const formatDateForComparison = (datetimeString) => {
  if (!datetimeString) return "";
  try {
    let str = String(datetimeString).trim();

    if (str.includes('T') || str.includes('Z')) {
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

    const buildIso = (y, m, d) => {
      let year = parseInt(y, 10);
      let month = parseInt(m, 10);
      let day = parseInt(d, 10);

      if (isNaN(year) || isNaN(month) || isNaN(day)) return "";
      if (year > 2400) year -= 543;
      if (year < 100) year += 2000;

      const formattedMonth = String(month).padStart(2, '0');
      const formattedDay = String(day).padStart(2, '0');
      return `${year}-${formattedMonth}-${formattedDay}`;
    };

    const parts = dateOnly.split(/[\/\-\.]/);
    if (parts.length >= 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);

      if (parts[0].length === 4 || p0 > 1900) {
        return buildIso(p0, p1, p2);
      }

      if (parts[2].length === 4 || p2 > 1900 || p2 > 50) {
        let day, month;
        if (p0 > 12) {
          day = p0;
          month = p1;
        } else if (p1 > 12) {
          month = p0;
          day = p1;
        } else {
          day = p0;
          month = p1;
        }
        return buildIso(p2, month, day);
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
    const isoDate = formatDateForComparison(datetimeString);
    if (!isoDate) return datetimeString;

    const [yyyy, mm, dd] = isoDate.split('-');
    const yearBE = parseInt(yyyy, 10) + 543;

    let timePart = '';
    const str = String(datetimeString).trim();
    if (str.includes(' ')) {
      timePart = ' ' + str.split(' ')[1];
    } else if (str.includes('T')) {
      const t = str.split('T')[1];
      if (t) timePart = ' ' + t.split('.')[0];
    }

    return `${dd}/${mm}/${yearBE}${timePart}`;
  } catch (e) {
    return datetimeString;
  }
};

// Custom Thai B.E. DatePicker Component
// [MODIFIED] Enhanced UI with smooth glassmorphism popover & premium shadows
function ThaiDatePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const parsedVal = useMemo(() => {
    if (!value) {
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
    }
    const [y, m, d] = value.split('-').map(Number);
    return { year: y, month: m - 1, day: d };
  }, [value]);

  const [viewYear, setViewYear] = useState(parsedVal.year);
  const [viewMonth, setViewMonth] = useState(parsedVal.month);

  useEffect(() => {
    if (value) {
      const [y, m] = value.split('-').map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const monthNamesThai = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(v => v - 1);
    } else {
      setViewMonth(v => v - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(v => v + 1);
    } else {
      setViewMonth(v => v + 1);
    }
  };

  const handleSelectDay = (day) => {
    const yyyy = viewYear;
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const formattedDisplay = value ? formatDateToBE(value) : "เลือกวันที่ (พ.ศ.)";

  return (
    <div className="relative w-full sm:w-auto" ref={containerRef}>
      {/* [MODIFIED] Premium Trigger Button */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white/80 backdrop-blur-md border border-slate-200/80 text-slate-700 text-sm rounded-xl flex items-center justify-between px-3.5 py-2.5 shadow-sm cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 min-w-[180px]"
      >
        <div className="flex items-center gap-2.5">
          <Calendar size={17} className="text-indigo-500 shrink-0" />
          <span className={`text-sm ${value ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>
            {formattedDisplay}
          </span>
        </div>
        {value && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 ml-1 transition-colors"
            title="ล้างค่า"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        )}
      </div>

      {/* [MODIFIED] Glassmorphism Calendar Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-indigo-950/10 border border-slate-200/90 p-4.5 w-72 transition-all animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100">
            <button 
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-1.5 font-bold text-sm text-slate-800">
              <span>{monthNamesThai[viewMonth]}</span>
              <span className="text-indigo-600 font-extrabold">พ.ศ. {viewYear + 543}</span>
            </div>
            <button 
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'].map((d, i) => (
              <div key={i} className="text-[11px] font-bold text-slate-400 uppercase tracking-wider py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected = parsedVal.year === viewYear && parsedVal.month === viewMonth && parsedVal.day === day && Boolean(value);
              const now = new Date();
              const isToday = now.getFullYear() === viewYear && now.getMonth() === viewMonth && now.getDate() === day;

              return (
                <button
                  key={day}
                  onClick={() => handleSelectDay(day)}
                  className={`h-8 w-8 mx-auto rounded-xl text-xs font-semibold transition-all flex items-center justify-center ${
                    isSelected 
                      ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/30 font-bold scale-105' 
                      : isToday 
                        ? 'border border-indigo-400 text-indigo-600 font-bold bg-indigo-50/50' 
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4 pt-2.5 border-t border-slate-100 text-xs font-semibold">
            <button 
              onClick={() => { onChange(''); setIsOpen(false); }}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              ล้าง
            </button>
            <button 
              onClick={() => {
                const now = new Date();
                const yyyy = now.getFullYear();
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const dd = String(now.getDate()).padStart(2, '0');
                onChange(`${yyyy}-${mm}-${dd}`);
                setIsOpen(false);
              }}
              className="text-indigo-600 hover:text-indigo-800 font-bold transition-colors"
            >
              วันนี้
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Custom Thai B.E. MonthPicker Component
// [MODIFIED] Enhanced UI matching DatePicker styling
function ThaiMonthPicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const monthNamesThai = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const parsedVal = useMemo(() => {
    if (!value) {
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() };
    }
    const [y, m] = value.split('-').map(Number);
    return { year: y, month: m - 1 };
  }, [value]);

  const [viewYear, setViewYear] = useState(parsedVal.year);

  useEffect(() => {
    if (value) {
      const [y] = value.split('-').map(Number);
      setViewYear(y);
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectMonth = (mIdx) => {
    const mm = String(mIdx + 1).padStart(2, '0');
    onChange(`${viewYear}-${mm}`);
    setIsOpen(false);
  };

  const formattedDisplay = value 
    ? `${monthNamesThai[parsedVal.month]} พ.ศ. ${parsedVal.year + 543}` 
    : "เลือกเดือน (พ.ศ.)";

  return (
    <div className="relative w-full sm:w-auto" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white/80 backdrop-blur-md border border-slate-200/80 text-slate-700 text-sm rounded-xl flex items-center justify-between px-3.5 py-2.5 shadow-sm cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 min-w-[180px]"
      >
        <div className="flex items-center gap-2.5">
          <Calendar size={17} className="text-indigo-500 shrink-0" />
          <span className={`text-sm ${value ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>
            {formattedDisplay}
          </span>
        </div>
        {value && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 ml-1 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl shadow-indigo-950/10 border border-slate-200/90 p-4.5 w-72 transition-all animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100">
            <button 
              onClick={() => setViewYear(v => v - 1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-extrabold text-sm text-indigo-600">พ.ศ. {viewYear + 543}</span>
            <button 
              onClick={() => setViewYear(v => v + 1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {monthNamesThai.map((mName, idx) => {
              const isSelected = parsedVal.year === viewYear && parsedVal.month === idx && Boolean(value);
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectMonth(idx)}
                  className={`py-2 px-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isSelected 
                      ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white font-bold shadow-md shadow-indigo-500/30' 
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {mName}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4 pt-2.5 border-t border-slate-100 text-xs font-semibold">
            <button 
              onClick={() => { onChange(''); setIsOpen(false); }}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              ล้าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BeverageDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [filterMode, setFilterMode] = useState('year'); 
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(''); 
  
  // Chart customization settings
  const [chartType, setChartType] = useState('bar'); 
  const [chartMetric, setChartMetric] = useState('sales'); 
  const [showDataLabels, setShowDataLabels] = useState(true);

  const [isLive, setIsLive] = useState(false);
  const [hideCanceled, setHideCanceled] = useState(true);

  const DATA_URL = "https://script.google.com/macros/s/AKfycbzWpWDAZsAh1IrHn5L_7qxVyeepCods90zfR1bPqL1WklWDfk69mrf3-jCt6YSxbB09/exec";

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

  // Auto-detect and set selectedYear to the latest year available in data
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

  // Today's metrics calculation with automatic fallback to latest available date
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

  // Aggregates both Sales & Order Count for configurable chart rendering
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
          let hourNum = null;
          const rawDt = String(item.datetime || '').trim();

          if (rawDt.includes('T')) {
            const d = new Date(rawDt);
            if (!isNaN(d.getTime())) {
              hourNum = d.getHours();
            }
          } else if (rawDt.includes(' ')) {
            const parts = rawDt.split(' ');
            const timePart = parts[parts.length - 1]; 
            if (timePart && timePart.includes(':')) {
              const h = parseInt(timePart.split(':')[0], 10);
              if (!isNaN(h) && h >= 0 && h <= 23) {
                hourNum = h;
              }
            }
          }

          if (hourNum !== null) {
            sortKey = String(hourNum).padStart(2, '0');
            displayKey = `${sortKey}:00 น.`;
          } else {
            sortKey = '00_daily';
            displayKey = 'รวมยอดตามปฏิทิน';
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
            trendMap[sortKey] = { time: displayKey, sales: 0, orders: 0 };
          }
          trendMap[sortKey].sales += (parseFloat(item.total) || 0);
          trendMap[sortKey].orders += 1;
        }
      }
    });
    const trendData = Object.keys(trendMap).sort().map(key => trendMap[key]);

    return { paymentData, trendData };
  }, [displayData, filterMode, selectedDate, selectedYear]);

  let chartTitle = "แนวโน้มยอดขายรายวัน (Daily Sales Trend)";
  if (filterMode === 'day' && selectedDate) {
    chartTitle = `แนวโน้มยอดขายรายชั่วโมง ประจำวันที่ ${formatDateToBE(selectedDate)}`;
  } else if (filterMode === 'year' && selectedYear) {
    chartTitle = `แนวโน้มยอดขายรายเดือน ประจำปี พ.ศ. ${parseInt(selectedYear) + 543}`;
  } else if (filterMode === 'month' && selectedMonth) {
    const [y, m] = selectedMonth.split('-');
    const monthNames = ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    chartTitle = `แนวโน้มยอดขาย ประจำเดือน${monthNames[parseInt(m, 10)]} พ.ศ. ${parseInt(y) + 543}`;
  }

  const currentYearBE = selectedYear ? parseInt(selectedYear) + 543 : '';

  return (
    // [MODIFIED] Ultra-premium $100M Ambient Light Background Layer & Smooth Canvas
    <div className="min-h-screen bg-slate-50/90 text-slate-800 p-4 sm:p-6 md:p-8 font-sans relative overflow-x-hidden antialiased selection:bg-indigo-500 selection:text-white">
      
      {/* Ambient Lighting Orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl opacity-70" />
      <div className="pointer-events-none absolute top-1/3 -right-40 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl opacity-60" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 w-96 h-96 bg-emerald-100/50 rounded-full blur-3xl opacity-60" />

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Header Section */}
        {/* [MODIFIED] Glassmorphism Navbar with Soft Border & Layered Shadows */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white/80 backdrop-blur-xl p-6 sm:p-7 rounded-3xl shadow-xl shadow-slate-200/50 border border-white/80 transition-all">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
                <Sparkles size={22} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                  Beverage Shop Dashboard {currentYearBE ? `(พ.ศ. ${currentYearBE})` : ''}
                </h1>
                <p className="text-slate-500 text-xs sm:text-sm font-medium mt-0.5">
                  ระบบวิเคราะห์ข้อมูล ยอดขาย และคำสั่งซื้อ Real-time Analytics
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-3.5 pl-1">
              {loading ? (
                <span className="text-xs px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 font-semibold border border-indigo-200/60 flex items-center gap-1.5 shadow-sm">
                  <RefreshCw className="animate-spin h-3.5 w-3.5 text-indigo-600" />
                  กำลัง Sync ข้อมูล...
                </span>
              ) : error ? (
                <span className="text-xs px-3 py-1 rounded-full bg-red-50 text-red-600 font-semibold border border-red-200 flex items-center gap-1.5 shadow-sm">
                  <AlertCircle size={14} />
                  {error}
                </span>
              ) : (
                <span className={`text-xs px-3 py-1 rounded-full font-semibold border flex items-center gap-2 shadow-sm ${
                  isLive ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <span className="relative flex h-2 w-2">
                    {isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                  </span>
                  {isLive ? 'Live System Active' : 'Offline / Cached'}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 w-full lg:w-auto">
            
            {/* Mode Switcher Segment */}
            <div className="flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60 shadow-inner text-xs font-bold w-full sm:w-auto">
              <button
                  onClick={() => setFilterMode('day')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-xl transition-all duration-200 ${filterMode === 'day' ? 'bg-white text-indigo-600 shadow-md shadow-indigo-500/10' : 'text-slate-500 hover:text-slate-800'}`}
              >
                  รายวัน
              </button>
              <button
                  onClick={() => setFilterMode('month')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-xl transition-all duration-200 ${filterMode === 'month' ? 'bg-white text-indigo-600 shadow-md shadow-indigo-500/10' : 'text-slate-500 hover:text-slate-800'}`}
              >
                  รายเดือน
              </button>
              <button
                  onClick={() => setFilterMode('year')}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-xl transition-all duration-200 ${filterMode === 'year' ? 'bg-white text-indigo-600 shadow-md shadow-indigo-500/10' : 'text-slate-500 hover:text-slate-800'}`}
              >
                  รายปี
              </button>
            </div>

            {/* Date Pickers Container */}
            <div className="relative w-full sm:w-auto min-w-[180px]">
                {filterMode === 'day' && (
                  <ThaiDatePicker 
                    value={selectedDate} 
                    onChange={(val) => {
                      setSelectedDate(val);
                      setFilterMode('day');
                    }} 
                  />
                )}

                {filterMode === 'month' && (
                  <ThaiMonthPicker 
                    value={selectedMonth} 
                    onChange={(val) => {
                      setSelectedMonth(val);
                      setFilterMode('month');
                    }} 
                  />
                )}

                {filterMode === 'year' && (
                  <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-indigo-500">
                      <Calendar size={17} />
                    </div>
                    <select 
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="bg-white/80 backdrop-blur-md border border-slate-200/80 text-slate-800 text-sm font-semibold rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-8 py-2.5 shadow-sm transition-all appearance-none cursor-pointer hover:bg-slate-50"
                    >
                        <option value="">เลือกปี (ทุกปี)</option>
                        {availableYears.map(year => (
                            <option key={year} value={year}>พ.ศ. {parseInt(year) + 543}</option>
                        ))}
                    </select>
                  </div>
                )}
            </div>

            {/* Cancel Switch */}
            <label className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer bg-white/80 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-200/80 shadow-sm hover:bg-slate-50 transition-colors shrink-0">
              <input 
                type="checkbox" 
                checked={hideCanceled} 
                onChange={(e) => setHideCanceled(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              ซ่อนออเดอร์ยกเลิก
            </label>
          </div>
        </header>

        {data.length > 0 && displayData.length === 0 && filterMode === 'day' && selectedDate && (
          <div className="bg-amber-50/90 backdrop-blur-md border border-amber-200 rounded-2xl p-4.5 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm shadow-sm">
            <div className="flex items-center gap-2.5">
              <AlertCircle size={20} className="text-amber-600 shrink-0" />
              <span>
                ไม่พบข้อมูลในวันที่ <strong>{formatDateToBE(selectedDate)}</strong>
                {latestAvailableDate && (
                  <> (วันที่ล่าสุดที่มีข้อมูลในระบบคือ <strong>{formatDateToBE(latestAvailableDate)}</strong>)</>
                )}
              </span>
            </div>
            {latestAvailableDate && (
              <button 
                onClick={() => setSelectedDate(latestAvailableDate)}
                className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shrink-0 shadow-md shadow-amber-500/20"
              >
                ดูวันที่ล่าสุด ({formatDateToBE(latestAvailableDate)})
              </button>
            )}
          </div>
        )}

        {/* [MODIFIED] High-End KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          
          {/* Today's / Latest Day Sales Card */}
          <KpiCard 
            title={todayMetrics.isFallbackToLatest ? `ยอดขายวันล่าสุด (${formatDateToBE(todayMetrics.targetIso)})` : "ยอดขายวันนี้"} 
            value={`฿${todayMetrics.todaySales.toLocaleString(undefined, {minimumFractionDigits: 2})}`} 
            icon={<Sun size={20} className="text-amber-500" />}
            trend={`${todayMetrics.todayCount} บิล ${todayMetrics.isFallbackToLatest ? '(วันล่าสุดที่มีข้อมูล)' : '(วันนี้)'}`}
            highlight={true}
            colorScheme="amber"
          />

          {/* Total Sales */}
          <KpiCard 
            title="ยอดขายรวม" 
            value={`฿${metrics.totalSales.toLocaleString(undefined, {minimumFractionDigits: 2})}`} 
            icon={<DollarSign size={20} className="text-emerald-500" />}
            trend={filterMode === 'year' && selectedYear ? `ปี พ.ศ. ${parseInt(selectedYear) + 543}` : selectedDate ? `วันที่ ${formatDateToBE(selectedDate)}` : "ยอดรวมทั้งหมด"}
            colorScheme="emerald"
          />

          {/* Total Orders */}
          <KpiCard 
            title="ออเดอร์ทั้งหมด" 
            value={`${metrics.totalOrders.toLocaleString()} บิล`} 
            icon={<ShoppingCart size={20} className="text-indigo-500" />}
            trend="คำสั่งซื้อรวม"
            colorScheme="indigo"
          />

          {/* Total Items */}
          <KpiCard 
            title="จำนวนแก้ว/สินค้า" 
            value={`${metrics.totalItems.toLocaleString()} ชิ้น`} 
            icon={<Package size={20} className="text-purple-500" />}
            trend="สินค้าที่ขายได้"
            colorScheme="purple"
          />

          {/* Avg Order */}
          <KpiCard 
            title="ยอดเฉลี่ย/บิล" 
            value={`฿${metrics.avgOrderValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
            icon={<TrendingUp size={20} className="text-teal-500" />}
            trend="Average Order Value"
            colorScheme="teal"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Enhanced & Configurable Chart Card */}
          {/* [MODIFIED] Frosted Chart Box with Custom Controls */}
          <div className="bg-white/80 backdrop-blur-xl p-6 sm:p-7 rounded-3xl shadow-xl shadow-slate-200/50 border border-white/80 lg:col-span-2">
            
            {/* Chart Toolbar Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
              <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Sliders size={18} className="text-indigo-500" />
                {chartTitle}
              </h2>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                
                {/* Metric Selector */}
                <div className="flex bg-slate-100/80 p-1 rounded-xl text-xs font-bold border border-slate-200/50">
                  <button
                    onClick={() => setChartMetric('sales')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${chartMetric === 'sales' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    ยอดขาย (฿)
                  </button>
                  <button
                    onClick={() => setChartMetric('orders')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${chartMetric === 'orders' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    ออเดอร์
                  </button>
                </div>

                {/* Chart Type Selector */}
                <div className="flex bg-slate-100/80 p-1 rounded-xl text-xs font-bold border border-slate-200/50">
                  <button
                    onClick={() => setChartType('bar')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${chartType === 'bar' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    title="กราฟแท่ง (Bar)"
                  >
                    <BarChart2 size={14} /> แท่ง
                  </button>
                  <button
                    onClick={() => setChartType('area')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${chartType === 'area' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    title="กราฟพื้นที่ (Area)"
                  >
                    <Layers size={14} /> พื้นที่
                  </button>
                  <button
                    onClick={() => setChartType('line')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${chartType === 'line' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    title="กราฟเส้น (Line)"
                  >
                    <LineChartIcon size={14} /> เส้น
                  </button>
                </div>

                {/* Show Data Labels Switch */}
                <button
                  onClick={() => setShowDataLabels(!showDataLabels)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    showDataLabels ? 'bg-indigo-50/80 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200/80 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Eye size={14} /> {showDataLabels ? 'แสดงตัวเลข' : 'ซ่อนตัวเลข'}
                </button>
              </div>
            </div>

            {/* Dynamic Interactive Chart Render */}
            <div className="h-[330px] w-full">
              {chartsData.trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  
                  {chartType === 'bar' ? (
                    <BarChart data={chartsData.trendData} margin={{ top: 25, right: 20, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#4f46e5" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} 
                        tickFormatter={(val) => chartMetric === 'sales' ? `฿${val.toLocaleString()}` : val} 
                      />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(12px)',
                          borderRadius: '16px', 
                          border: '1px solid rgba(226, 232, 240, 0.8)', 
                          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' 
                        }}
                        formatter={(value) => [
                          chartMetric === 'sales' ? `฿${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2})}` : `${value} ออเดอร์`,
                          chartMetric === 'sales' ? 'ยอดขาย' : 'จำนวนออเดอร์'
                        ]}
                      />
                      <Bar dataKey={chartMetric} fill="url(#barGradient)" radius={[10, 10, 0, 0]} maxBarSize={45}>
                        {showDataLabels && (
                          <LabelList 
                            dataKey={chartMetric} 
                            position="top" 
                            formatter={(val) => chartMetric === 'sales' ? `฿${Number(val).toLocaleString()}` : val}
                            style={{ fontSize: 11, fontWeight: 700, fill: '#4338ca' }} 
                          />
                        )}
                      </Bar>
                    </BarChart>

                  ) : chartType === 'area' ? (
                    <AreaChart data={chartsData.trendData} margin={{ top: 25, right: 20, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="chartMetricGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} 
                        tickFormatter={(val) => chartMetric === 'sales' ? `฿${val.toLocaleString()}` : val} 
                      />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(12px)',
                          borderRadius: '16px', 
                          border: '1px solid rgba(226, 232, 240, 0.8)', 
                          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' 
                        }}
                        formatter={(value) => [
                          chartMetric === 'sales' ? `฿${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2})}` : `${value} ออเดอร์`,
                          chartMetric === 'sales' ? 'ยอดขาย' : 'จำนวนออเดอร์'
                        ]}
                      />
                      <Area type="monotone" dataKey={chartMetric} stroke="#4f46e5" strokeWidth={3.5} fillOpacity={1} fill="url(#chartMetricGradient)">
                        {showDataLabels && (
                          <LabelList 
                            dataKey={chartMetric} 
                            position="top" 
                            formatter={(val) => chartMetric === 'sales' ? `฿${Number(val).toLocaleString()}` : val}
                            style={{ fontSize: 11, fontWeight: 700, fill: '#4338ca' }} 
                          />
                        )}
                      </Area>
                    </AreaChart>

                  ) : (
                    <LineChart data={chartsData.trendData} margin={{ top: 25, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} 
                        tickFormatter={(val) => chartMetric === 'sales' ? `฿${val.toLocaleString()}` : val} 
                      />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(12px)',
                          borderRadius: '16px', 
                          border: '1px solid rgba(226, 232, 240, 0.8)', 
                          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' 
                        }}
                        formatter={(value) => [
                          chartMetric === 'sales' ? `฿${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2})}` : `${value} ออเดอร์`,
                          chartMetric === 'sales' ? 'ยอดขาย' : 'จำนวนออเดอร์'
                        ]}
                      />
                      <Line type="monotone" dataKey={chartMetric} stroke="#4f46e5" strokeWidth={3.5} dot={{r: 5, fill: '#6366f1', strokeWidth: 3, stroke: '#ffffff'}} activeDot={{ r: 8, stroke: '#6366f1' }}>
                        {showDataLabels && (
                          <LabelList 
                            dataKey={chartMetric} 
                            position="top" 
                            formatter={(val) => chartMetric === 'sales' ? `฿${Number(val).toLocaleString()}` : val}
                            style={{ fontSize: 11, fontWeight: 700, fill: '#4338ca' }} 
                          />
                        )}
                      </Line>
                    </LineChart>
                  )}

                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2 font-medium">
                  <Filter size={32} className="opacity-40" />
                  ไม่มีข้อมูลสำหรับแสดงผลกราฟช่วงเวลาที่เลือก
                </div>
              )}
            </div>
          </div>

          {/* Payment Method Pie Chart Card */}
          <div className="bg-white/80 backdrop-blur-xl p-6 sm:p-7 rounded-3xl shadow-xl shadow-slate-200/50 border border-white/80">
            <h2 className="text-base font-extrabold text-slate-800 mb-4 flex items-center gap-2">
              <CreditCard size={18} className="text-indigo-500" /> ช่องทางชำระเงิน
            </h2>
            <div className="h-[300px] w-full">
              {chartsData.paymentData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartsData.paymentData}
                      cx="50%"
                      cy="45%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={6}
                      dataKey="value"
                    >
                      {chartsData.paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(12px)',
                        borderRadius: '16px', 
                        border: '1px solid rgba(226, 232, 240, 0.8)', 
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' 
                      }}
                      formatter={(value) => [`${value} รายการ`, 'จำนวนออเดอร์']}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400 font-medium">
                  ไม่มีข้อมูล
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Table Container */}
        {/* [MODIFIED] High-End Modern Data Table Component */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-white/80 overflow-hidden">
          <div className="p-6 sm:p-7 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                รายการออเดอร์
              </h2>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                {
                  filterMode === 'day' && selectedDate 
                    ? `(ประจำวันที่ ${formatDateToBE(selectedDate)})` 
                    : selectedYear ? `(ประจำปี พ.ศ. ${parseInt(selectedYear) + 543})` : 'แสดงรายการคำสั่งซื้อทั้งหมด'
                }
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <input 
                type="text" 
                placeholder="ค้นหาลูกค้า, บิล, ที่อยู่..." 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={data.length === 0}
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-400 uppercase bg-slate-50/80 border-b border-slate-100 font-bold tracking-wider">
                <tr>
                  <th scope="col" className="px-6 py-4">วัน-เวลา</th>
                  <th scope="col" className="px-6 py-4">รหัสบิล (Bill ID)</th>
                  <th scope="col" className="px-6 py-4">ลูกค้า (Customer)</th>
                  <th scope="col" className="px-6 py-4">รายการ (Items)</th>
                  <th scope="col" className="px-6 py-4 text-right">ยอดรวม (Total)</th>
                  <th scope="col" className="px-6 py-4 text-center">สถานะ (Status)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && data.length === 0 ? (
                   <tr>
                     <td colSpan="6" className="px-6 py-16 text-center text-slate-500">
                       <div className="flex flex-col items-center gap-3">
                         <RefreshCw className="animate-spin h-7 w-7 text-indigo-600" />
                         <p className="font-semibold text-slate-600">กำลังโหลดข้อมูลระบบ...</p>
                       </div>
                     </td>
                   </tr>
                ) : displayData.length > 0 ? (
                  displayData.map((order, index) => (
                    <tr key={order.billId || index} className="hover:bg-slate-50/80 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-xs font-medium">
                        {formatDateToBE(order.datetime)}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs font-bold text-slate-600">
                        {order.billId}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {order.customer}
                        {order.address && (
                          <div className="text-xs text-slate-400 font-normal flex items-center gap-1 mt-0.5">
                            <MapPin size={12} className="text-slate-400 shrink-0" /> {order.address}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {String(order.items || order['รายการสินค้า'] || '-').split(/\n/).map((item, i) => (
                            <div key={i} className="text-slate-700 bg-slate-100/70 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-200/50 w-max max-w-xs truncate shadow-2xs" title={item}>
                              {item}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-extrabold text-slate-900 text-right text-base">
                        ฿{order.total.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {/* Status Badge with Glowing Pulse */}
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs ${
                          (order.status || '').includes('ยกเลิก') || (order.status || '').toLowerCase().includes('cancel')
                            ? 'bg-red-50 text-red-600 border-red-200/80'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            (order.status || '').includes('ยกเลิก') || (order.status || '').toLowerCase().includes('cancel')
                              ? 'bg-red-500'
                              : 'bg-emerald-500'
                          }`} />
                          {(order.status || '').replace(/[🔴🟢]/g, '').trim() || 'สำเร็จ'}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-16 text-center text-slate-500">
                      {error ? (
                        <div className="flex flex-col items-center gap-2 text-red-500">
                          <AlertCircle size={36} />
                          <p className="font-bold text-lg">เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูล</p>
                          <p className="text-xs text-red-400 font-mono">{error}</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-400 font-medium">
                          <Filter size={32} className="opacity-40" />
                          <p>ไม่พบรายการออเดอร์ในช่วงเวลาที่เลือก ({formatDateToBE(selectedDate)})</p>
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

// [MODIFIED] High-End Enterprise Style KPI Card Component
function KpiCard({ title, value, icon, trend, highlight, colorScheme }) {
  const schemeClasses = {
    amber: 'from-amber-500 to-orange-500 text-amber-600 bg-amber-500/10',
    emerald: 'from-emerald-500 to-teal-500 text-emerald-600 bg-emerald-500/10',
    indigo: 'from-indigo-500 to-violet-500 text-indigo-600 bg-indigo-500/10',
    purple: 'from-purple-500 to-pink-500 text-purple-600 bg-purple-500/10',
    teal: 'from-teal-500 to-emerald-500 text-teal-600 bg-teal-500/10'
  };

  const activeScheme = schemeClasses[colorScheme] || schemeClasses.indigo;

  return (
    <div className={`relative p-5 sm:p-6 rounded-3xl backdrop-blur-xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
      highlight 
        ? 'bg-gradient-to-br from-amber-50/90 via-white to-orange-50/40 border-amber-200/90 shadow-lg shadow-amber-500/10' 
        : 'bg-white/80 border-white/80 shadow-xl shadow-slate-200/50'
    }`}>
      {/* Top Accent Gradient Ribbon */}
      <div className={`absolute top-0 left-6 right-6 h-1 rounded-b-full bg-gradient-to-r ${activeScheme.split(' ')[0]} ${activeScheme.split(' ')[1]}`} />

      <div className="flex items-center justify-between mt-1">
        <p className="text-xs font-extrabold tracking-wider uppercase text-slate-400">{title}</p>
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner ${activeScheme.split(' ')[3]}`}>
          {icon}
        </div>
      </div>

      <div className="mt-3">
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
          {value}
        </h3>
        {trend && (
          <p className="text-xs mt-1.5 text-slate-500 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />
            {trend}
          </p>
        )}
      </div>
    </div>
  );
}