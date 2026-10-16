export const DEMO_EMAIL = "demo@atelier.local";
export const DEMO_PASSWORD = "Demo@123456";
export const DEMO_TOKEN = "atelier_demo_token_v1";

type DemoDb = {
  customers: any[];
  dresses: any[];
  orders: any[];
  transactions: any[];
};

const seed: DemoDb = {
  customers: [
    { id: 1, name: "سمر أحمد", phone: "01012345678", email: "samar@example.com", source: "فيسبوك", notes: "عميلة زفاف", created_at: "2026-10-01T10:00:00Z" },
    { id: 2, name: "مريم خالد", phone: "01123456789", email: "mariam@example.com", source: "ترشيح", notes: "سواريه", created_at: "2026-10-05T12:00:00Z" },
    { id: 3, name: "أحمد محمود", phone: "01234567890", email: "ahmed@example.com", source: "زيارة مباشرة", notes: "قسم رجالي", created_at: "2026-10-10T09:30:00Z" }
  ],
  dresses: [
    { id: 1, name: "سمر سواريه", base_price: 1000, total_income: 3200, rental_count: 3, status: "available", intended_use: "rental", photo_url: null, thumbnail_url: null, notes: "كود: W-001 | مقاس M", updated_at: "2026-10-15T12:00:00Z" },
    { id: 2, name: "فستان زفاف لؤلؤ", base_price: 2500, total_income: 7500, rental_count: 3, status: "available", intended_use: "rental", photo_url: null, thumbnail_url: null, notes: "كود: W-002 | مقاس L", updated_at: "2026-10-15T12:00:00Z" },
    { id: 3, name: "بدلة رجالي كلاسيك", base_price: 900, total_income: 1800, rental_count: 2, status: "available", intended_use: "rental", photo_url: null, thumbnail_url: null, notes: "كود: M-001 | مقاس 52", updated_at: "2026-10-15T12:00:00Z" },
    { id: 4, name: "فستان أطفال وردي", base_price: 500, total_income: 1000, rental_count: 2, status: "available", intended_use: "rental", photo_url: null, thumbnail_url: null, notes: "كود: K-001 | عمر 8 سنوات", updated_at: "2026-10-15T12:00:00Z" }
  ],
  orders: [
    { id: 101, customer_id: 1, customer_name: "سمر أحمد", event_date: "2026-10-20", total_price: 2500, deposit_amount: 500, paid_amount: 1500, status: "active", agreement_signed: 0, notes: "حجز زفاف", order_summary: "فستان زفاف لؤلؤ", created_at: "2026-10-12T11:00:00Z", updated_at: "2026-10-15T13:00:00Z" },
    { id: 102, customer_id: 2, customer_name: "مريم خالد", event_date: "2026-10-25", total_price: 1000, deposit_amount: 300, paid_amount: 300, status: "active", agreement_signed: 0, notes: "سواريه", order_summary: "سمر سواريه", created_at: "2026-10-13T11:00:00Z", updated_at: "2026-10-15T13:00:00Z" }
  ],
  transactions: [
    { id: 201, date: "2026-10-15", type: "income", category: "order", customer_id: 1, customer_name: "سمر أحمد", amount: 1000, payment_method: "cash", notes: "دفعة حجز", order_id: 101, created_at: "2026-10-15T10:00:00Z" },
    { id: 202, date: "2026-10-14", type: "expense", category: "materials", supplier: "مغسلة الأناقة", product: "تنظيف وتجهيز", amount: 250, payment_method: "cash", notes: "", created_at: "2026-10-14T10:00:00Z" },
    { id: 203, date: "2026-10-13", type: "income", category: "order", customer_id: 2, customer_name: "مريم خالد", amount: 300, payment_method: "transfer", notes: "عربون", order_id: 102, created_at: "2026-10-13T10:00:00Z" }
  ]
};

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function loadDb(): DemoDb {
  if (typeof window === "undefined") return clone(seed);
  try {
    const raw = localStorage.getItem("atelier_demo_db");
    if (raw) return JSON.parse(raw);
  } catch {}
  const db = clone(seed);
  try { localStorage.setItem("atelier_demo_db", JSON.stringify(db)); } catch {}
  return db;
}

function saveDb(db: DemoDb) {
  if (typeof window !== "undefined") {
    try { localStorage.setItem("atelier_demo_db", JSON.stringify(db)); } catch {}
  }
}

const ok = (data?: any, message = "تم بنجاح") => ({ success: true, message, data });

export function handleDemoRequest(endpoint: string, options: RequestInit = {}): any {
  const db = loadDb();
  const method = (options.method || "GET").toUpperCase();
  const body = typeof options.body === "string" && options.body ? JSON.parse(options.body) : {};
  const url = new URL(endpoint, "https://demo.local");
  const path = url.pathname;

  if (path === "/auth/verify" || path === "/auth/me") {
    return ok({ user: { id: 1, email: DEMO_EMAIL, name: "مدير الأتيليه", role: "admin" } });
  }
  if (path === "/auth/change-password") return ok({}, "النسخة التجريبية لا تغيّر كلمة المرور");

  if (path === "/dashboard/summary") {
    const income = db.transactions.filter(x => x.type === "income").reduce((s, x) => s + Number(x.amount || 0), 0);
    const expenses = db.transactions.filter(x => x.type === "expense").reduce((s, x) => s + Number(x.amount || 0), 0);
    return ok({
      financials: {
        monthly: { income, expenses, profit: income - expenses },
        yearly: { income: income * 6, expenses: expenses * 6, profit: (income - expenses) * 6 }
      },
      orders: { open: db.orders.filter(x => x.status === "active").length, totalActive: db.orders.length },
      customers: { total: db.customers.length, newThisMonth: db.customers.length },
      dresses: { available: db.dresses.filter(x => x.status === "available").length, total: db.dresses.length }
    });
  }

  if (path === "/dashboard/upcoming-events") return ok({ events: db.orders });
  if (path === "/dashboard/recent-transactions") return ok({ transactions: db.transactions.slice(0, 10) });
  if (path === "/dashboard/monthly-chart") return ok({ chart: [] });
  if (path === "/dashboard/top-dresses") return ok({ dresses: db.dresses.slice(0, 5) });
  if (path === "/dashboard/requires-attention") return ok({ items: [] });

  if (path === "/customers/search/quick") {
    const q = (url.searchParams.get("q") || "").toLowerCase();
    return ok({ customers: db.customers.filter(c => c.name.toLowerCase().includes(q) || String(c.phone || "").includes(q)).slice(0, 10) });
  }
  if (path === "/customers" && method === "GET") {
    const q = (url.searchParams.get("search") || "").toLowerCase();
    const customers = db.customers.filter(c => !q || c.name.toLowerCase().includes(q) || String(c.phone || "").includes(q));
    return ok({ customers, pagination: { total: customers.length, page: 1, limit: customers.length || 1, totalPages: 1 } });
  }
  if (path === "/customers" && method === "POST") {
    const customer = { id: Date.now(), ...body, created_at: new Date().toISOString() };
    db.customers.unshift(customer); saveDb(db); return ok({ customer }, "تمت إضافة العميل");
  }
  const customerMatch = path.match(/^\/customers\/(\d+)$/);
  if (customerMatch) {
    const id = Number(customerMatch[1]);
    const idx = db.customers.findIndex(x => x.id === id);
    if (idx < 0) return { success: false, message: "العميل غير موجود" };
    if (method === "GET") return ok({ customer: db.customers[idx] });
    if (method === "PUT") { db.customers[idx] = { ...db.customers[idx], ...body }; saveDb(db); return ok({ customer: db.customers[idx] }); }
  }
  if (path === "/customers/merge") return ok({}, "تم دمج العملاء تجريبيًا");

  if (path === "/dresses/available") return ok({ dresses: db.dresses.filter(x => x.status === "available") });
  if (path === "/dresses" && method === "GET") {
    const q = (url.searchParams.get("search") || "").toLowerCase();
    const dresses = db.dresses.filter(d => !q || d.name.toLowerCase().includes(q) || String(d.notes || "").toLowerCase().includes(q));
    return ok({ dresses, pagination: { total: dresses.length, page: 1, limit: dresses.length || 1, totalPages: 1 } });
  }
  if (path === "/dresses" && method === "POST") {
    const dress = { id: Date.now(), total_income: 0, rental_count: 0, status: "available", ...body, updated_at: new Date().toISOString() };
    db.dresses.unshift(dress); saveDb(db); return ok({ dress }, "تمت إضافة القطعة");
  }
  const dressMatch = path.match(/^\/dresses\/(\d+)(?:\/status|\/rental)?$/);
  if (dressMatch) {
    const id = Number(dressMatch[1]);
    const idx = db.dresses.findIndex(x => x.id === id);
    if (idx < 0) return { success: false, message: "القطعة غير موجودة" };
    if (path.endsWith("/status")) { db.dresses[idx].status = body.status; saveDb(db); return ok({ dress: db.dresses[idx] }); }
    if (path.endsWith("/rental")) return ok({}, "تم تسجيل التأجير تجريبيًا");
    if (method === "GET") return ok({ dress: db.dresses[idx] });
    if (method === "PUT") { db.dresses[idx] = { ...db.dresses[idx], ...body }; saveDb(db); return ok({ dress: db.dresses[idx] }); }
  }
  if (path === "/dresses/merge") return ok({}, "تم دمج القطع تجريبيًا");
  if (path === "/dresses/upload") return ok({ imageUrl: "", thumbnailUrl: "" }, "رفع الصور غير مفعّل في النسخة التجريبية");

  if (path === "/transactions/summary") {
    const income = db.transactions.filter(x => x.type === "income").reduce((s, x) => s + Number(x.amount || 0), 0);
    const expenses = db.transactions.filter(x => x.type === "expense").reduce((s, x) => s + Number(x.amount || 0), 0);
    return ok({ income, expenses, profit: income - expenses });
  }
  if (path === "/transactions" && method === "GET") {
    return ok({ transactions: db.transactions, pagination: { total: db.transactions.length, page: 1, limit: db.transactions.length || 1, totalPages: 1 } });
  }
  if (path === "/transactions" && method === "POST") {
    const transaction = { id: Date.now(), ...body, created_at: new Date().toISOString() };
    db.transactions.unshift(transaction); saveDb(db); return ok({ transaction }, "تم تسجيل الحركة");
  }
  const txMatch = path.match(/^\/transactions\/(\d+)$/);
  if (txMatch) {
    const id = Number(txMatch[1]);
    const idx = db.transactions.findIndex(x => x.id === id);
    if (idx < 0) return { success: false, message: "الحركة غير موجودة" };
    if (method === "GET") return ok({ transaction: db.transactions[idx] });
    if (method === "PUT") { db.transactions[idx] = { ...db.transactions[idx], ...body }; saveDb(db); return ok({ transaction: db.transactions[idx] }); }
    if (method === "DELETE") { db.transactions.splice(idx, 1); saveDb(db); return ok({}); }
  }

  if (path === "/orders/upcoming") return ok({ orders: db.orders });
  if (path === "/orders" && method === "GET") {
    return ok({ orders: db.orders, pagination: { total: db.orders.length, page: 1, limit: db.orders.length || 1, totalPages: 1 } });
  }
  if (path === "/orders" && method === "POST") {
    const order = { id: Date.now(), status: "active", paid_amount: 0, deposit_amount: 0, ...body, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    db.orders.unshift(order); saveDb(db); return ok({ order }, "تم إنشاء الحجز");
  }
  if (path === "/orders/merge") return ok({}, "تم دمج الحجوزات تجريبيًا");
  const orderMatch = path.match(/^\/orders\/(\d+)(?:\/status|\/payment|\/attachments.*)?$/);
  if (orderMatch) {
    const id = Number(orderMatch[1]);
    const idx = db.orders.findIndex(x => x.id === id);
    if (path.includes("/attachments")) return ok({ attachments: [] });
    if (idx < 0) return { success: false, message: "الحجز غير موجود" };
    if (path.endsWith("/status")) { db.orders[idx].status = body.status; saveDb(db); return ok({ order: db.orders[idx] }); }
    if (path.endsWith("/payment")) { db.orders[idx].paid_amount = Number(db.orders[idx].paid_amount || 0) + Number(body.amount || 0); saveDb(db); return ok({ order: db.orders[idx] }, "تم تسجيل الدفعة"); }
    if (method === "GET") return ok({ order: db.orders[idx] });
    if (method === "PUT") { db.orders[idx] = { ...db.orders[idx], ...body, updated_at: new Date().toISOString() }; saveDb(db); return ok({ order: db.orders[idx] }); }
    if (method === "DELETE") { db.orders.splice(idx, 1); saveDb(db); return ok({}); }
  }

  if (path === "/agreements/config") return ok({ businessName: "نظام إدارة الأتيليه" });
  if (path === "/agreements/content/terms") return ok({ terms: "شروط تجريبية" });
  if (path.startsWith("/agreements")) return ok({ agreements: [] });

  if (path === "/export/datasets") return ok({ datasets: [] });

  return ok({});
}
