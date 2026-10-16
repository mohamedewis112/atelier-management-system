export type DemoRole = "admin" | "supervisor" | "sales";

export type DemoUser = {
  id: number;
  name: string;
  email: string;
  role: DemoRole;
  is_active: boolean;
  created_at: string;
};

export const DEMO_ACCOUNTS = [
  {
    email: "demo@atelier.local",
    password: "Demo@123456",
    token: "atelier_demo_token_admin_v2",
    user: { id: 1, name: "مدير النظام", email: "demo@atelier.local", role: "admin" as DemoRole, is_active: true, created_at: "2026-10-01T09:00:00Z" },
  },
  {
    email: "supervisor@atelier.local",
    password: "Demo@123456",
    token: "atelier_demo_token_supervisor_v2",
    user: { id: 2, name: "مشرف التشغيل", email: "supervisor@atelier.local", role: "supervisor" as DemoRole, is_active: true, created_at: "2026-10-01T09:05:00Z" },
  },
  {
    email: "sales@atelier.local",
    password: "Demo@123456",
    token: "atelier_demo_token_sales_v2",
    user: { id: 3, name: "موظف مبيعات", email: "sales@atelier.local", role: "sales" as DemoRole, is_active: true, created_at: "2026-10-01T09:10:00Z" },
  },
];

export const DEMO_EMAIL = DEMO_ACCOUNTS[0].email;
export const DEMO_PASSWORD = DEMO_ACCOUNTS[0].password;
export const DEMO_TOKEN = DEMO_ACCOUNTS[0].token;

type DemoDb = {
  users: DemoUser[];
  customers: any[];
  dresses: any[];
  orders: any[];
  transactions: any[];
};

const DEMO_DB_VERSION = "atelier-demo-v4";

const seed: DemoDb = {
  users: DEMO_ACCOUNTS.map((account) => ({ ...account.user })),
  customers: [
    { id: 1, name: "عميل تجريبي 1", phone: "01010000001", email: "customer1@example.com", source: "زيارة مباشرة", notes: "حساب تجريبي", created_at: "2026-10-01T10:00:00Z" },
    { id: 2, name: "عميل تجريبي 2", phone: "01010000002", email: "customer2@example.com", source: "ترشيح", notes: "حساب تجريبي", created_at: "2026-10-05T12:00:00Z" },
    { id: 3, name: "عميل تجريبي 3", phone: "01010000003", email: "customer3@example.com", source: "فيسبوك", notes: "حساب تجريبي", created_at: "2026-10-10T09:30:00Z" }
  ],
  dresses: [
    {
      id: 1,
      code: "W-001",
      category: "زفاف",
      name: "فستان زفاف 001",
      size: "M",
      color: "أوف وايت",
      base_price: 2500,
      total_income: 5000,
      rental_count: 2,
      status: "available",
      intended_use: "rental",
      photo_url: null,
      thumbnail_url: null,
      notes: "كود: W-001 | قسم: زفاف | مقاس M",
      booked_dates: ["2026-10-22"],
      upcoming_orders: [{ order_id: 101, event_date: "2026-10-22", order_status: "active", customer_name: "عميل تجريبي 1", wearer_name: "" }],
      updated_at: "2026-10-15T12:00:00Z"
    },
    {
      id: 2,
      code: "S-002",
      category: "زفاف",
      name: "فستان سواريه 002",
      size: "L",
      color: "كحلي",
      base_price: 1200,
      total_income: 2400,
      rental_count: 2,
      status: "available",
      intended_use: "rental",
      photo_url: null,
      thumbnail_url: null,
      notes: "كود: S-002 | قسم: زفاف | مقاس L",
      booked_dates: ["2026-10-28"],
      upcoming_orders: [{ order_id: 102, event_date: "2026-10-28", order_status: "active", customer_name: "عميل تجريبي 2", wearer_name: "" }],
      updated_at: "2026-10-15T12:00:00Z"
    },
    {
      id: 3,
      code: "M-001",
      category: "رجالي",
      name: "بدلة رجالي 001",
      size: "52",
      color: "أسود",
      base_price: 900,
      total_income: 1800,
      rental_count: 2,
      status: "available",
      intended_use: "rental",
      photo_url: null,
      thumbnail_url: null,
      notes: "كود: M-001 | قسم: رجالي | مقاس 52",
      booked_dates: [],
      upcoming_orders: [],
      updated_at: "2026-10-15T12:00:00Z"
    },
    {
      id: 4,
      code: "K-001",
      category: "أطفال",
      name: "قطعة أطفال 001",
      size: "8 سنوات",
      color: "وردي",
      base_price: 500,
      total_income: 1000,
      rental_count: 2,
      status: "available",
      intended_use: "rental",
      photo_url: null,
      thumbnail_url: null,
      notes: "كود: K-001 | قسم: أطفال | عمر 8 سنوات",
      booked_dates: [],
      upcoming_orders: [],
      updated_at: "2026-10-15T12:00:00Z"
    },
    {
      id: 5,
      code: "P-001",
      category: "منتجات بيع",
      name: "منتج بيع 001",
      size: "",
      color: "",
      base_price: 350,
      total_income: 700,
      rental_count: 0,
      status: "available",
      intended_use: "sale",
      photo_url: null,
      thumbnail_url: null,
      notes: "كود: P-001 | قسم: منتجات بيع",
      booked_dates: [],
      upcoming_orders: [],
      updated_at: "2026-10-15T12:00:00Z"
    }
  ],
  orders: [
    {
      id: 101,
      customer_id: 1,
      customer_name: "عميل تجريبي 1",
      event_date: "2026-10-22",
      total_price: 2500,
      deposit_amount: 500,
      paid_amount: 1500,
      status: "active",
      sales_user_id: 3,
      sales_user_name: "موظف مبيعات",
      agreement_signed: 0,
      notes: "حجز تجريبي",
      order_summary: "فستان زفاف 001",
      created_at: "2026-10-12T11:00:00Z",
      updated_at: "2026-10-15T13:00:00Z"
    },
    {
      id: 102,
      customer_id: 2,
      customer_name: "عميل تجريبي 2",
      event_date: "2026-10-28",
      total_price: 1200,
      deposit_amount: 300,
      paid_amount: 300,
      status: "active",
      sales_user_id: 3,
      sales_user_name: "موظف مبيعات",
      agreement_signed: 0,
      notes: "حجز تجريبي",
      order_summary: "فستان سواريه 002",
      created_at: "2026-10-13T11:00:00Z",
      updated_at: "2026-10-15T13:00:00Z"
    }
  ],
  transactions: [
    { id: 201, date: "2026-10-15", type: "income", category: "order", customer_id: 1, customer_name: "عميل تجريبي 1", amount: 1000, payment_method: "cash", notes: "دفعة على الحجز", order_id: 101, employee_name: "موظف مبيعات", created_at: "2026-10-15T10:00:00Z" },
    { id: 202, date: "2026-10-14", type: "expense", category: "materials", supplier: "مورد تجريبي", product: "تنظيف وتجهيز", amount: 250, payment_method: "cash", notes: "", employee_name: "مشرف التشغيل", created_at: "2026-10-14T10:00:00Z" },
    { id: 203, date: "2026-10-13", type: "income", category: "order", customer_id: 2, customer_name: "عميل تجريبي 2", amount: 300, payment_method: "transfer", notes: "عربون حجز", order_id: 102, employee_name: "موظف مبيعات", created_at: "2026-10-13T10:00:00Z" }
  ]
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function loadDb(): DemoDb {
  if (typeof window === "undefined") return clone(seed);

  try {
    const version = localStorage.getItem("atelier_demo_db_version");
    const raw = localStorage.getItem("atelier_demo_db");
    if (version === DEMO_DB_VERSION && raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.users)) return parsed;
    }
  } catch {}

  const db = clone(seed);
  try {
    localStorage.setItem("atelier_demo_db", JSON.stringify(db));
    localStorage.setItem("atelier_demo_db_version", DEMO_DB_VERSION);
  } catch {}
  return db;
}

function saveDb(db: DemoDb) {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("atelier_demo_db", JSON.stringify(db));
      localStorage.setItem("atelier_demo_db_version", DEMO_DB_VERSION);
    } catch {}
  }
}

const ok = (data?: any, message = "تم بنجاح") => ({ success: true, message, data });
const fail = (message: string) => ({ success: false, message });

export function isDemoToken(token: string | null | undefined) {
  return Boolean(token && token.startsWith("atelier_demo_token_"));
}

export function getDemoAccountByCredentials(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  return DEMO_ACCOUNTS.find((account) => account.email === normalized && account.password === password) || null;
}

export function getDemoUserByToken(token?: string | null): DemoUser {
  const account = DEMO_ACCOUNTS.find((item) => item.token === token);
  return clone(account?.user || DEMO_ACCOUNTS[0].user);
}

function canAccess(role: DemoRole, area: string) {
  if (role === "admin") return true;
  if (role === "supervisor") return !["users", "export"].includes(area);
  if (role === "sales") return ["dashboard", "customers", "dresses", "orders"].includes(area);
  return false;
}

export function handleDemoRequest(endpoint: string, options: RequestInit = {}, token?: string | null): any {
  const db = loadDb();
  const currentUser = getDemoUserByToken(token);
  const method = (options.method || "GET").toUpperCase();
  const body = typeof options.body === "string" && options.body ? JSON.parse(options.body) : {};
  const url = new URL(endpoint, "https://demo.local");
  const path = url.pathname;

  if (path === "/auth/verify" || path === "/auth/me") return ok({ user: currentUser });
  if (path === "/auth/change-password") return ok({}, "تغيير كلمة المرور غير مفعّل في النسخة التجريبية");

  if (path.startsWith("/users")) {
    if (!canAccess(currentUser.role, "users")) return fail("هذه الصفحة متاحة لمدير النظام فقط");

    if (path === "/users" && method === "GET") {
      return ok({ users: db.users });
    }

    if (path === "/users" && method === "POST") {
      if (!body.name || !body.email || !body.role) return fail("الاسم والبريد والدور مطلوبة");
      const user: DemoUser = {
        id: Date.now(),
        name: String(body.name),
        email: String(body.email).trim().toLowerCase(),
        role: body.role as DemoRole,
        is_active: body.is_active !== false,
        created_at: new Date().toISOString(),
      };
      db.users.unshift(user);
      saveDb(db);
      return ok({ user }, "تمت إضافة المستخدم");
    }

    const userMatch = path.match(/^\/users\/(\d+)$/);
    if (userMatch) {
      const id = Number(userMatch[1]);
      const index = db.users.findIndex((item) => item.id === id);
      if (index < 0) return fail("المستخدم غير موجود");
      if (method === "PUT" || method === "PATCH") {
        db.users[index] = { ...db.users[index], ...body, id };
        saveDb(db);
        return ok({ user: db.users[index] }, "تم تحديث المستخدم");
      }
    }
  }

  if (path === "/dashboard/summary") {
    const income = db.transactions.filter((x) => x.type === "income").reduce((sum, x) => sum + Number(x.amount || 0), 0);
    const expenses = db.transactions.filter((x) => x.type === "expense").reduce((sum, x) => sum + Number(x.amount || 0), 0);
    return ok({
      financials: {
        monthly: { income, expenses, profit: income - expenses },
        yearly: { income: income * 6, expenses: expenses * 6, profit: (income - expenses) * 6 }
      },
      orders: { open: db.orders.filter((x) => x.status === "active").length, totalActive: db.orders.length },
      customers: { total: db.customers.length, newThisMonth: db.customers.length },
      dresses: { available: db.dresses.filter((x) => x.status === "available").length, total: db.dresses.length }
    });
  }

  if (path === "/dashboard/upcoming-events") return ok({ events: db.orders });
  if (path === "/dashboard/recent-transactions") return ok({ transactions: canAccess(currentUser.role, "transactions") ? db.transactions.slice(0, 10) : [] });
  if (path === "/dashboard/monthly-chart") return ok({ chart: [] });
  if (path === "/dashboard/top-dresses") return ok({ dresses: db.dresses.slice(0, 5) });
  if (path === "/dashboard/requires-attention") return ok({ items: [] });

  if (path === "/customers/search/quick") {
    const q = (url.searchParams.get("q") || "").toLowerCase();
    return ok({ customers: db.customers.filter((customer) => customer.name.toLowerCase().includes(q) || String(customer.phone || "").includes(q)).slice(0, 10) });
  }
  if (path === "/customers" && method === "GET") {
    const q = (url.searchParams.get("search") || "").toLowerCase();
    const customers = db.customers.filter((customer) => !q || customer.name.toLowerCase().includes(q) || String(customer.phone || "").includes(q));
    return ok({ customers, pagination: { total: customers.length, page: 1, limit: customers.length || 1, totalPages: 1 } });
  }
  if (path === "/customers" && method === "POST") {
    const customer = { id: Date.now(), ...body, created_at: new Date().toISOString() };
    db.customers.unshift(customer);
    saveDb(db);
    return ok({ customer }, "تمت إضافة العميل");
  }
  const customerMatch = path.match(/^\/customers\/(\d+)$/);
  if (customerMatch) {
    const id = Number(customerMatch[1]);
    const index = db.customers.findIndex((item) => item.id === id);
    if (index < 0) return fail("العميل غير موجود");
    if (method === "GET") return ok({ customer: db.customers[index] });
    if (method === "PUT") {
      db.customers[index] = { ...db.customers[index], ...body };
      saveDb(db);
      return ok({ customer: db.customers[index] });
    }
  }
  if (path === "/customers/merge") return ok({}, "تم دمج العملاء");

  if (path === "/dresses/available") return ok({ dresses: db.dresses.filter((item) => item.status === "available") });
  if (path === "/dresses" && method === "GET") {
    const q = (url.searchParams.get("search") || "").toLowerCase();
    const dresses = db.dresses.filter((item) =>
      !q ||
      item.name.toLowerCase().includes(q) ||
      String(item.code || "").toLowerCase().includes(q) ||
      String(item.category || "").toLowerCase().includes(q) ||
      String(item.notes || "").toLowerCase().includes(q)
    );
    return ok({ dresses, pagination: { total: dresses.length, page: 1, limit: dresses.length || 1, totalPages: 1 } });
  }
  if (path === "/dresses" && method === "POST") {
    const dress = {
      id: Date.now(),
      code: body.code || `IT-${String(Date.now()).slice(-5)}`,
      category: body.category || "زفاف",
      total_income: 0,
      rental_count: 0,
      status: "available",
      ...body,
      updated_at: new Date().toISOString()
    };
    db.dresses.unshift(dress);
    saveDb(db);
    return ok({ dress }, "تمت إضافة القطعة");
  }
  const dressMatch = path.match(/^\/dresses\/(\d+)(?:\/status|\/rental)?$/);
  if (dressMatch) {
    const id = Number(dressMatch[1]);
    const index = db.dresses.findIndex((item) => item.id === id);
    if (index < 0) return fail("القطعة غير موجودة");
    if (path.endsWith("/status")) {
      db.dresses[index].status = body.status;
      saveDb(db);
      return ok({ dress: db.dresses[index] });
    }
    if (path.endsWith("/rental")) return ok({}, "تم تسجيل الإيجار");
    if (method === "GET") return ok({ dress: db.dresses[index] });
    if (method === "PUT") {
      db.dresses[index] = { ...db.dresses[index], ...body };
      saveDb(db);
      return ok({ dress: db.dresses[index] });
    }
  }
  if (path === "/dresses/merge") return ok({}, "تم دمج القطع");
  if (path === "/dresses/upload") return ok({ imageUrl: "", thumbnailUrl: "" }, "رفع الصور غير مفعّل في النسخة التجريبية");

  if (path.startsWith("/transactions") && !canAccess(currentUser.role, "transactions")) {
    return fail("الحسابات غير متاحة لهذا المستخدم");
  }
  if (path === "/transactions/summary") {
    const income = db.transactions.filter((x) => x.type === "income").reduce((sum, x) => sum + Number(x.amount || 0), 0);
    const expenses = db.transactions.filter((x) => x.type === "expense").reduce((sum, x) => sum + Number(x.amount || 0), 0);
    return ok({ income, expenses, profit: income - expenses });
  }
  if (path === "/transactions" && method === "GET") {
    return ok({ transactions: db.transactions, pagination: { total: db.transactions.length, page: 1, limit: db.transactions.length || 1, totalPages: 1 } });
  }
  if (path === "/transactions" && method === "POST") {
    const transaction = { id: Date.now(), employee_name: currentUser.name, ...body, created_at: new Date().toISOString() };
    db.transactions.unshift(transaction);
    saveDb(db);
    return ok({ transaction }, "تم تسجيل الحركة");
  }
  const transactionMatch = path.match(/^\/transactions\/(\d+)$/);
  if (transactionMatch) {
    const id = Number(transactionMatch[1]);
    const index = db.transactions.findIndex((item) => item.id === id);
    if (index < 0) return fail("الحركة غير موجودة");
    if (method === "GET") return ok({ transaction: db.transactions[index] });
    if (method === "PUT") {
      db.transactions[index] = { ...db.transactions[index], ...body };
      saveDb(db);
      return ok({ transaction: db.transactions[index] });
    }
    if (method === "DELETE") {
      db.transactions.splice(index, 1);
      saveDb(db);
      return ok({});
    }
  }

  if (path === "/orders/upcoming") return ok({ orders: db.orders });
  if (path === "/orders" && method === "GET") {
    return ok({ orders: db.orders, pagination: { total: db.orders.length, page: 1, limit: db.orders.length || 1, totalPages: 1 } });
  }
  if (path === "/orders" && method === "POST") {
    const order = {
      id: Date.now(),
      status: "active",
      paid_amount: Number(body.deposit_amount || 0),
      deposit_amount: 0,
      sales_user_id: currentUser.id,
      sales_user_name: currentUser.name,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.orders.unshift(order);

    if (Array.isArray(body.items)) {
      for (const orderItem of body.items) {
        if (!orderItem.dress_id || !body.event_date) continue;
        const dress = db.dresses.find((item) => item.id === Number(orderItem.dress_id));
        if (!dress || orderItem.item_type !== "rental") continue;
        const eventDate = String(body.event_date).slice(0, 10);
        dress.booked_dates = Array.from(new Set([...(dress.booked_dates || []), eventDate]));
        dress.upcoming_orders = [
          ...(dress.upcoming_orders || []),
          {
            order_id: order.id,
            event_date: eventDate,
            order_status: "active",
            customer_name: order.customer_name || "عميل",
            wearer_name: orderItem.wearer_name || ""
          }
        ];
      }
    }

    saveDb(db);
    return ok({ order }, "تم إنشاء الحجز");
  }
  if (path === "/orders/merge") return ok({}, "تم دمج الحجوزات");
  const orderMatch = path.match(/^\/orders\/(\d+)(?:\/status|\/payment|\/attachments.*)?$/);
  if (orderMatch) {
    const id = Number(orderMatch[1]);
    const index = db.orders.findIndex((item) => item.id === id);
    if (path.includes("/attachments")) return ok({ attachments: [] });
    if (index < 0) return fail("الحجز غير موجود");
    if (path.endsWith("/status")) {
      db.orders[index].status = body.status;
      saveDb(db);
      return ok({ order: db.orders[index] });
    }
    if (path.endsWith("/payment")) {
      db.orders[index].paid_amount = Number(db.orders[index].paid_amount || 0) + Number(body.amount || 0);
      saveDb(db);
      return ok({ order: db.orders[index] }, "تم تسجيل الدفعة");
    }
    if (method === "GET") return ok({ order: db.orders[index] });
    if (method === "PUT") {
      db.orders[index] = { ...db.orders[index], ...body, updated_at: new Date().toISOString() };
      saveDb(db);
      return ok({ order: db.orders[index] });
    }
    if (method === "DELETE") {
      db.orders.splice(index, 1);
      saveDb(db);
      return ok({});
    }
  }

  if (path.startsWith("/agreements") && !canAccess(currentUser.role, "agreements")) {
    return fail("العقود غير متاحة لهذا المستخدم");
  }
  if (path === "/agreements/config") return ok({ businessName: "نظام إدارة الأتيليه" });
  if (path === "/agreements/content/terms") return ok({ terms: "شروط تجريبية" });
  if (path.startsWith("/agreements")) return ok({ agreements: [] });

  if (path === "/export/datasets") {
    if (!canAccess(currentUser.role, "export")) return fail("تصدير البيانات متاح لمدير النظام فقط");
    return ok({ datasets: [] });
  }

  return ok({});
}
