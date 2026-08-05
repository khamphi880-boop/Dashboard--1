import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LabelList,
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
  BarChart2,
  LineChart as LineChartIcon,
  Sliders,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];

const PAYMENT_COLORS = {
  ไทยช่วยไทยพลัส: '#10B981',
  โอนพร้อมเพย์: '#3B82F6',
  เงินสด: '#F59E0B',
  Unknown: '#64748B',
};

const monthNamesThai = [
  '', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const monthNamesThaiFull = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

// Smart Universal Date Parser with Dual-Format Support (DD/MM vs MM/DD)
const parseDateTime = (datetimeString, preferUSFormat = false) => {
  if (!datetimeString) return null;
  let str = String(datetimeString).trim();
  if (!str) return null;

  let year = 0, month = 0, day = 0, hour = 0, minute = 0;

  // 1. Handle ISO strings with T or Z
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

  // 2. Separate Date and Time
  const parts = str.split(/\s+/);
  const dateStr = parts[0];
  const timeStr = parts[1] || '';

  if (timeStr && timeStr.includes(':')) {
    const tParts = timeStr.split(':');
    hour = parseInt(tParts[0], 10) || 0;
    minute = parseInt(tParts[1], 10) || 0;
  }

  // 3. Parse Date Parts (separated by - or / or .)
  const dParts = dateStr.split(/[-/.]/);
  if (dParts.length >= 3) {
    const p0 = parseInt(dParts[0], 10);
    const p1 = parseInt(dParts[1], 10);
    const p2 = parseInt(dParts[2], 10);

    if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
      if (p0 > 31 || dParts[0].length === 4) {
        year = p0;
        if (p1 <= 12 && p2 <= 31) {
          month = p1;
          day = p2;
        } else if (p2 <= 12 && p1 <= 31) {
          month = p2;
          day = p1;
        } else {
          month = p1;
          day = p2;
        }
      } else if (p2 > 31 || dParts[2].length === 4) {
        year = p2;
        if (p0 > 12) { 
          day = p0; 
          month = p1; 
        } else if (p1 > 12) { 
          month = p0; 
          day = p1; 
        } else { 
          if (preferUSFormat) {
            month = p0;
            day = p1;
          } else {
            day = p0;
            month = p1;
          }
        }
      } else {
        day = p0;
        month = p1;
        year = p2 < 50 ? 2000 + p2 : 2400 + p2;
      }
    }
  }

  if (!year || !month || !day) {
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
    isoDate: `${yyyy}-${mm}-${dd}`,
    isoMonth: `${yyyy}-${mm}`,
    hourStr: `${hh}:00`,
    timeStr: `${hh}:${min}`,
    year,
    month,
    day,
    hour,
    yearBE: year + 543,
    shortYearBE: String(year + 543).slice(-2),
    displayShortBE: `${parseInt(dd, 10)} ${monthNamesThai[month]} ${String(year + 543).slice(-2)}`,
    displayDayMonth: `${parseInt(dd, 10)} ${monthNamesThai[month]}`,
    displayMonthBE: `${monthNamesThai[month]} ${String(year + 543).slice(-2)}`
  };
};

const formatDateForComparison = (datetimeString, preferUSFormat = false) => {
  const parsed = parseDateTime(datetimeString, preferUSFormat);
  return parsed ? parsed.isoDate : '';
};

const formatDateToBE = (datetimeString, preferUSFormat = false) => {
  const parsed = parseDateTime(datetimeString, preferUSFormat);
  if (!parsed) return datetimeString || '-';
  const timeFormatted = parsed.timeStr !== '00:00' ? ` ${parsed.timeStr}` : '';
  return `${String(parsed.day).padStart(2, '0')}/${String(parsed.month).padStart(2, '0')}/${parsed.yearBE}${timeFormatted}`;
};

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

// [MODIFIED] Custom Dark-Themed Thai B.E. DatePicker Component
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

  const formattedDisplay = value ? formatDateToBE(value, false) : "เลือกวันที่ (พ.ศ.)";

  return (
    <div className="relative w-full sm:w-auto" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 flex items-center justify-between shadow-sm cursor-pointer hover:border-slate-700 transition-all font-mono min-w-[160px]"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className={value ? 'text-slate-200 font-medium' : 'text-slate-500'}>
            {formattedDisplay}
          </span>
        </div>
        {value && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="text-slate-500 hover:text-slate-300 p-0.5 rounded-full hover:bg-slate-800 transition-colors ml-1"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 p-4 w-72 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/80">
            <button 
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1.5 font-bold text-xs text-white">
              <span>{monthNamesThaiFull[viewMonth]}</span>
              <span className="text-indigo-400 font-mono">พ.ศ. {viewYear + 543}</span>
            </div>
            <button 
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'].map((d, i) => (
              <div key={i} className="text-[11px] font-semibold text-slate-500 py-1">
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
                  className={`h-7 w-7 mx-auto rounded-lg text-xs font-mono transition-all flex items-center justify-center ${
                    isSelected 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 font-bold' 
                      : isToday 
                        ? 'border border-indigo-500/50 text-indigo-400 font-bold bg-indigo-500/10' 
                        : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/80 text-xs font-medium">
            <button 
              onClick={() => { onChange(''); setIsOpen(false); }}
              className="text-slate-500 hover:text-slate-300 transition-colors"
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
              className="text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              วันนี้
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// [MODIFIED] Custom Dark-Themed Thai B.E. MonthPicker Component
function ThaiMonthPicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

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
    ? `${monthNamesThaiFull[parsedVal.month]} พ.ศ. ${parsedVal.year + 543}` 
    : "เลือกเดือน (พ.ศ.)";

  return (
    <div className="relative w-full sm:w-auto" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 flex items-center justify-between shadow-sm cursor-pointer hover:border-slate-700 transition-all font-mono min-w-[160px]"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className={value ? 'text-slate-200 font-medium' : 'text-slate-500'}>
            {formattedDisplay}
          </span>
        </div>
        {value && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            className="text-slate-500 hover:text-slate-300 p-0.5 rounded-full hover:bg-slate-800 transition-colors ml-1"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 p-4 w-72 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/80">
            <button 
              onClick={() => setViewYear(v => v - 1)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="font-bold text-xs text-indigo-400 font-mono">พ.ศ. {viewYear + 543}</span>
            <button 
              onClick={() => setViewYear(v => v + 1)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {monthNamesThaiFull.map((mName, idx) => {
              const isSelected = parsedVal.year === viewYear && parsedVal.month === idx && Boolean(value);
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectMonth(idx)}
                  className={`py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                    isSelected 
                      ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/30' 
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {mName}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/80 text-xs font-medium">
            <button 
              onClick={() => { onChange(''); setIsOpen(false); }}
              className="text-slate-500 hover:text-slate-300 transition-colors"
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

  // [MODIFIED] Chart customization settings (Bar / Area / Line, Sales / Orders, Data Labels)
  const [chartType, setChartType] = useState('bar');
  const [chartMetric, setChartMetric] = useState('sales');
  const [showDataLabels, setShowDataLabels] = useState(true);

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

  const isUSDateFormat = useMemo(() => {
    if (!data || data.length === 0) return false;
    for (const item of data) {
      const dt = String(item.datetime || '').trim().split(' ')[0];
      const parts = dt.split(/[-/.]/);
      if (parts.length >= 3 && parts[2].length === 4) {
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        if (p1 > 12) return true;  
        if (p0 > 12) return false; 
      }
    }
    return false;
  }, [data]);

  useEffect(() => {
    if (data.length > 0 && !selectedYear) {
      const years = data
        .map((item) => formatDateForComparison(item.datetime, isUSDateFormat).split('-')[0])
        .filter(Boolean)
        .sort();
      if (years.length > 0) {
        const latestYear = years[years.length - 1];
        setSelectedYear(latestYear);
      }
    }
  }, [data, selectedYear, isUSDateFormat]);

  const availableYears = useMemo(() => {
    const years = new Set(
      data
        .map((item) => formatDateForComparison(item.datetime, isUSDateFormat).split('-')[0])
        .filter(Boolean)
    );
    if (selectedYear) years.add(selectedYear);
    return Array.from(years).sort().reverse();
  }, [data, selectedYear, isUSDateFormat]);

  const latestAvailableDate = useMemo(() => {
    if (!data || data.length === 0) return '';
    const dates = data
      .map((item) => formatDateForComparison(item.datetime, isUSDateFormat))
      .filter(Boolean)
      .sort();
    return dates.length > 0 ? dates[dates.length - 1] : '';
  }, [data, isUSDateFormat]);

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

        return formatDateForComparison(dt, isUSDateFormat) === isoDate;
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
  }, [data, hideCanceled, latestAvailableDate, isUSDateFormat]);

  const displayData = useMemo(() => {
    let filtered = data;

    if (filterMode === 'day' && selectedDate) {
      filtered = filtered.filter(
        (item) => formatDateForComparison(item.datetime, isUSDateFormat) === selectedDate
      );
    } else if (filterMode === 'month' && selectedMonth) {
      filtered = filtered.filter((item) =>
        formatDateForComparison(item.datetime, isUSDateFormat).startsWith(selectedMonth)
      );
    } else if (filterMode === 'year' && selectedYear) {
      filtered = filtered.filter((item) =>
        formatDateForComparison(item.datetime, isUSDateFormat).startsWith(selectedYear)
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
    isUSDateFormat
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

  // [MODIFIED] Chart data aggregator supporting both Sales and Order Count
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
      const parsed = parseDateTime(item.datetime, isUSDateFormat);
      if (!parsed) return;

      let sortKey = '';
      let displayKey = '';

      if (filterMode === 'day' && selectedDate) {
        sortKey = String(parsed.hour).padStart(2, '0');
        displayKey = parsed.hourStr;
      } else if (filterMode === 'year' && selectedYear) {
        sortKey = parsed.isoMonth;
        displayKey = parsed.displayMonthBE;
      } else if (filterMode === 'month' && selectedMonth) {
        sortKey = parsed.isoDate;
        displayKey = parsed.displayDayMonth;
      } else {
        sortKey = parsed.isoDate;
        displayKey = parsed.displayShortBE;
      }

      if (!trendMap[sortKey]) {
        trendMap[sortKey] = { time: displayKey, sales: 0, orders: 0 };
      }
      trendMap[sortKey].sales += parseFloat(item.total) || 0;
      trendMap[sortKey].orders += 1;
    });

    const trendData = Object.keys(trendMap)
      .sort()
      .map((key) => trendMap[key]);

    return { paymentData, trendData };
  }, [displayData, filterMode, selectedDate, selectedMonth, selectedYear, isUSDateFormat]);

  let chartTitle = 'แนวโน้มยอดขายรายวัน (Daily Sales Trend)';
  if (filterMode === 'day' && selectedDate)
    chartTitle = `แนวโน้มยอดขายรายชั่วโมง (วันที่ ${formatDateToBE(selectedDate, false)})`;
  if (filterMode === 'year' && selectedYear)
    chartTitle = `แนวโน้มยอดขายรายเดือน (ประจำปี พ.ศ. ${parseInt(selectedYear) + 543})`;
  if (filterMode === 'month' && selectedMonth) {
    const [y, m] = selectedMonth.split('-');
    chartTitle = `แนวโน้มยอดขาย ประจำเดือน${monthNamesThaiFull[parseInt(m, 10) - 1]} พ.ศ. ${parseInt(y) + 543}`;
  }

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

            {/* [MODIFIED] Custom Thai B.E. Pickers Integration */}
            <div className="relative flex-1 sm:flex-none min-w-[160px]">
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
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </div>
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
                </div>
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
                ไม่พบบันทึกรายการสำหรับวันที่ <strong className="text-white font-mono">{formatDateToBE(selectedDate, false)}</strong>
                {latestAvailableDate && (
                  <> (ข้อมูลล่าสุดในระบบคือวันที่ <strong className="text-amber-200 font-mono">{formatDateToBE(latestAvailableDate, false)}</strong>)</>
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
            title={
              todayMetrics.isFallbackToLatest
                ? `ยอดขายวันล่าสุด (${formatDateToBE(todayMetrics.targetIso, false)})`
                : "ยอดขายวันนี้ (Today)"
            }
            value={`฿${todayMetrics.todaySales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={<Sun className="w-6 h-6 text-amber-400" />}
            glow="bg-amber-500"
            gradient="from-amber-500/20 to-orange-500/10"
            badge={todayMetrics.isFallbackToLatest ? "Latest" : "Today"}
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
          
          {/* [MODIFIED] Enhanced & Configurable Chart Card */}
          <div className="bg-slate-900/60 backdrop-blur-xl p-6 rounded-3xl border border-slate-800/80 shadow-2xl lg:col-span-2">
            
            {/* Chart Toolbar Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800/80">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  {chartTitle}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">ภาพรวมแนวโน้มตามช่วงเวลาที่เลือก</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Metric Selector (ยอดขาย / จำนวนออเดอร์) */}
                <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setChartMetric('sales')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      chartMetric === 'sales'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ยอดขาย (฿)
                  </button>
                  <button
                    onClick={() => setChartMetric('orders')}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      chartMetric === 'orders'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ออเดอร์
                  </button>
                </div>

                {/* Chart Type Selector (แท่ง / พื้นที่ / เส้น) */}
                <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setChartType('bar')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      chartType === 'bar'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="กราฟแท่ง (Bar)"
                  >
                    <BarChart2 size={13} /> แท่ง
                  </button>
                  <button
                    onClick={() => setChartType('area')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      chartType === 'area'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="กราฟพื้นที่ (Area)"
                  >
                    <Layers size={13} /> พื้นที่
                  </button>
                  <button
                    onClick={() => setChartType('line')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      chartType === 'line'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="กราฟเส้น (Line)"
                  >
                    <LineChartIcon size={13} /> เส้น
                  </button>
                </div>

                {/* Data Labels Switch */}
                <button
                  onClick={() => setShowDataLabels(!showDataLabels)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                    showDataLabels
                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title="แสดง/ซ่อนตัวเลขบนกราฟ"
                >
                  <Eye size={13} /> {showDataLabels ? 'ตัวเลข: เปิด' : 'ตัวเลข: ปิด'}
                </button>
              </div>
            </div>
            
            {/* Dynamic Render Chart */}
            <div className="h-[300px] w-full">
              {chartsData.trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart data={chartsData.trendData} margin={{ top: 25, right: 15, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748B', fontSize: 11 }} 
                        tickFormatter={(val) => chartMetric === 'sales' ? `฿${val.toLocaleString()}` : val} 
                      />
                      <RechartsTooltip content={<CustomTooltip chartMetric={chartMetric} />} />
                      <Bar dataKey={chartMetric} fill="#6366F1" radius={[8, 8, 0, 0]} maxBarSize={45}>
                        {showDataLabels && (
                          <LabelList 
                            dataKey={chartMetric} 
                            position="top" 
                            formatter={(val) => chartMetric === 'sales' ? `฿${Number(val).toLocaleString()}` : val}
                            style={{ fontSize: 11, fontWeight: 600, fill: '#818CF8' }} 
                          />
                        )}
                      </Bar>
                    </BarChart>
                  ) : chartType === 'area' ? (
                    <AreaChart data={chartsData.trendData} margin={{ top: 25, right: 15, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748B', fontSize: 11 }} 
                        tickFormatter={(val) => chartMetric === 'sales' ? `฿${val.toLocaleString()}` : val} 
                      />
                      <RechartsTooltip content={<CustomTooltip chartMetric={chartMetric} />} />
                      <Area
                        type="monotone"
                        dataKey={chartMetric}
                        stroke="#6366F1"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#salesGradient)"
                      >
                        {showDataLabels && (
                          <LabelList 
                            dataKey={chartMetric} 
                            position="top" 
                            formatter={(val) => chartMetric === 'sales' ? `฿${Number(val).toLocaleString()}` : val}
                            style={{ fontSize: 11, fontWeight: 600, fill: '#818CF8' }} 
                          />
                        )}
                      </Area>
                    </AreaChart>
                  ) : (
                    <LineChart data={chartsData.trendData} margin={{ top: 25, right: 15, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1E293B" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#64748B', fontSize: 11 }} 
                        tickFormatter={(val) => chartMetric === 'sales' ? `฿${val.toLocaleString()}` : val} 
                      />
                      <RechartsTooltip content={<CustomTooltip chartMetric={chartMetric} />} />
                      <Line 
                        type="monotone" 
                        dataKey={chartMetric} 
                        stroke="#6366F1" 
                        strokeWidth={3} 
                        dot={{ r: 5, fill: '#6366F1', strokeWidth: 2, stroke: '#090D16' }} 
                        activeDot={{ r: 8 }}
                      >
                        {showDataLabels && (
                          <LabelList 
                            dataKey={chartMetric} 
                            position="top" 
                            formatter={(val) => chartMetric === 'sales' ? `฿${Number(val).toLocaleString()}` : val}
                            style={{ fontSize: 11, fontWeight: 600, fill: '#818CF8' }} 
                          />
                        )}
                      </Line>
                    </LineChart>
                  )}
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
                          {formatDateToBE(order.datetime, isUSDateFormat)}
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

// [MODIFIED] Custom Tooltip supporting both Sales (฿) and Orders Count
const CustomTooltip = ({ active, payload, label, chartMetric }) => {
  if (active && payload && payload.length) {
    const isSales = chartMetric === 'sales';
    const val = Number(payload[0].value);
    return (
      <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 p-3 rounded-2xl shadow-2xl font-mono">
        <p className="text-[11px] text-slate-400 mb-1">{label}</p>
        <p className="text-sm font-bold text-indigo-400">
          {isSales ? `฿${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : `${val} ออเดอร์`}
        </p>
      </div>
    );
  }
  return null;
};

// Custom Tooltip for Pie Chart
const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 px-3 py-2 rounded-xl shadow-2xl text-xs">
        <p className="font-semibold text-white">{payload[0].name}</p>
        <p className="text-slate-400 font-mono mt-0.5">{payload[0].value} ออเดอร์</p>
      </div>
    );
  }
  return null;
};
