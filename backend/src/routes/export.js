/**
 * Data Export Routes
 *
 * Purpose: Export SQLite datasets to CSV with practical business filters.
 * Access: Admin only, because export may include sensitive data.
 */

import { Router } from 'express';
import { all, get } from '../db/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

const ORDER_STATUS_OPTIONS = [
  { value: 'pending', label: 'منتظر' },
  { value: 'confirmed', label: 'موافقة' },
  { value: 'in_progress', label: 'قيد المعالجة' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'cancelled', label: 'تم الإلغاء' },
];

const ORDER_TYPE_OPTIONS = [
  { value: 'rental', label: 'إيجار' },
  { value: 'sewing_for_rental', label: 'الخياطة التي تبقى في الإيجار' },
  { value: 'sewing', label: 'تفصيل' },
  { value: 'sale', label: 'بيع' },
  { value: 'repair', label: 'تصحيح' },
];

const DRESS_STATUS_OPTIONS = [
  { value: 'available', label: 'حر' },
  { value: 'sold', label: 'مُباع' },
  { value: 'retired', label: 'إنتهى من المخزن' },
  { value: 'custom_sewing', label: 'الخياطة الشخصية' },
];

const DRESS_INTENDED_USE_OPTIONS = [
  { value: 'rental', label: 'للإيجار' },
  { value: 'sale', label: 'للبيع' },
];

const TRANSACTION_TYPE_OPTIONS = [
  { value: 'income', label: 'إيراد' },
  { value: 'expense', label: 'مصروف' },
];

const TRANSACTION_CATEGORY_OPTIONS = [
  { value: 'order', label: 'حجز' },
  { value: 'repair', label: 'التصحيحات' },
  { value: 'materials', label: 'مواد' },
  { value: 'overhead', label: 'النفقات العامة' },
  { value: 'tax', label: 'الضرائب' },
  { value: 'equipment', label: 'معدات' },
  { value: 'salary', label: 'الرواتب' },
  { value: 'other', label: 'آخر' },
];

const PAYMENT_METHOD_OPTIONS = [
  { value: 'cash', label: 'نقدي' },
  { value: 'bit', label: 'قليل' },
  { value: 'paybox', label: 'صندوق الدفع' },
  { value: 'credit', label: 'بطاقة' },
  { value: 'transfer', label: 'تحويل بنكي' },
  { value: 'check', label: "شيك" },
];

const RENTAL_TYPE_OPTIONS = [
  { value: 'rental', label: 'إيجار' },
  { value: 'sewing_for_rental', label: 'الخياطة التي تبقى في الإيجار' },
  { value: 'sewing', label: 'تفصيل' },
  { value: 'sale', label: 'بيع' },
  { value: 'repair', label: 'تصحيح' },
];

const USER_ROLE_OPTIONS = [
  { value: 'admin', label: 'إدارة' },
  { value: 'user', label: 'مستخدم' },
];

const ACTIVE_OPTIONS = [
  { value: '1', label: 'نشيط' },
  { value: '0', label: 'غير نشط' },
];

function createDateFilters(column, fromLabel = 'مؤرخة', toLabel = 'حتى الآن') {
  return [
    {
      key: 'dateFrom',
      label: fromLabel,
      inputType: 'date',
      queryType: 'date_from',
      column,
    },
    {
      key: 'dateTo',
      label: toLabel,
      inputType: 'date',
      queryType: 'date_to',
      column,
    },
  ];
}

const DATASET_CONFIG = {
  customers: {
    table: 'customers',
    label: 'العملاء',
    description: 'تفاصيل العميل, مصدر الوصول وحالة النشاط',
    orderBy: 'created_at DESC, id DESC',
    filters: [
      ...createDateFilters('created_at', 'تم إنشاؤها من تاريخ', 'تم إنشاؤها حسب التاريخ'),
      {
        key: 'source',
        label: 'مصدر الوصول',
        inputType: 'text',
        queryType: 'contains',
        column: 'source',
        placeholder: 'على سبيل المثال: انستغرام',
      },
      {
        key: 'search',
        label: 'بحث مجاني',
        inputType: 'text',
        queryType: 'search_any',
        columns: ['name', 'phone', 'email', 'notes'],
        placeholder: 'الاسم, الهاتف, البريد الإلكتروني...',
      },
    ],
  },
  dresses: {
    table: 'dresses',
    label: 'قطع',
    description: 'مخزون اللباس, الوضع والدعوة',
    orderBy: 'updated_at DESC, id DESC',
    filters: [
      ...createDateFilters('updated_at', 'تم التحديث من', 'تم التحديث حتى الآن'),
      {
        key: 'dressStatus',
        label: 'حالة اللباس',
        inputType: 'select',
        queryType: 'in',
        column: 'status',
        options: DRESS_STATUS_OPTIONS,
      },
      {
        key: 'dressIntendedUse',
        label: 'تسمية اللباس',
        inputType: 'select',
        queryType: 'in',
        column: 'intended_use',
        options: DRESS_INTENDED_USE_OPTIONS,
      },
      {
        key: 'search',
        label: 'بحث مجاني',
        inputType: 'text',
        queryType: 'search_any',
        columns: ['name', 'notes'],
        placeholder: 'اسم القطعة او التعليق',
      },
    ],
  },
  orders: {
    table: 'orders',
    label: 'حجوزات',
    description: 'أوامر الإيجار, الخياطة والبيع',
    orderBy: 'event_date DESC, created_at DESC, id DESC',
    filters: [
      ...createDateFilters('event_date', 'تاريخ الحدث من تاريخ', 'تاريخ الحدث حتى الآن'),
      {
        key: 'orderStatus',
        label: 'حالة الطلب',
        inputType: 'select',
        queryType: 'in',
        column: 'status',
        options: ORDER_STATUS_OPTIONS,
      },
      {
        key: 'customerId',
        label: 'معرف العميل',
        inputType: 'number',
        queryType: 'equals_number',
        column: 'customer_id',
      },
    ],
  },
  order_items: {
    table: 'order_items',
    label: 'عناصر الطلب',
    description: 'جميع عناصر مستوى اللباس ضمن الطلبات',
    orderBy: 'created_at DESC, id DESC',
    filters: [
      ...createDateFilters('created_at', 'تم إنشاؤها من تاريخ', 'تم إنشاؤها حسب التاريخ'),
      {
        key: 'itemType',
        label: 'نوع العنصر',
        inputType: 'select',
        queryType: 'in',
        column: 'item_type',
        options: ORDER_TYPE_OPTIONS,
      },
      {
        key: 'orderId',
        label: 'معرف الطلب',
        inputType: 'number',
        queryType: 'equals_number',
        column: 'order_id',
      },
      {
        key: 'dressId',
        label: 'معرف اللباس',
        inputType: 'number',
        queryType: 'equals_number',
        column: 'dress_id',
      },
      {
        key: 'search',
        label: 'بحث مجاني',
        inputType: 'text',
        queryType: 'search_any',
        columns: ['dress_name', 'wearer_name', 'notes'],
        placeholder: 'هناك قطعة/يرتدي/ملاحظات',
      },
    ],
  },
  transactions: {
    table: 'transactions',
    label: 'الحركات المالية',
    description: 'الدخل والمصروفات حسب النوع, الفئة وطريقة الدفع',
    orderBy: 'date DESC, id DESC',
    filters: [
      ...createDateFilters('date', 'تاريخ الحركة من تاريخ', 'تاريخ الحركة حتى الآن'),
      {
        key: 'transactionType',
        label: 'نوع الحركة',
        inputType: 'select',
        queryType: 'in',
        column: 'type',
        options: TRANSACTION_TYPE_OPTIONS,
      },
      {
        key: 'transactionCategory',
        label: 'فئة',
        inputType: 'select',
        queryType: 'in',
        column: 'category',
        options: TRANSACTION_CATEGORY_OPTIONS,
      },
      {
        key: 'paymentMethod',
        label: 'طريقة الدفع',
        inputType: 'select',
        queryType: 'in',
        column: 'payment_method',
        options: PAYMENT_METHOD_OPTIONS,
      },
      {
        key: 'customerId',
        label: 'معرف العميل',
        inputType: 'number',
        queryType: 'equals_number',
        column: 'customer_id',
      },
      {
        key: 'orderId',
        label: 'معرف الطلب',
        inputType: 'number',
        queryType: 'equals_number',
        column: 'order_id',
      },
      {
        key: 'search',
        label: 'بحث مجاني',
        inputType: 'text',
        queryType: 'search_any',
        columns: ['customer_name', 'supplier', 'product', 'notes'],
        placeholder: 'عميل/مزود/منتج/ملاحظات',
      },
    ],
  },
  dress_history: {
    table: 'dress_history',
    label: 'تاريخ اللباس',
    description: 'أحداث الإيجار/تفصيل/البيع على مستوى القطعة',
    orderBy: 'event_date DESC, created_at DESC, id DESC',
    filters: [
      ...createDateFilters('event_date', 'تاريخ الحدث من تاريخ', 'تاريخ الحدث حتى الآن'),
      {
        key: 'rentalType',
        label: 'نوع الحدث',
        inputType: 'select',
        queryType: 'in',
        column: 'rental_type',
        options: RENTAL_TYPE_OPTIONS,
      },
      {
        key: 'customerId',
        label: 'معرف العميل',
        inputType: 'number',
        queryType: 'equals_number',
        column: 'customer_id',
      },
      {
        key: 'dressId',
        label: 'معرف اللباس',
        inputType: 'number',
        queryType: 'equals_number',
        column: 'dress_id',
      },
      {
        key: 'orderId',
        label: 'معرف الطلب',
        inputType: 'number',
        queryType: 'equals_number',
        column: 'order_id',
      },
      {
        key: 'search',
        label: 'بحث مجاني',
        inputType: 'text',
        queryType: 'search_any',
        columns: ['wearer_name', 'customer_name', 'notes'],
        placeholder: 'يرتدي اسم/العميل أو التعليق',
      },
    ],
  },
  agreements: {
    table: 'agreements',
    label: 'اتفاقيات الإيجار',
    description: 'سجلات توقيع اتفاقيات الإيجار',
    orderBy: 'agreed_at DESC, id DESC',
    filters: [
      ...createDateFilters('agreed_at', 'تاريخ التوقيع من التاريخ', 'تاريخ التوقيع حتى الآن'),
      {
        key: 'customerId',
        label: 'معرف العميل',
        inputType: 'number',
        queryType: 'equals_number',
        column: 'customer_id',
      },
      {
        key: 'orderId',
        label: 'معرف الطلب',
        inputType: 'number',
        queryType: 'equals_number',
        column: 'order_id',
      },
      {
        key: 'search',
        label: 'بحث مجاني',
        inputType: 'text',
        queryType: 'search_any',
        columns: ['customer_name', 'customer_phone', 'customer_email'],
        placeholder: 'الاسم/الهاتف/البريد الإلكتروني',
      },
    ],
  },
  settings: {
    table: 'settings',
    label: 'إعدادات النظام',
    description: 'مفاتيح التكوين والقيم',
    orderBy: 'updated_at DESC, id DESC',
    filters: [
      ...createDateFilters('updated_at', 'تم التحديث من', 'تم التحديث حتى الآن'),
      {
        key: 'search',
        label: 'بحث مجاني',
        inputType: 'text',
        queryType: 'search_any',
        columns: ['key', 'value', 'description'],
        placeholder: 'المفتاح أو الوصف',
      },
    ],
  },
  users: {
    table: 'users',
    label: 'مستخدمي النظام',
    description: 'المستخدمين, الأدوار وحالة الحساب',
    orderBy: 'created_at DESC, id DESC',
    filters: [
      ...createDateFilters('created_at', 'تم إنشاؤها من تاريخ', 'تم إنشاؤها حسب التاريخ'),
      {
        key: 'userRole',
        label: 'دور',
        inputType: 'select',
        queryType: 'in',
        column: 'role',
        options: USER_ROLE_OPTIONS,
      },
      {
        key: 'userIsActive',
        label: 'حالة المستخدم',
        inputType: 'select',
        queryType: 'equals_number',
        column: 'is_active',
        options: ACTIVE_OPTIONS,
      },
      {
        key: 'search',
        label: 'بحث مجاني',
        inputType: 'text',
        queryType: 'search_any',
        columns: ['name', 'email'],
        placeholder: 'الاسم أو البريد الإلكتروني',
      },
    ],
  },
};

function getQueryValue(query, key) {
  const value = query[key];
  if (Array.isArray(value)) {
    return value[value.length - 1];
  }
  return value;
}

function splitValues(rawValue) {
  return String(rawValue)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeText(rawValue) {
  if (rawValue === undefined || rawValue === null) {
    return '';
  }
  return String(rawValue).trim();
}

function parseInteger(rawValue, label) {
  const parsed = Number.parseInt(String(rawValue), 10);
  if (Number.isNaN(parsed)) {
    throw new ApiError(400, `قيمة رقمية غير صالحة لـ ${label}`);
  }
  return parsed;
}

function parseDate(rawValue, label) {
  const value = normalizeText(rawValue);
  if (!value) {
    return null;
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) {
    throw new ApiError(400, `تاريخ غير صالح ل ${label}. التنسيق مطلوب YYYY-MM-DD`);
  }

  return value;
}

function parseBoolean(rawValue, label) {
  const value = normalizeText(rawValue).toLowerCase();
  if (!value) {
    return null;
  }

  if (['1', 'true', 'yes', 'on'].includes(value)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(value)) {
    return false;
  }

  throw new ApiError(400, `قيمة منطقية غير صالحة لـ ${label}`);
}

function validateAllowedValues(filter, values) {
  if (!filter.options || filter.options.length === 0) {
    return;
  }

  const allowed = new Set(filter.options.map((option) => option.value));
  for (const value of values.map(String)) {
    if (!allowed.has(value)) {
      throw new ApiError(400, `قيمة عامل التصفية غير صالحة لـ ${filter.label}`);
    }
  }
}

function applyFilter(filter, rawValue, whereClauses, params) {
  const value = normalizeText(rawValue);
  if (!value && filter.queryType !== 'not_null_when_true') {
    return;
  }

  switch (filter.queryType) {
    case 'date_from': {
      const normalizedDate = parseDate(value, filter.label);
      if (!normalizedDate) return;
      whereClauses.push(`date(${filter.column}) >= date(?)`);
      params.push(normalizedDate);
      return;
    }
    case 'date_to': {
      const normalizedDate = parseDate(value, filter.label);
      if (!normalizedDate) return;
      whereClauses.push(`date(${filter.column}) <= date(?)`);
      params.push(normalizedDate);
      return;
    }
    case 'equals_number': {
      const parsed = parseInteger(value, filter.label);
      validateAllowedValues(filter, [parsed]);
      whereClauses.push(`${filter.column} = ?`);
      params.push(parsed);
      return;
    }
    case 'in': {
      const values = splitValues(value);
      if (values.length === 0) return;
      validateAllowedValues(filter, values);
      const placeholders = values.map(() => '?').join(', ');
      whereClauses.push(`${filter.column} IN (${placeholders})`);
      params.push(...values);
      return;
    }
    case 'contains': {
      whereClauses.push(`${filter.column} LIKE ?`);
      params.push(`%${value}%`);
      return;
    }
    case 'search_any': {
      const columns = filter.columns || [];
      if (columns.length === 0) {
        return;
      }
      const pattern = `%${value}%`;
      const sql = columns.map((column) => `${column} LIKE ?`).join(' OR ');
      whereClauses.push(`(${sql})`);
      params.push(...columns.map(() => pattern));
      return;
    }
    case 'not_null_when_true': {
      const parsed = parseBoolean(rawValue, filter.label);
      if (parsed === true) {
        whereClauses.push(`${filter.column} IS NOT NULL`);
      }
      return;
    }
    default:
      return;
  }
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  let text = '';
  if (typeof value === 'string') {
    text = value;
  } else if (typeof value === 'object') {
    text = JSON.stringify(value);
  } else {
    text = String(value);
  }

  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function rowsToCsv(rows, columns) {
  const header = columns.join(',');
  const body = rows.map((row) => columns.map((column) => escapeCsvValue(row[column])).join(',')).join('\n');
  return `\uFEFF${header}${body ? `\n${body}` : ''}`;
}

function buildDatasetMeta(datasetKey, config) {
  const totalRows = get(`SELECT COUNT(*) as count FROM ${config.table}`)?.count || 0;
  return {
    id: datasetKey,
    label: config.label,
    description: config.description,
    totalRows,
    filters: config.filters.map((filter) => ({
      key: filter.key,
      label: filter.label,
      inputType: filter.inputType,
      placeholder: filter.placeholder || null,
      options: filter.options || [],
    })),
  };
}

/**
 * GET /api/export/datasets
 * Return exportable datasets with recommended filters.
 */
router.get('/datasets', (req, res, next) => {
  try {
    const datasets = Object.entries(DATASET_CONFIG).map(([datasetKey, config]) =>
      buildDatasetMeta(datasetKey, config)
    );

    res.json({
      success: true,
      data: {
        datasets,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/export/csv
 * Export a single dataset to CSV.
 */
router.get('/csv', (req, res, next) => {
  try {
    const datasetKey = normalizeText(getQueryValue(req.query, 'dataset'));
    if (!datasetKey) {
      throw new ApiError(400, 'يجب أن تختار dataset للتصدير');
    }

    const config = DATASET_CONFIG[datasetKey];
    if (!config) {
      throw new ApiError(400, 'dataset غير صالحة للتصدير');
    }

    const whereClauses = [];
    const params = [];

    for (const filter of config.filters) {
      const rawValue = getQueryValue(req.query, filter.key);
      applyFilter(filter, rawValue, whereClauses, params);
    }

    let sql = `SELECT * FROM ${config.table}`;
    if (whereClauses.length > 0) {
      sql += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    sql += ` ORDER BY ${config.orderBy}`;

    const rows = all(sql, params);
    const columns = all(`PRAGMA table_info(${config.table})`).map((column) => column.name);
    if (columns.length === 0) {
      throw new ApiError(500, `لم يتم العثور على أعمدة للجدول ${config.table}`);
    }

    const csvContent = rowsToCsv(rows, columns);
    const datePart = new Date().toISOString().slice(0, 10);
    const fileName = `eti-${datasetKey}-${datePart}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
});

export default router;
