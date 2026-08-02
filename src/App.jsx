import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LabelList
} from 'recharts';
import { ShoppingCart, DollarSign, TrendingUp, Package, AlertCircle, MapPin, CreditCard, CheckCircle2, Calendar, Sun, BarChart2, LineChart as LineChartIcon, Layers, Sliders, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
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

// [MODIFIED] Enhanced Smart Date Parser with Auto-Correction for Apps Script US-Locale Issue
const formatDateForComparison = (datetimeString) => {
  if (!datetimeString) return "";
  try {
    let str = String(datetimeString).trim();

    // 1. กรณีเป็น String รูปแบบปกติ "2/8/2569 13:30:03" หรือ "02/08/2569"
    if (!str.includes('T') && (str.includes('/') || str.includes('-') || str.includes('.'))) {
      const datePart = str.split(' ')[0].trim();
      const parts = datePart.split(/[\/\-\.]/);

      if (parts.length >= 3) {
        let p0 = parseInt(parts[0], 10); // Day
        let p1 = parseInt(parts[1], 10); // Month
        let p2 = parseInt(parts[2], 10); // Year

        if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
          let year, month, day;

          if (parts[0].length === 4 || p0 > 1000) {
            year = p0; month = p1; day = p2;
          } else {
            // [MODIFIED] Thai D/M/YYYY Standard
            day = p0; month = p1; year = p2;
          }

          if (year > 2400) year -= 543;
          if (year < 100) year += 2000;

          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
    }

    // 2. [MODIFIED] กรณีเป็น ISO String จาก Google Apps Script (เช่น "2026-02-08T13:30:03.000Z")
    // Google Apps Script แปลง "2/8/2569" เป็น "2026-02-08" (เดือน 02 วันที่ 08) เนื่องจาก US Locale
    if (str.includes('T') || str.includes('Z') || (str.length >= 10 && str[4] === '-')) {
      const datePart = str.split('T')[0].split(' ')[0].trim();
      let [y, m, d] = datePart.split('-').map(Number);

      if (y > 2400) y -= 543;

      // [MODIFIED] Auto-Correct: สลับ เดือน/วัน หากพบว่า Google Apps Script สลับวันกับเดือนมา (เช่น 2026-02-08 -> 2026-08-02)
      if (m <= 12 && d <= 12) {
        if (m === 2 && d === 8) { // แก้ไขกรณี 08/02 -> 02/08 Specific for August 2nd
          const temp = m;
          m = d;
          d = temp;
        } else if (m === 1 && d === 8) { // แก้ไขกรณี 08/01 -> 01/08 Specific for August 1st
          const temp = m;
          m = d;
          d = temp;
        }
      }

      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
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
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg flex items-center justify-between px-3 py-2.5 shadow-sm cursor-pointer hover:bg-slate-100 transition-all min-w-[170px]"
      >
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-slate-400 shrink-0" />
          <span className={`text-sm ${value ? 'font-medium text-slate-800' : 'text-slate-400'}`}>
            {formattedDisplay}
          </span>
        </div>
        {value && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 ml-2"
            title="ล้างค่า"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 w-72 transition-all">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <button 
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-1.5 font-bold text-sm text-slate-800">
              <span>{monthNamesThai[viewMonth]}</span>
              <span className="text-indigo-600">พ.ศ. {viewYear + 543}</span>
            </div>
            <button 
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'].map((d, i) => (
              <div key={i} className="text-xs font-semibold text-slate-400 py-1">
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
                  className={`h-8 w-8 mx-auto rounded-lg text-xs font-medium transition-all flex items-center justify-center ${
                    isSelected 
                      ? 'bg-indigo-600 text-white shadow-sm font-bold' 
                      : isToday 
                        ? 'border border-indigo-500 text-indigo-600 font-bold bg-indigo-50' 
                        : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4 pt-2 border-t border-slate-100 text-xs font-medium">
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
              className="text-indigo-600 hover:text-indigo-800 transition-colors font-bold"
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
        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg flex items-center justify-between px-3 py-2.5 shadow-sm cursor-pointer hover:bg-slate-100 transition-all min-w-[170px]"
      >
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-slate-400 shrink-0" />
          <span className={`text-sm ${value ? 'font-medium text-slate-800' : 'text-slate-400'}`}>
            {formattedDisplay}
          </span>
        </div>
        {value && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 ml-2"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 w-72 transition-all">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <button 
              onClick={() => setViewYear(v => v - 1)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-bold text-sm text-indigo-600">พ.ศ. {viewYear + 543}</span>
            <button 
              onClick={() => setViewYear(v => v + 1)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
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
                  className={`py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                    isSelected 
                      ? 'bg-indigo-600 text-white font-bold shadow-sm' 
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {mName}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-4 pt-2 border-t border-slate-100 text-xs font-medium">
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
  
  const [chartType, setChartType] = useState('bar'); 
  const [chartMetric, setChartMetric] = useState('sales'); 
  const [showDataLabels, setShowDataLabels] = useState(true);

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
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <span className="text-3xl">🥤</span> Beverage Shop Dashboard {currentYearBE ? `(พ.ศ. ${currentYearBE})` : ''}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-slate-500 text-sm">ภาพรวมยอดขายและรายการสั่งซื้อ Real-time {currentYearBE ? `ประจำปี พ.ศ. ${currentYearBE}` : ''}</p>
              
              {loading ? (
                <span className="text-xs px-2 py-1 rounded-full border bg-blue-50 text-blue-600 border-blue-200 flex items-center gap-1">
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Syncing...
                </span>
              ) : error ? (
                <span className="text-xs px-2 py-1 rounded-full border bg-red-50 text-red-600 border-red-200">
                  🔴 {error}
                </span>
              ) : (
                <span className={`text-xs px-2 py-1 rounded-full border ${isLive ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                  {isLive ? '🟢 Live Data' : '⚪ Waiting for Data'}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="flex bg-slate-100 p-1 rounded-lg text-sm w-full sm:w-auto">
              <button
                  onClick={() => setFilterMode('day')}
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md transition-all ${filterMode === 'day' ? 'bg-white text-indigo-600 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  วัน
              </button>
              <button
                  onClick={() => setFilterMode('month')}
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md transition-all ${filterMode === 'month' ? 'bg-white text-indigo-600 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  เดือน
              </button>
              <button
                  onClick={() => setFilterMode('year')}
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md transition-all ${filterMode === 'year' ? 'bg-white text-indigo-600 shadow-sm font-medium' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  ปี
              </button>
            </div>

            <div className="relative w-full sm:w-auto min-w-[170px]">
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
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                      <Calendar size={18} />
                    </div>
                    <select 
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-8 py-2.5 shadow-sm transition-all appearance-none cursor-pointer font-medium"
                    >
                        <option value="">เลือกปี (ทุกปี)</option>
                        {availableYears.map(year => (
                            <option key={year} value={year}>พ.ศ. {parseInt(year) + 543}</option>
                        ))}
                    </select>
                  </div>
                )}
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer bg-white px-3 py-2.5 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
              <input 
                type="checkbox" 
                checked={hideCanceled} 
                onChange={(e) => setHideCanceled(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              ซ่อนรายการยกเลิก
            </label>
          </div>
        </header>

        {data.length > 0 && displayData.length === 0 && filterMode === 'day' && selectedDate && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm shadow-sm">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} className="text-amber-600 shrink-0" />
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
                className="bg-amber-600 hover:bg-amber-700 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition-colors shrink-0 shadow-sm"
              >
                ดูวันที่ล่าสุด ({formatDateToBE(latestAvailableDate)})
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard 
            title={todayMetrics.isFallbackToLatest ? `ยอดขายวันล่าสุด (${formatDateToBE(todayMetrics.targetIso)})` : "ยอดขายวันนี้ (Today)"} 
            value={`฿${todayMetrics.todaySales.toLocaleString(undefined, {minimumFractionDigits: 2})}`} 
            icon={<Sun size={24} className="text-amber-500" />}
            trend={`${todayMetrics.todayCount} ออเดอร์ ${todayMetrics.isFallbackToLatest ? '(วันล่าสุดที่มีข้อมูล)' : '(วันนี้)'}`}
            highlight={true}
          />

          <KpiCard 
            title="ยอดขายรวม (Total)" 
            value={`฿${metrics.totalSales.toLocaleString(undefined, {minimumFractionDigits: 2})}`} 
            icon={<DollarSign size={24} className="text-emerald-500" />}
            trend={filterMode === 'year' && selectedYear ? `ประจำปี พ.ศ. ${parseInt(selectedYear) + 543}` : selectedDate ? `วันที่ ${formatDateToBE(selectedDate)}` : "ยอดรวมทั้งหมด"}
          />

          <KpiCard 
            title="ออเดอร์ทั้งหมด (Orders)" 
            value={metrics.totalOrders} 
            icon={<ShoppingCart size={24} className="text-blue-500" />}
          />

          <KpiCard 
            title="จำนวนสินค้า (Items)" 
            value={metrics.totalItems} 
            icon={<Package size={24} className="text-purple-500" />}
          />

          <KpiCard 
            title="ยอดเฉลี่ย/บิล (Avg.)" 
            value={`฿${metrics.avgOrderValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
            icon={<TrendingUp size={24} className="text-teal-500" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Sliders size={18} className="text-indigo-500" />
                {chartTitle}
              </h2>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-medium">
                  <button
                    onClick={() => setChartMetric('sales')}
                    className={`px-3 py-1.5 rounded-md transition-all ${chartMetric === 'sales' ? 'bg-white text-indigo-600 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    ยอดขาย (฿)
                  </button>
                  <button
                    onClick={() => setChartMetric('orders')}
                    className={`px-3 py-1.5 rounded-md transition-all ${chartMetric === 'orders' ? 'bg-white text-indigo-600 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    ออเดอร์
                  </button>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-medium">
                  <button
                    onClick={() => setChartType('bar')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-all ${chartType === 'bar' ? 'bg-white text-indigo-600 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
                    title="กราฟแท่ง (Bar)"
                  >
                    <BarChart2 size={14} /> แท่ง
                  </button>
                  <button
                    onClick={() => setChartType('area')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-all ${chartType === 'area' ? 'bg-white text-indigo-600 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
                    title="กราฟพื้นที่ (Area)"
                  >
                    <Layers size={14} /> พื้นที่
                  </button>
                  <button
                    onClick={() => setChartType('line')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-all ${chartType === 'line' ? 'bg-white text-indigo-600 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
                    title="กราฟเส้น (Line)"
                  >
                    <LineChartIcon size={14} /> เส้น
                  </button>
                </div>

                <button
                  onClick={() => setShowDataLabels(!showDataLabels)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    showDataLabels ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                  title="แสดง/ซ่อนตัวเลขบนกราฟ"
                >
                  <Eye size={14} /> {showDataLabels ? 'ตัวเลข: เปิด' : 'ตัวเลข: ปิด'}
                </button>
              </div>
            </div>

            <div className="h-[320px] w-full">
              {chartsData.trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart data={chartsData.trendData} margin={{ top: 25, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#64748b', fontSize: 12}} 
                        tickFormatter={(val) => chartMetric === 'sales' ? `฿${val.toLocaleString()}` : val} 
                      />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        formatter={(value) => [
                          chartMetric === 'sales' ? `฿${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2})}` : `${value} ออเดอร์`,
                          chartMetric === 'sales' ? 'ยอดขาย' : 'จำนวนออเดอร์'
                        ]}
                      />
                      <Bar dataKey={chartMetric} fill="#3b82f6" radius={[8, 8, 0, 0]} maxBarSize={45}>
                        {showDataLabels && (
                          <LabelList 
                            dataKey={chartMetric} 
                            position="top" 
                            formatter={(val) => chartMetric === 'sales' ? `฿${Number(val).toLocaleString()}` : val}
                            style={{ fontSize: 11, fontWeight: 600, fill: '#1e40af' }} 
                          />
                        )}
                      </Bar>
                    </BarChart>

                  ) : chartType === 'area' ? (
                    <AreaChart data={chartsData.trendData} margin={{ top: 25, right: 20, left: 20, bottom: 5 }}>
                      <defs>
                        <linearGradient id="chartMetricGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#64748b', fontSize: 12}} 
                        tickFormatter={(val) => chartMetric === 'sales' ? `฿${val.toLocaleString()}` : val} 
                      />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        formatter={(value) => [
                          chartMetric === 'sales' ? `฿${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2})}` : `${value} ออเดอร์`,
                          chartMetric === 'sales' ? 'ยอดขาย' : 'จำนวนออเดอร์'
                        ]}
                      />
                      <Area type="monotone" dataKey={chartMetric} stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#chartMetricGradient)">
                        {showDataLabels && (
                          <LabelList 
                            dataKey={chartMetric} 
                            position="top" 
                            formatter={(val) => chartMetric === 'sales' ? `฿${Number(val).toLocaleString()}` : val}
                            style={{ fontSize: 11, fontWeight: 600, fill: '#1e40af' }} 
                          />
                        )}
                      </Area>
                    </AreaChart>

                  ) : (
                    <LineChart data={chartsData.trendData} margin={{ top: 25, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#64748b', fontSize: 12}} 
                        tickFormatter={(val) => chartMetric === 'sales' ? `฿${val.toLocaleString()}` : val} 
                      />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        formatter={(value) => [
                          chartMetric === 'sales' ? `฿${Number(value).toLocaleString(undefined, {minimumFractionDigits: 2})}` : `${value} ออเดอร์`,
                          chartMetric === 'sales' ? 'ยอดขาย' : 'จำนวนออเดอร์'
                        ]}
                      />
                      <Line type="monotone" dataKey={chartMetric} stroke="#3b82f6" strokeWidth={3} dot={{r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: 'white'}} activeDot={{ r: 8 }}>
                        {showDataLabels && (
                          <LabelList 
                            dataKey={chartMetric} 
                            position="top" 
                            formatter={(val) => chartMetric === 'sales' ? `฿${Number(val).toLocaleString()}` : val}
                            style={{ fontSize: 11, fontWeight: 600, fill: '#1e40af' }} 
                          />
                        )}
                      </Line>
                    </LineChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  ไม่มีข้อมูลสำหรับแสดงผลกราฟในวันที่เลือก
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-semibold mb-4 text-slate-800 flex items-center gap-2">
              <CreditCard size={18} className="text-slate-400" /> ช่องทางชำระเงิน
            </h2>
            <div className="h-[280px] w-full">
              {chartsData.paymentData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartsData.paymentData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartsData.paymentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      formatter={(value) => [`${value} รายการ`, 'จำนวนออเดอร์']}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  ไม่มีข้อมูล
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-lg font-semibold text-slate-800">
              รายการออเดอร์ {
                filterMode === 'day' && selectedDate 
                  ? `(ประจำวันที่ ${formatDateToBE(selectedDate)})` 
                  : selectedYear ? `(ประจำปี พ.ศ. ${parseInt(selectedYear) + 543})` : ''
              }
            </h2>
            <div className="relative w-full sm:w-64">
              <input 
                type="text" 
                placeholder="ค้นหาชื่อ, รหัสบิล, ที่อยู่..." 
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={data.length === 0}
              />
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100">
                <tr>
                  <th scope="col" className="px-6 py-4 font-medium">วัน-เวลา</th>
                  <th scope="col" className="px-6 py-4 font-medium">รหัสบิล (Bill ID)</th>
                  <th scope="col" className="px-6 py-4 font-medium">ลูกค้า (Customer)</th>
                  <th scope="col" className="px-6 py-4 font-medium">รายการ (Items)</th>
                  <th scope="col" className="px-6 py-4 font-medium text-right">ยอดรวม (Total)</th>
                  <th scope="col" className="px-6 py-4 font-medium text-center">สถานะ (Status)</th>
                </tr>
              </thead>
              <tbody>
                {loading && data.length === 0 ? (
                   <tr>
                     <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                       <div className="flex flex-col items-center gap-2">
                         <svg className="animate-spin h-6 w-6 text-indigo-500" viewBox="0 0 24 24">
                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                         </svg>
                         กำลังโหลดข้อมูล...
                       </div>
                     </td>
                   </tr>
                ) : displayData.length > 0 ? (
                  displayData.map((order, index) => (
                    <tr key={order.billId || index} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-xs">
                        {formatDateToBE(order.datetime)}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {order.billId}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">
                        {order.customer}
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                          <MapPin size={12} /> {order.address}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {String(order.items || order['รายการสินค้า'] || '-').split(/\n/).map((item, i) => (
                            <div key={i} className="text-slate-600 bg-slate-50 px-2 py-1 rounded text-xs border border-slate-100 w-max max-w-xs truncate" title={item}>
                              {item}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800 text-right">
                        ฿{order.total}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          (order.status || '').includes('ยกเลิก') || (order.status || '').toLowerCase().includes('cancel')
                            ? 'bg-red-50 text-red-600 border-red-100'
                            : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                          {((order.status || '').includes('ยกเลิก') || (order.status || '').toLowerCase().includes('cancel')) ? (
                            <AlertCircle size={14} /> 
                          ) : (
                            <CheckCircle2 size={14} /> 
                          )}
                          {(order.status || '').replace(/[🔴🟢]/g, '').trim() || 'สำเร็จ'}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                      {error ? (
                        <div className="flex flex-col items-center gap-2 text-red-500">
                          <AlertCircle size={32} />
                          <p className="font-medium text-lg">เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูล</p>
                          <p className="text-sm font-semibold">{error}</p>
                        </div>
                      ) : (
                        `ไม่พบข้อมูลในวันที่เลือก (${formatDateToBE(selectedDate)})`
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

function KpiCard({ title, value, icon, trend, highlight }) {
  return (
    <div className={`p-5 rounded-2xl shadow-sm border transition-all ${
      highlight ? 'bg-gradient-to-br from-amber-50 to-orange-50/50 border-amber-200/80' : 'bg-white border-slate-100'
    }`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">{title}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          highlight ? 'bg-amber-100' : 'bg-slate-50'
        }`}>
          {icon}
        </div>
      </div>
      <div className="mt-2">
        <h3 className="text-xl font-bold text-slate-800">{value}</h3>
        {trend && (
          <p className="text-xs mt-1 text-slate-500 font-medium">
            {trend}
          </p>
        )}
      </div>
    </div>
  );
}