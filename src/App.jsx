import React, {
  useState,
  useEffect,
  useMemo,
  useDeferredValue,
  memo,
} from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
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
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  LayoutDashboard,
  FileText,
} from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
const PAYMENT_COLORS = {
  ไทยช่วยไทยพลัส: '#10b981', // Emerald 500
  โอนพร้อมเพย์: '#3b82f6', // Blue 500
  เงินสด: '#f59e0b', // Amber 500
};
const DELIVERY_COLORS = {
  ส่งหน้าห้อง: '#8b5cf6', // Violet 500
  ส่งหน้าตึก: '#ec4899', // Pink 500
  รับเองที่ร้าน: '#14b8a6', // Teal 500
};

const MONTH_NAMES = [
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

const ITEMS_PER_PAGE = 20;

// Date normalizer helper
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

// Normalized Data Factory: คำนวณเตรียมข้อมูลครั้งเดียว ป้องกันการ parse ซ้ำ
const normalizeOrderData = (rawItem) => {
  const datetime = rawItem.datetime || '';
  const dateFormatted = formatDateForComparison(datetime);

  let yearKey = '';
  let monthKey = '';
  let dayKey = '';
  if (dateFormatted) {
    const parts = dateFormatted.split('-');
    yearKey = parts[0] || '';
    monthKey = parts[0] && parts[1] ? `${parts[0]}-${parts[1]}` : '';
    dayKey = dateFormatted;
  }

  let timeDisplay = '-';
  let hourKey = '00';
  if (datetime) {
    const timePart = String(datetime).split(' ')[1];
    if (timePart) {
      timeDisplay = timePart;
      hourKey = timePart.split(':')[0] || '00';
    }
  }

  // Pre-calculate items quantity & lines
  let itemCount = 0;
  let parsedItems = [];
  if (rawItem.items) {
    parsedItems = String(rawItem.items).split('\n').filter(Boolean);
    parsedItems.forEach((line) => {
      const match = line.match(/^(\d+)x/);
      if (match && match[1]) {
        itemCount += parseInt(match[1], 10);
      } else {
        itemCount += 1;
      }
    });
  }

  const numTotal =
    typeof rawItem.total === 'number'
      ? rawItem.total
      : parseFloat(rawItem.total) || 0;
  const statusStr = String(rawItem.status || '');
  const isCanceled =
    statusStr.includes('ยกเลิก') || statusStr.toLowerCase().includes('cancel');
  const cleanStatus = statusStr.replace(/[🔴🟢]/g, '').trim() || 'สำเร็จ';

  const searchIndex = `${rawItem.customer || ''} ${rawItem.billId || ''} ${
    rawItem.address || ''
  }`.toLowerCase();

  return {
    ...rawItem,
    total: numTotal,
    _dateKey: dayKey,
    _yearKey: yearKey,
    _monthKey: monthKey,
    _hourKey: hourKey,
    _timeDisplay: timeDisplay,
    _parsedItems: parsedItems,
    _itemCount: itemCount,
    _isCanceled: isCanceled,
    _cleanStatus: cleanStatus,
    _searchIndex: searchIndex,
  };
};

export default function BeverageDashboard() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // [MODIFIED] เมนูสลับหน้า: 'dashboard' (ภาพรวม & กราฟ) หรือ 'orders' (ค้นหา & ตารางออเดอร์)
  const [currentView, setCurrentView] = useState('dashboard');

  // Use deferred value for smooth UI input typing
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const [filterMode, setFilterMode] = useState('day');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const [isLive, setIsLive] = useState(false);
  const [hideCanceled, setHideCanceled] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const DATA_URL =
    'https://script.google.com/macros/s/AKfycbz8AiaKwcO7IhRqwCEsZhpPmTw9mIkWsnKB-2MDti0-hpDFQ6FGM4ExfijSDfdXm8mn/exec';

  const fetchData = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(DATA_URL, { signal });
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
            return normalizeOrderData(obj);
          });
          setData(mappedData);
          setIsLive(true);
        } else {
          const normalized = parsedData.map(normalizeOrderData);
          setData(normalized);
          setIsLive(true);
        }
      } else {
        console.warn('API returned empty data.');
        setData([]);
        setIsLive(false);
        setError('ไม่พบข้อมูลจากระบบ (Empty Data)');
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Error fetching data:', err);
      setData([]);
      setIsLive(false);
      setError(err.message || 'ไม่สามารถดึงข้อมูลได้ (Connection Error)');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, []);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    deferredSearchTerm,
    selectedDate,
    selectedMonth,
    selectedYear,
    filterMode,
    hideCanceled,
    currentView,
  ]);

  // Generate list of available years dynamically
  const availableYears = useMemo(() => {
    const years = new Set();
    for (let i = 0; i < data.length; i++) {
      if (data[i]._yearKey) {
        years.add(data[i]._yearKey);
      }
    }
    return Array.from(years).sort().reverse();
  }, [data]);

  // Find the latest available date
  const latestAvailableDate = useMemo(() => {
    if (!data || data.length === 0) return '';
    let maxDate = '';
    for (let i = 0; i < data.length; i++) {
      const d = data[i]._dateKey;
      if (d && d > maxDate) {
        maxDate = d;
      }
    }
    return maxDate;
  }, [data]);

  // Filter data using precomputed properties
  const displayData = useMemo(() => {
    let filtered = data;
    const lowerSearch = deferredSearchTerm.trim().toLowerCase();

    return filtered.filter((item) => {
      // 1. Filter by Mode
      if (
        filterMode === 'day' &&
        selectedDate &&
        item._dateKey !== selectedDate
      ) {
        return false;
      }
      if (
        filterMode === 'month' &&
        selectedMonth &&
        item._monthKey !== selectedMonth
      ) {
        return false;
      }
      if (
        filterMode === 'year' &&
        selectedYear &&
        item._yearKey !== selectedYear
      ) {
        return false;
      }

      // 2. Filter out canceled orders
      if (hideCanceled && item._isCanceled) {
        return false;
      }

      // 3. Filter by Search Term
      if (lowerSearch && !item._searchIndex.includes(lowerSearch)) {
        return false;
      }

      return true;
    });
  }, [
    data,
    deferredSearchTerm,
    selectedDate,
    selectedMonth,
    selectedYear,
    hideCanceled,
    filterMode,
  ]);

  // Calculate metrics in a single pass
  const metrics = useMemo(() => {
    let totalSales = 0;
    let totalItems = 0;
    const totalOrders = displayData.length;

    for (let i = 0; i < totalOrders; i++) {
      const order = displayData[i];
      totalSales += order.total;
      totalItems += order._itemCount;
    }

    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    return { totalSales, totalOrders, avgOrderValue, totalItems };
  }, [displayData]);

  // Calculate charts data with single pass aggregation
  const chartsData = useMemo(() => {
    const paymentMap = {};
    const trendMap = {};

    for (let i = 0; i < displayData.length; i++) {
      const item = displayData[i];

      // Payment Breakdown
      const pm = item.payment || 'Unknown';
      paymentMap[pm] = (paymentMap[pm] || 0) + 1;

      // Trend Chart
      if (item._dateKey) {
        let sortKey = '';
        let displayKey = '';

        if (filterMode === 'day') {
          sortKey = item._hourKey;
          displayKey = `${sortKey}:00`;
        } else if (filterMode === 'month') {
          sortKey = item._dateKey;
          const parts = item._dateKey.split('-');
          const dd = parseInt(parts[2], 10);
          const mm = parseInt(parts[1], 10);
          displayKey = `${dd} ${MONTH_NAMES[mm] || ''}`;
        } else if (filterMode === 'year') {
          sortKey = item._monthKey;
          const parts = item._dateKey.split('-');
          const yyyy = parseInt(parts[0], 10);
          const mm = parseInt(parts[1], 10);
          const yearBE = yyyy + 543;
          displayKey = `${MONTH_NAMES[mm] || ''} ${yearBE
            .toString()
            .slice(-2)}`;
        }

        if (sortKey) {
          if (!trendMap[sortKey]) {
            trendMap[sortKey] = { time: displayKey, sales: 0 };
          }
          trendMap[sortKey].sales += item.total;
        }
      }
    }

    const paymentData = Object.keys(paymentMap).map((key) => ({
      name: key,
      value: paymentMap[key],
    }));

    const trendData = Object.keys(trendMap)
      .sort()
      .map((key) => trendMap[key]);

    return { paymentData, trendData };
  }, [displayData, filterMode]);

  // Pagination Slice
  const totalPages = Math.ceil(displayData.length / ITEMS_PER_PAGE) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return displayData.slice(start, start + ITEMS_PER_PAGE);
  }, [displayData, currentPage]);

  let chartTitle = 'แนวโน้มยอดขายรายชั่วโมง (Hourly Sales Trend)';
  if (filterMode === 'month')
    chartTitle = 'แนวโน้มยอดขายรายวัน (Daily Sales Trend)';
  if (filterMode === 'year')
    chartTitle = 'แนวโน้มยอดขายรายเดือน (Monthly Sales Trend)';

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-800 p-4 md:p-8 font-sans"
      style={{ touchAction: 'manipulation' }}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full lg:w-auto gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <span className="text-3xl">🥤</span> Beverage Shop Dashboard
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-slate-500 text-sm">
                  Real-time overview of daily sales and orders
                </p>

                {/* Status Indicator */}
                {loading ? (
                  <span className="text-xs px-2 py-1 rounded-full border bg-blue-50 text-blue-600 border-blue-200 flex items-center gap-1">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Syncing...
                  </span>
                ) : error ? (
                  <span className="text-xs px-2 py-1 rounded-full border bg-red-50 text-red-600 border-red-200">
                    🔴 {error}
                  </span>
                ) : (
                  <span
                    className={`text-xs px-2 py-1 rounded-full border ${
                      isLive
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    {isLive ? '🟢 Live Data' : '⚪ Waiting for Data'}
                  </span>
                )}
              </div>
            </div>

            {/* [MODIFIED] แท็บสลับหน้าสไตล์ Clean Pill Button สวยงามเหมือนเดิม */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-sm self-stretch sm:self-auto">
              <button
                type="button"
                onClick={() => setCurrentView('dashboard')}
                className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-medium transition-all ${
                  currentView === 'dashboard'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutDashboard size={16} />
                ภาพรวม (Dashboard)
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('orders')}
                className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg font-medium transition-all ${
                  currentView === 'orders'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Search size={16} />
                ค้นหาออเดอร์ (Search)
              </button>
            </div>
          </div>

          {/* Controls Wrapper */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            {/* Period Filter Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-lg text-sm w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setFilterMode('day')}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md transition-all ${
                  filterMode === 'day'
                    ? 'bg-white text-indigo-600 shadow-sm font-medium'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                วัน
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('month')}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md transition-all ${
                  filterMode === 'month'
                    ? 'bg-white text-indigo-600 shadow-sm font-medium'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                เดือน
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('year')}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md transition-all ${
                  filterMode === 'year'
                    ? 'bg-white text-indigo-600 shadow-sm font-medium'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                ปี
              </button>
            </div>

            {/* [MODIFIED] Dynamic Date Picker Input - ปรับขนาดฟอนต์ 16px บน Mobile กันขยายจอ */}
            <div className="relative w-full sm:w-auto min-w-[160px]">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Calendar size={18} />
              </div>

              {filterMode === 'day' && (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-base sm:text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-10 py-2.5 shadow-sm transition-all"
                />
              )}

              {filterMode === 'month' && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-base sm:text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-10 py-2.5 shadow-sm transition-all"
                />
              )}

              {filterMode === 'year' && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-base sm:text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-10 py-2.5 shadow-sm transition-all appearance-none cursor-pointer"
                >
                  <option value="">เลือกปี (All Years)</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {parseInt(year, 10) + 543} ({year})
                    </option>
                  ))}
                </select>
              )}

              {/* Clear Date Button */}
              {((filterMode === 'day' && selectedDate) ||
                (filterMode === 'month' && selectedMonth) ||
                (filterMode === 'year' && selectedYear)) && (
                <button
                  type="button"
                  onClick={() => {
                    if (filterMode === 'day') setSelectedDate('');
                    if (filterMode === 'month') setSelectedMonth('');
                    if (filterMode === 'year') setSelectedYear('');
                  }}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  title="Clear filter"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    ></path>
                  </svg>
                </button>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer bg-white px-3 py-2.5 rounded-lg border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors shrink-0">
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

        {/* Helpful Notification Banner when filtered date has 0 records */}
        {data.length > 0 &&
          displayData.length === 0 &&
          filterMode === 'day' &&
          selectedDate && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm shadow-sm">
              <div className="flex items-center gap-2">
                <AlertCircle size={20} className="text-amber-600 shrink-0" />
                <span>
                  ยังไม่มีข้อมูลรายการออเดอร์ในวันที่{' '}
                  <strong>{selectedDate}</strong>
                  {latestAvailableDate && (
                    <>
                      {' '}
                      (ข้อมูลล่าสุดในระบบคือวันที่{' '}
                      <strong>{latestAvailableDate}</strong>)
                    </>
                  )}
                </span>
              </div>
              {latestAvailableDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(latestAvailableDate)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-medium px-3 py-1.5 rounded-lg text-xs transition-colors shrink-0 shadow-sm"
                >
                  ดูวันที่ล่าสุด ({latestAvailableDate})
                </button>
              )}
            </div>
          )}

        {/* ================= VIEW 1: DASHBOARD OVERVIEW ================= */}
        {currentView === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="ยอดขายรวม (Total Sales)"
                value={`฿${metrics.totalSales.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}`}
                icon={<DollarSign size={24} className="text-emerald-500" />}
                trend={data.length > 0 ? 'อัปเดตล่าสุด' : 'รอข้อมูล'}
                trendUp={true}
              />
              <KpiCard
                title="ออเดอร์ทั้งหมด (Total Orders)"
                value={metrics.totalOrders}
                icon={<ShoppingCart size={24} className="text-blue-500" />}
              />
              <KpiCard
                title="จำนวนสินค้า (Total Items)"
                value={metrics.totalItems}
                icon={<Package size={24} className="text-purple-500" />}
              />
              <KpiCard
                title="ยอดเฉลี่ยต่อบิล (Avg. Order)"
                value={`฿${metrics.avgOrderValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`}
                icon={<TrendingUp size={24} className="text-amber-500" />}
              />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sales Trend Chart */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
                <h2 className="text-lg font-semibold mb-4 text-slate-800">
                  {chartTitle}
                </h2>
                <div className="h-[300px] w-full">
                  {chartsData.trendData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartsData.trendData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#e2e8f0"
                        />
                        <XAxis
                          dataKey="time"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 12 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: '#64748b', fontSize: 12 }}
                          tickFormatter={(value) => `฿${value}`}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          }}
                          formatter={(value) => [`฿${value}`, 'Sales']}
                        />
                        <Line
                          type="monotone"
                          dataKey="sales"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          dot={{
                            r: 4,
                            fill: '#3b82f6',
                            strokeWidth: 2,
                            stroke: 'white',
                          }}
                          activeDot={{ r: 8 }}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      ไม่มีข้อมูลสำหรับแสดงผลกราฟ
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Methods Chart */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h2 className="text-lg font-semibold mb-4 text-slate-800 flex items-center gap-2">
                  <CreditCard size={18} className="text-slate-400" />{' '}
                  ช่องทางชำระเงิน
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
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="value"
                          isAnimationActive={false}
                        >
                          {chartsData.paymentData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                PAYMENT_COLORS[entry.name] ||
                                COLORS[index % COLORS.length]
                              }
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          contentStyle={{
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                        />
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
          </div>
        )}

        {/* ================= VIEW 2: SEARCH & ORDERS TABLE ================= */}
        {currentView === 'orders' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  ค้นหาและรายการออเดอร์ (Search Orders)
                </h2>
                {displayData.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    พบทั้งหมด {displayData.length.toLocaleString()} รายการ
                  </p>
                )}
              </div>
              {/* [MODIFIED] Search input ปรับขนาด text-base sm:text-sm ป้องกันซูม */}
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, รหัสบิล, ที่อยู่..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={data.length === 0}
                />
                <svg
                  className="w-4 h-4 text-slate-400 absolute left-3 top-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  ></path>
                </svg>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th scope="col" className="px-6 py-4 font-medium">
                      เวลา (Time)
                    </th>
                    <th scope="col" className="px-6 py-4 font-medium">
                      รหัสบิล (Bill ID)
                    </th>
                    <th scope="col" className="px-6 py-4 font-medium">
                      ลูกค้า (Customer)
                    </th>
                    <th scope="col" className="px-6 py-4 font-medium">
                      รายการ (Items)
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 font-medium text-right"
                    >
                      ยอดรวม (Total)
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-4 font-medium text-center"
                    >
                      สถานะ (Status)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading && data.length === 0 ? (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-6 py-12 text-center text-slate-500"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <svg
                            className="animate-spin h-6 w-6 text-indigo-500"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          กำลังโหลดข้อมูล...
                        </div>
                      </td>
                    </tr>
                  ) : paginatedOrders.length > 0 ? (
                    paginatedOrders.map((order, index) => (
                      <OrderRow key={order.billId || index} order={order} />
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-6 py-12 text-center text-slate-500"
                      >
                        {error ? (
                          <div className="flex flex-col items-center gap-2 text-red-500">
                            <AlertCircle size={32} />
                            <p className="font-medium text-lg">
                              เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูล
                            </p>
                            <p className="text-sm font-semibold">{error}</p>
                            <div className="text-xs text-slate-500 mt-4 max-w-md bg-slate-50 p-4 rounded-lg border border-slate-200 text-left">
                              <p className="font-bold mb-1 text-slate-700">
                                วิธีแก้ไข:
                              </p>
                              <ol className="list-decimal pl-4 space-y-1">
                                <li>
                                  ไปที่ Google Sheets ของคุณ ➔ Extensions ➔ Apps
                                  Script
                                </li>
                                <li>
                                  กดปุ่ม <b>Deploy</b> (มุมขวาบน) ➔ New
                                  deployment (หรือ Manage deployments)
                                </li>
                                <li>
                                  ตั้งค่า Who has access เป็น{' '}
                                  <b>Anyone (ทุกคน)</b>
                                </li>
                                <li>
                                  คัดลอก URL ใหม่มาใส่ในตัวแปร{' '}
                                  <code className="bg-white px-1 py-0.5 rounded border border-slate-300">
                                    DATA_URL
                                  </code>{' '}
                                  ในโค้ด
                                </li>
                              </ol>
                            </div>
                          </div>
                        ) : (
                          'ไม่พบข้อมูล (No data found)'
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50/50">
                <p className="text-xs text-slate-500">
                  แสดงแถว {(currentPage - 1) * ITEMS_PER_PAGE + 1} ถึง{' '}
                  {Math.min(currentPage * ITEMS_PER_PAGE, displayData.length)}{' '}
                  จากทั้งหมด {displayData.length} รายการ
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    title="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-medium text-slate-700 px-2">
                    หน้า {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    title="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Memoized Table Row เพื่อลด DOM Reconciliation Time
const OrderRow = memo(function OrderRow({ order }) {
  return (
    <tr className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap text-slate-500">
        {order._timeDisplay}
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
          {order._parsedItems.map((item, i) => (
            <div
              key={i}
              className="text-slate-600 bg-slate-50 px-2 py-1 rounded text-xs border border-slate-100 w-max max-w-xs truncate"
              title={item}
            >
              {item}
            </div>
          ))}
        </div>
      </td>
      <td className="px-6 py-4 font-semibold text-slate-800 text-right">
        ฿{order.total.toLocaleString()}
      </td>
      <td className="px-6 py-4 text-center">
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            order._isCanceled
              ? 'bg-red-50 text-red-600 border-red-100'
              : 'bg-emerald-50 text-emerald-600 border-emerald-100'
          }`}
        >
          {order._isCanceled ? (
            <AlertCircle size={14} />
          ) : (
            <CheckCircle2 size={14} />
          )}
          {order._cleanStatus}
        </div>
      </td>
    </tr>
  );
});

// [MODIFIED] Memoized KPI Card - ปลด scale-110 ออกเพื่อไม่ให้กล่องกระตุกขยายเวลาสัมผัสบนมือถือ
const KpiCard = memo(function KpiCard({ title, value, icon, trend, trendUp }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-indigo-100 transition-colors">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
        {trend && (
          <p
            className={`text-xs mt-2 flex items-center gap-1 ${
              trendUp ? 'text-emerald-500' : 'text-slate-400'
            }`}
          >
            {trendUp ? '↑' : ''} {trend}
          </p>
        )}
      </div>
      <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center transition-colors">
        {icon}
      </div>
    </div>
  );
});