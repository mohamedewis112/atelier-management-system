/**
 * Email & Google Integration Service
 *
 * Purpose: Send all outgoing communication and Google integration events
 * (agreement/order/income/expense emails, calendar events, tasks, Drive
 * uploads, Sheets appends) through the Apps Script Web App.
 *
 * Operation (single transport — HTTPS POST):
 *   - Every call ultimately goes through `postToAppsScriptWebApp()` which
 *     POSTs a JSON payload to `APPS_SCRIPT_WEB_APP_URL` over HTTPS.
 *   - Apps Script (`apps_script/Code.js` `doPost`) routes the payload by
 *     `type` and either sends an email via `GmailApp.sendEmail()` or
 *     performs the requested Google action.
 *   - There is NO SMTP / nodemailer transport in the backend. The dependency
 *     was removed in v0.9.0 because cloud VPS providers (e.g. DigitalOcean)
 *     block outbound SMTP ports.
 *   - There is NO email-polling fallback either. If `APPS_SCRIPT_WEB_APP_URL`
 *     is not configured, calls return `{ success: false, error: ... }` and
 *     the error is logged for the developer to investigate.
 */

import { businessConfig, appsScriptConfig } from '../config/index.js';
import { logActivity, LogCategory, LogAction } from './logger.js';
import { normalizePhoneNumber } from './phone.js';

// ---------------------------------------------------------------------------
// Emoji-safe HTML icons.
// GmailApp.sendEmail() via Apps Script sometimes corrupts 4-byte UTF-8 emoji
// characters (📅, 📎, etc.) into diamond question-marks. Using small inline
// SVG-like styled HTML spans avoids encoding issues entirely.
// ---------------------------------------------------------------------------
const ICON = {
  calendar: '<span style="color:#8e44ad;">&#9654;</span>',  // ▶
  clock: '<span style="color:#555;">&#9200;</span>',      // ⏰ (clock, BMP)
  duration: '<span style="color:#555;">&#8987;</span>',      // ⏳ (hourglass, BMP)
  people: '<span style="color:#555;">&#9679;</span>',      // ●
  phone: '<span style="color:#555;">&#9742;</span>',      // ☎
  pin: '<span style="color:#c0392b;">&#9679;</span>',   // ●
  map: '<span style="color:#1a73e8;">&#9654;</span>',   // ▶
  person: '<span style="color:#8e44ad;">&#9679;</span>',   // ●
  email: '<span style="color:#555;">&#9993;</span>',      // ✉
  clip: '<span style="color:#28a745;">&#10004;</span>',  // ✔
  sign: '<span style="color:#8e44ad;">&#9998;</span>',   // ✎
  note: '<span style="color:#8e44ad;">&#9998;</span>',   // ✎
  money: '<span style="color:#28a745;">&#9632;</span>',   // ■
  card: '<span style="color:#555;">&#9632;</span>',      // ■
  tag: '<span style="color:#555;">&#9654;</span>',      // ▶
  dress: '<span style="color:#8e44ad;">&#9654;</span>',   // ▶
  shop: '<span style="color:#555;">&#9654;</span>',      // ▶
  box: '<span style="color:#555;">&#9654;</span>',      // ▶
  expense: '<span style="color:#dc3545;">&#9632;</span>',   // ■
  whatsapp: '<span style="color:#25D366;">&#9742;</span>',   // ☎
  check: '<span style="color:#28a745;">&#10004;</span>',  // ✔
};

/**
 * Check if email sending method is available (Apps Script Web App).
 */
export function isEmailEnabled() {
  return appsScriptConfig.enabled;
}

/**
 * Post a JSON payload directly to the Apps Script Web App via HTTPS.
 * 
 * Purpose: This is the core transport function that replaces email-based
 * communication with Apps Script. It sends data over HTTPS (port 443)
 * which is never blocked by cloud providers.
 * 
 * @param {Object} payload - The JSON body to send
 * @returns {Object} { success, ... } response from Apps Script
 */
async function postToAppsScriptWebApp(payload) {
  if (!appsScriptConfig.enabled) {
    return { success: false, error: 'Apps Script Web App URL not configured' };
  }

  try {
    const response = await fetch(appsScriptConfig.webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120000), // 120s timeout for heavy Drive operations
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Apps Script Web App error (${response.status}):`, text);
      return { success: false, error: `HTTP ${response.status}: ${text}` };
    }

    const result = await response.json();
    console.log(`Apps Script Web App response:`, JSON.stringify(result));
    return result;

  } catch (error) {
    console.error('Apps Script Web App POST failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send email using Apps Script Web App.
 * 
 * Strategy:
 * 1. Check if Apps Script Web App is configured.
 * 2. Send payload (type: send_email) to the Web App via HTTP POST.
 * 3. Return success/failure.
 * 
 * SMTP is no longer supported as it is blocked on cloud VPS environments.
 */
async function sendEmail(options) {
  if (!appsScriptConfig.enabled) {
    console.warn('Apps Script Web App not configured - cannot send email');
    return { success: false, reason: 'Apps Script Web App not configured' };
  }

  try {
    const webAppPayload = {
      type: 'send_email',
      to: options.to,
      subject: options.subject,
      htmlBody: options.html || '',
      textBody: options.text || '',
    };

    // Convert attachments to base64 for Apps Script
    if (options.attachments && options.attachments.length > 0) {
      webAppPayload.attachments = options.attachments.map(att => ({
        filename: att.filename,
        content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content,
        contentType: att.contentType || 'application/octet-stream',
      }));
    }

    const result = await postToAppsScriptWebApp(webAppPayload);

    if (result.success) {
      logActivity({
        action: LogAction.CREATE,
        category: LogCategory.SYSTEM,
        entityType: 'email',
        entityName: options.subject,
        details: { to: options.to, via: 'apps-script-webapp', messageId: result.messageId },
      });
      console.log(`Email sent via Apps Script: ${options.subject} to ${options.to}`);
      return { success: true, messageId: result.messageId };
    }

    console.error(`Apps Script email failed: ${result.error}`);
    return { success: false, error: result.error };

  } catch (error) {
    console.error(`Apps Script Web App error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Format date in Hebrew
 */
function formatDateHebrew(date) {
  return new Date(date).toLocaleDateString('he-IL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Jerusalem',
  });
}

/**
 * Create WhatsApp link
 */
function createWhatsAppLink(phone, message = '') {
  let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  if (cleanPhone.startsWith('05')) {
    cleanPhone = '972' + cleanPhone.substring(1);
  } else if (cleanPhone.startsWith('+972')) {
    cleanPhone = cleanPhone.substring(1);
  }
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}${message ? `?text=${encodedMessage}` : ''}`;
}

// ============================================
// AGREEMENT EMAILS
// ============================================

/**
 * Send agreement confirmation to customer
 */
export async function sendAgreementConfirmationToCustomer({
  customerName,
  customerEmail,
  customerPhone,
  eventDate,
  pdfBuffer = null,
}) {
  if (!customerEmail) {
    console.log('No customer email provided, skipping agreement confirmation email');
    return { success: false, reason: 'No email provided' };
  }

  const eventDateFormatted = eventDate ? formatDateHebrew(eventDate) : 'غير محدد';
  const signedAt = formatDateHebrew(new Date()) + ' ' + new Date().toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jerusalem',
  });

  const subject = `اتفاقية تأجير الملابس - ${customerName}`;

  const textBody = `
سلام ${customerName},

مرفق الاتفاقية الموقعة لتأجير قطعة السهرة.

تفاصيل الطلب:
- تاريخ الحدث: ${eventDateFormatted}
- تاريخ توقيع الاتفاقية: ${signedAt}

الاتفاقية كاملة مرفقة كملف PDF.

شكرا لاختيارك ب${businessConfig.name}!

مرحباً,
${businessConfig.name}
الهاتف: ${businessConfig.phone}
  `.trim();

  const htmlBody = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: right;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #8e44ad; margin-bottom: 10px;">عقد تأجير قطع السهرة</h2>
        <h3 style="color: #555; font-weight: normal;">${businessConfig.name}</h3>
      </div>
      
      <p>سلام ${customerName},</p>
      <p>مرفق الاتفاقية الموقعة لتأجير قطعة السهرة.</p>
      
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p>${ICON.calendar} <strong>تاريخ الحدث:</strong> ${eventDateFormatted}</p>
        <p>${ICON.sign} <strong>تاريخ توقيع الاتفاقية:</strong> ${signedAt}</p>
      </div>
      
      <p style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; border-right: 4px solid #28a745;">
        ${ICON.check} <strong>الاتفاقية كاملة مرفقة كملف PDF</strong><br>
        الملف يتضمن كافة الشروط, تفاصيل العميل والتوقيع الرقمي.
      </p>
      
      <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 5px; text-align: center;">
        <p style="margin: 0; color: #666;">شكرا لاختيارك بوتيك قطع السهرة!</p>
        <p style="margin: 5px 0 0 0; font-weight: bold; color: #8e44ad;">${businessConfig.name}</p>
        <p style="margin: 5px 0 0 0; color: #666;">${ICON.phone} ${businessConfig.phone}</p>
      </div>
    </div>
  `;

  const attachments = [];
  if (pdfBuffer) {
    attachments.push({
      filename: `اتفاقية تأجير الملابس - ${customerName}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    });
  }

  return sendEmail({
    to: customerEmail,
    subject,
    text: textBody,
    html: htmlBody,
    attachments,
  });
}

/**
 * Send agreement notification to business owner
 */
export async function sendAgreementNotificationToOwner({
  customerName,
  customerPhone,
  customerEmail,
  eventDate,
  pdfBuffer = null,
}) {
  const eventDateFormatted = eventDate ? formatDateHebrew(eventDate) : 'غير محدد';
  const whatsappUrl = createWhatsAppLink(customerPhone);

  const subject = `وتم التوقيع على اتفاقية جديدة - ${customerName}`;

  const textBody = `
تم استلام اتفاقية موقعة جديدة:

عميل: ${customerName}
الهاتف: ${customerPhone}
بريد: ${customerEmail || 'غير محدد'}

تاريخ الحدث: ${eventDateFormatted}

واتساب: ${whatsappUrl}
  `.trim();

  const htmlBody = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: right;">
      <h2 style="color: #8e44ad; text-align: center;">${ICON.note} وتم التوقيع على اتفاقية جديدة</h2>
      
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p>${ICON.person} <strong>عميل:</strong> ${customerName}</p>
        <p>${ICON.phone} <strong>الهاتف:</strong> ${customerPhone}</p>
        <p>${ICON.email} <strong>بريد:</strong> ${customerEmail || 'غير محدد'}</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">
        <p>${ICON.calendar} <strong>تاريخ الحدث:</strong> ${eventDateFormatted}</p>
      </div>
      
      <p style="text-align: center;">
        <a href="${whatsappUrl}" style="display: inline-block; background-color: #25D366; color: white; padding: 12px 24px; text-decoration: none; border-radius: 25px; font-weight: bold;">
          ${ICON.whatsapp} واتساب للعميل
        </a>
      </p>
    </div>
  `;

  const attachments = [];
  if (pdfBuffer) {
    attachments.push({
      filename: `عقد - ${customerName}.pdf`,
      content: pdfBuffer,
      contentType: 'application/pdf',
    });
  }

  return sendEmail({
    to: businessConfig.email,
    subject,
    text: textBody,
    html: htmlBody,
    attachments,
  });
}

// ============================================
// INCOME & ORDER EMAILS (to business owner)
// ============================================

/**
 * Send new income notification to business notification email
 */
export async function sendNewIncomeNotification({
  amount,
  category,
  customerName,
  dressName,
  paymentMethod,
  notes,
  transactionDate,
  fileBase64,
  fileName
}) {
  const formattedDate = transactionDate ? formatDateHebrew(transactionDate) : formatDateHebrew(new Date());

  const subject = `دخل جديد: ₪${amount} - ${customerName || category}`;

  const htmlBody = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: right;">
      <h2 style="color: #28a745; text-align: center;">${ICON.money} دخل جديد</h2>
      
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p>${ICON.money} <strong>المبلغ:</strong> <span style="font-size: 1.2em; font-weight: bold;">₪${amount}</span></p>
        <p>${ICON.tag} <strong>فئة:</strong> ${category}</p>
        ${customerName ? `<p>${ICON.person} <strong>عميل:</strong> ${customerName}</p>` : ''}
        ${dressName ? `<p>${ICON.dress} <strong>قطعة:</strong> ${dressName}</p>` : ''}
        <p>${ICON.card} <strong>طريقة الدفع:</strong> ${paymentMethod || 'غير محدد'}</p>
        <p>${ICON.calendar} <strong>التاريخ:</strong> ${formattedDate}</p>
      </div>
      
      ${notes ? `<div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0;"><p>${ICON.note} <strong>ملاحظات:</strong> ${notes}</p></div>` : ''}
      
      <!-- FILE_LINK_PLACEHOLDER -->
      {{FILE_LINK}}
      
      <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
        <p>يتم إرسالها تلقائيًا من نظام الإدارة</p>
      </div>
    </div>
  `;

  console.log('Sending new income notification to Apps Script');

  return sendToAppsScript({
    type: 'income_notification',
    data: {
      amount,
      category,
      customerName,
      dressName,
      paymentMethod,
      notes,
      transactionDate,
      timestamp: new Date().toISOString()
    },
    htmlBody,
    subject,
    fileBase64,
    fileName
  });
}

/**
 * Send new expense notification to business notification email
 */
export async function sendNewExpenseNotification({
  amount,
  category,
  supplier,
  product,
  notes,
  transactionDate,
  fileBase64,
  fileName
}) {
  const formattedDate = transactionDate ? formatDateHebrew(transactionDate) : formatDateHebrew(new Date());

  const subject = `إصدار جديد: ₪${amount} - ${supplier || category}`;

  const htmlBody = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: right;">
      <h2 style="color: #dc3545; text-align: center;">${ICON.expense} إصدار جديد</h2>
      
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p>${ICON.expense} <strong>المبلغ:</strong> <span style="font-size: 1.2em; font-weight: bold;">₪${amount}</span></p>
        <p>${ICON.tag} <strong>فئة:</strong> ${category}</p>
        ${supplier ? `<p>${ICON.shop} <strong>مزود:</strong> ${supplier}</p>` : ''}
        ${product ? `<p>${ICON.box} <strong>منتج/خدمة:</strong> ${product}</p>` : ''}
        <p>${ICON.calendar} <strong>التاريخ:</strong> ${formattedDate}</p>
      </div>
      
      ${notes ? `<div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0;"><p>${ICON.note} <strong>ملاحظات:</strong> ${notes}</p></div>` : ''}
      
      <!-- FILE_LINK_PLACEHOLDER -->
      {{FILE_LINK}}
      
      <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
        <p>يتم إرسالها تلقائيًا من نظام الإدارة</p>
      </div>
    </div>
  `;

  console.log('Sending new expense notification to Apps Script');

  return sendToAppsScript({
    type: 'expense_notification',
    data: {
      amount,
      category,
      supplier,
      product,
      notes,
      transactionDate,
      timestamp: new Date().toISOString()
    },
    htmlBody,
    subject,
    fileBase64,
    fileName
  });
}

/**
 * Send new order notification to business notification email
 */
export async function sendNewOrderNotification({
  customerName,
  customerPhone,
  customerEmail,
  eventDate,
  orderSummary,
  dresses, // Array of { name, price, itemType, itemTypeLabel }
  totalPrice,
  deposit,
  depositPayments, // Array of detailed payments with potential files
  notes,
}) {
  const eventDateFormatted = eventDate ? formatDateHebrew(eventDate) : 'غير محدد';
  const normalizedCustomerPhone = normalizePhoneNumber(customerPhone) || customerPhone;
  const typeLabelMap = {
    rental: 'إيجار',
    sewing_for_rental: 'الخياطة التي تبقى في الإيجار',
    sewing: 'تفصيل',
    sale: 'بيع',
  };
  const firstItemTypeLabel = dresses && dresses.length > 0
    ? (dresses[0].itemTypeLabel || typeLabelMap[dresses[0].itemType] || 'حجز')
    : 'حجز';
  const computedOrderSummary = orderSummary || (
    dresses && dresses.length > 0
      ? dresses.map((d) => `${d.itemTypeLabel || typeLabelMap[d.itemType] || 'قطعة'} ${d.name}`.trim()).join(', ')
      : ''
  );

  // Build dresses list
  const dressesText = dresses && dresses.length > 0
    ? dresses.map(d => `${d.itemTypeLabel || typeLabelMap[d.itemType] || ''} ${d.name} - ₪${d.price}`.trim()).join('\n')
    : 'لم يتم تحديد القطع';

  const dressesHtml = dresses && dresses.length > 0
    ? dresses.map(d => `<li>${d.itemTypeLabel || typeLabelMap[d.itemType] || 'قطعة'}: ${d.name} - ₪${d.price}</li>`).join('')
    : '<li>لم يتم تحديد القطع</li>';

  // Build deposit details string if available
  let depositDetailsText = '';
  if (depositPayments && depositPayments.length > 0) {
    depositDetailsText = '\nتفاصيل التقدم:\n' + depositPayments.map(p => {
      const confirmStr = p.confirmationNumber ? ` (مرجع: ${p.confirmationNumber})` : '';
      return `- ₪${p.amount} نص${p.method}${confirmStr}`;
    }).join('\n');
  }

  const remaining = totalPrice - (deposit || 0);

  const subjectDetails = computedOrderSummary || firstItemTypeLabel;
  const subject = `طلب جديد: ${customerName}${subjectDetails ? ` - ${subjectDetails}` : ''}`;

  const textBody = `
تم استلام طلب جديد:

عميل: ${customerName}
الهاتف: ${normalizedCustomerPhone}
يكتب: ${firstItemTypeLabel}
تاريخ الحدث: ${eventDateFormatted}

قطع:
${dressesText}

السعر الإجمالي: ₪${totalPrice}
يتقدم: ₪${deposit || 0}${depositDetailsText}
الرصيد المستحق: ₪${remaining}

${computedOrderSummary ? `ما أغلق: ${computedOrderSummary}` : ''}
${customerEmail ? `البريد الإلكتروني: ${customerEmail}` : ''}
${notes ? `ملاحظات: ${notes}` : ''}
  `.trim();

  // Create HTML list for deposit payments
  let depositHtml = '';
  if (depositPayments && depositPayments.length > 0) {
    const items = depositPayments.map(p => {
      const confirmStr = p.confirmationNumber ? ` <span style="font-size:0.9em; color:#666;">(مرجع: ${p.confirmationNumber})</span>` : '';
      const fileStr = p.hasFile ? ' &#10004;' : '';
      return `<li>₪${p.amount} نص${p.method}${confirmStr}${fileStr}</li>`;
    }).join('');
    depositHtml = `<ul style="margin: 5px 0;">${items}</ul>`;
  }

  const htmlBody = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: right;">
      <h2 style="color: #8e44ad; text-align: center;">طلب جديد</h2>
      
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p>${ICON.person} <strong>عميل:</strong> ${customerName}</p>
        <p>${ICON.phone} <strong>الهاتف:</strong> ${normalizedCustomerPhone}</p>
        ${customerEmail ? `<p>${ICON.email} <strong>البريد الإلكتروني:</strong> ${customerEmail}</p>` : ''}
        <p>${ICON.note} <strong>يكتب:</strong> ${firstItemTypeLabel}</p>
        <p>${ICON.calendar} <strong>تاريخ الحدث:</strong> ${eventDateFormatted}</p>
        ${computedOrderSummary ? `<p>${ICON.check} <strong>ما أغلق:</strong> ${computedOrderSummary}</p>` : ''}
      </div>
      
      <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffc107;">
        <p style="margin: 0 0 10px 0;">${ICON.dress} <strong>قطع:</strong></p>
        <ul style="margin: 0; padding-right: 20px;">
          ${dressesHtml}
        </ul>
      </div>
      
      <div style="background-color: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #c3e6cb;">
        <p>${ICON.money} <strong>السعر الإجمالي:</strong> ₪${totalPrice}</p>
        <p>${ICON.card} <strong>يتقدم:</strong> ₪${deposit || 0}</p>
        ${depositHtml ? `<div style="margin-top:5px; padding-top:5px; border-top:1px dashed #ccc;"><strong>التفاصيل:</strong>${depositHtml}</div>` : ''}
        <p style="font-weight: bold; color: #155724;">${ICON.money} <strong>الرصيد المستحق:</strong> ₪${remaining}</p>
      </div>
      
      ${notes ? `<p>${ICON.note} <strong>ملاحظات:</strong> ${notes}</p>` : ''}
      
      <!-- FILE_LINK_PLACEHOLDER -->
      {{FILE_LINK}}
    </div>
  `;

  console.log('Sending new order notification to Apps Script');

  return sendToAppsScript({
    type: 'order_notification',
    data: {
      customerName,
      customerPhone: normalizedCustomerPhone,
      customerEmail,
      orderSummary: computedOrderSummary,
      totalPrice,
      deposit,
      dresses,
      eventDate,
      depositPayments,
      notes
    },
    htmlBody,
    subject
  });
}

/**
 * Test email connection
 */
export async function testEmailConnection() {
  if (!isEmailEnabled()) {
    return { success: false, message: 'Email not configured' };
  }

  // With Apps Script, no easy verification except checking if URL is present.
  return { success: true, message: 'Apps Script URL configured' };
}

// ============================================
// GOOGLE APPS SCRIPT INTEGRATION
// ============================================

/**
 * Send JSON payload to Google Apps Script via direct HTTP POST.
 *
 * Purpose: Communicate business events (calendar, tasks, etc.) to
 * the Apps Script Web App in real time.
 *
 * Operation: Posts the payload to the configured Web App URL. If the
 * URL is not configured or the request fails, the error is logged so
 * developers can investigate. No email fallback — the VPS has no SMTP
 * and the Apps Script email-trigger has been removed.
 *
 * @param {Object} payload - JSON payload with type and data
 * @returns {{ success: boolean, error?: string }}
 */
export async function sendToAppsScript(payload) {
  console.log(`Sending to Apps Script: ${payload.type}`);

  if (!appsScriptConfig.enabled) {
    const msg = `Apps Script Web App URL not configured — cannot send ${payload.type}`;
    console.error(msg);
    logActivity({
      action: LogAction.CREATE,
      category: LogCategory.SYSTEM,
      entityType: 'apps_script',
      entityName: payload.type,
      details: { error: msg },
    });
    return { success: false, error: msg };
  }

  const result = await postToAppsScriptWebApp(payload);

  if (result.success) {
    logActivity({
      action: LogAction.CREATE,
      category: LogCategory.SYSTEM,
      entityType: 'apps_script',
      entityName: payload.type,
      details: { via: 'webapp', result },
    });
  } else {
    const msg = `Apps Script Web App failed for ${payload.type}: ${result.error}`;
    console.error(msg);
    logActivity({
      action: LogAction.CREATE,
      category: LogCategory.SYSTEM,
      entityType: 'apps_script',
      entityName: payload.type,
      details: { error: result.error, via: 'webapp' },
    });
  }

  return result;
}

/**
 * Send calendar event to Google Apps Script
 * 
 * @param {string} title - Event title
 * @param {string} date - Event date (ISO string)
 * @param {boolean} allDay - Whether it's an all-day event
 */
export async function sendCalendarEvent({ title, date, allDay = true }) {
  return sendToAppsScript({
    type: 'calendar',
    title,
    date,
    allDay,
    timestamp: new Date().toISOString()
  });
}

/**
 * Send task to Google Tasks via Apps Script
 * 
 * @param {string} listName - Task list name (e.g., "العملاء")
 * @param {string} title - Task title with Hebrew date
 * @param {string} dueDate - Due date (ISO string)
 */
export async function sendTaskToGoogle({ listName = 'العملاء', title, dueDate }) {
  return sendToAppsScript({
    type: 'task',
    listName,
    title,
    dueDate,
    timestamp: new Date().toISOString()
  });
}

/**
 * Send file upload request to Google Drive via Apps Script
 * 
 * @param {string} fileName - Target file name (e.g., "260203 محل 150₪.jpg")
 * @param {string} folder - Folder path (e.g., "2026/مصروفات/النفقات المعروفة 2026")
 * @param {Buffer} fileBuffer - File content as Buffer
 */
export async function sendFileToDrive({ fileName, folder, fileBuffer }) {
  const fileBase64 = fileBuffer.toString('base64');

  return sendToAppsScript({
    type: 'drive',
    fileName,
    folder,
    fileBase64,
    timestamp: new Date().toISOString()
  });
}

/**
 * Send file rename/move request to Google Drive via Apps Script
 */
export async function sendDriveRename({ oldFolder, oldFileName, newFolder, newFileName }) {
  return sendToAppsScript({
    type: 'drive_rename',
    data: {
      oldFolder,
      oldFileName,
      newFolder,
      newFileName,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Send order update to sync Calendar and Tasks via Apps Script
 */
export async function sendOrderUpdate({ oldCustomerName, oldEventDate, newCustomerName, newEventDate, newOrderSummary }) {
  return sendToAppsScript({
    type: 'order_update',
    data: {
      oldCustomerName,
      oldEventDate,
      newCustomerName,
      newEventDate,
      newOrderSummary,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Send email list entry to Google Sheets via Apps Script
 * 
 * @param {string} email - Customer email
 * @param {string} name - Customer name
 */
export async function sendToEmailList({ email, name }) {
  return sendToAppsScript({
    type: 'sheets',
    sheet: 'قائمة_توزيع',
    data: [email, name],
    timestamp: new Date().toISOString()
  });
}

/**
 * Send detailed income notification to business owner
 * Human-readable format for easy copying
 * 
 * @param {Object} params - Income details
 */
export async function sendDetailedIncomeNotification({
  customerName,
  customerPhone,
  customerEmail,
  amount,
  paymentMethod,
  confirmationNumber,
  lastFourDigits,
  checkNumber,
  bankDetails,
  installments,
  fileBase64,
  fileName,
  isUpdate = false, // Add this parameter
}) {
  console.log(`Sending detailed income notification to Apps Script for ${customerName} (isUpdate: ${isUpdate})`);

  return sendToAppsScript({
    type: 'income_detailed',
    data: {
      customerName,
      customerPhone,
      customerEmail,
      amount,
      paymentMethod,
      confirmationNumber,
      lastFourDigits,
      checkNumber,
      bankDetails,
      installments,
      isUpdate, // Include in payload
      timestamp: new Date().toISOString()
    },
    fileBase64,
    fileName
  });
}

export default {
  isEmailEnabled,
  sendAgreementConfirmationToCustomer,
  sendAgreementNotificationToOwner,
  sendNewIncomeNotification,
  sendNewOrderNotification,
  // Google Apps Script integration
  sendToAppsScript,
  sendCalendarEvent,
  sendTaskToGoogle,
  sendFileToDrive,
  sendDriveRename,
  sendOrderUpdate,
  sendToEmailList,
  sendDetailedIncomeNotification,
};
