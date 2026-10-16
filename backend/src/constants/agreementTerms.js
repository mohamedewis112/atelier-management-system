/**
 * Agreement Terms Constants
 *
 * Purpose: Central source-of-truth for all agreement terms displayed in:
 *   - The public agreement signing page (frontend)
 *   - The generated agreement PDF
 *   - The /api/agreements/content/terms API endpoint
 *
 * Operation: Two term sets exist — full rental terms (for orders that contain
 * at least one rental or sewing_for_rental item) and reduced non-rental terms
 * (for orders that only contain sewing or sale items). The helper functions
 * `hasRentalItems()` and `getTermsForOrder()` determine which set to use
 * based on the order's item types.
 *
 * Cancellation policy is identical for all order types.
 */

// ---------------------------------------------------------------------------
// Full rental terms — shown when the order contains at least one
// item of type 'rental' or 'sewing_for_rental'.
// ---------------------------------------------------------------------------
export const AGREEMENT_TERMS = [
  'في يوم الطلب، ستكون هناك حاجة إلى دفع مبلغ مقدم للدورة 50% مبلغ النظام.',
  'وسيتم دفع باقي المبلغ في يوم استلام القطعة. لن يتم تسليم القطعة للعميل دون دفع كامل المبلغ.',
  'عند استئجار قطعة سهرة، سيتم دفع وديعة مساوية لمبلغ الإيجار عن طريق بطاقة الائتمان.',
  'سيتم تحرير الإطار الموجود على بطاقة الائتمان بعد إعادة القطعة بشكل صحيح في الوقت المحدد.',
  'في حالة التلف أو السرقة, سيتم تحميل العميل تكلفة إصلاح القطعة, إذا كان قابلاً للإصلاح, بالإضافة إلى الإيجار.',
  'إذا كان الثوب غير قابل للإصلاح, سيتم فرض رسوم على العميل تساوي تكلفة خياطة قطعة مماثل مصنوع حسب الطلب.',
  'سيتم تسليم القطعة للعميل 2 أيام عمل قبل تاريخ الحدث, وسيتم إعادتها داخل 2 أيام عمل بعد الحدث.',
  'يجب على العميل إعادة القطعة مع العلاقة والغطاء بعد انتهاء الفعالية. سيؤدي عدم إعادة العلاقة أو الغطاء إلى فرض غرامة قدرها 50₪.',
  'التأخير في إعادة القطعة سيؤدي إلى غرامة قدرها 200₪ لكل يوم متأخر.',
];

// ---------------------------------------------------------------------------
// Reduced non-rental terms — shown when all items in the order are
// 'sewing' (custom sewing) or 'sale' only, with no rental component.
// Clauses 3–6, 8–9 (deposit, return, damage, hanger, late fee) are omitted.
// Clause 7 is trimmed to delivery only (no return obligation).
// Wording adapted: "إيجار" → "حجز".
// ---------------------------------------------------------------------------
export const AGREEMENT_NON_RENTAL_TERMS = [
  'في يوم الطلب، ستكون هناك حاجة إلى دفع مبلغ مقدم للدورة 50% مبلغ النظام.',
  'وسيتم دفع باقي المبلغ في يوم استلام القطعة. لن يتم تسليم القطعة للعميل دون دفع كامل المبلغ.',
  'سيتم تسليم القطعة للعميل 2 أيام عمل قبل تاريخ الحدث.',
];

// ---------------------------------------------------------------------------
// Cancellation policy — applies to ALL order types equally.
// ---------------------------------------------------------------------------
export const AGREEMENT_CANCELLATION_POLICY = [
  'طالما لم يتم استلام تأكيد الطلب ولم يتم دفع السلفة, يمكنك إلغاء الطلب مجاناً.',
  'بعد تأكيد الطلب, يمكن إلغاؤها داخل 2 أيام العمل, في دفع 25% مبلغ النظام (سيتم إرجاع نصف المبلغ المقدم).',
  'بعد 2 أيام العمل, لا يمكن إلغاء الطلب, وسيطلب من العميل دفع المبلغ المتبقي.',
  'بعد تسليم القطعة للزبون, لا يمكن إلغاء الطلب أو إعادته.',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const RENTAL_ITEM_TYPES = ['rental', 'sewing_for_rental'];

/**
 * Check whether any order items involve rental (rental or sewing_for_rental).
 * Used to determine which agreement terms to display.
 *
 * Defaults to true (full rental terms) when no items are available, so the
 * strictest terms are shown if the order context is unknown.
 *
 * @param {Array} items - Array of order items with `item_type` or `itemType` field
 * @returns {boolean} True if at least one item is rental or sewing_for_rental
 */
export function hasRentalItems(items) {
  if (!Array.isArray(items) || items.length === 0) return true;
  return items.some((item) => {
    const type = String(item.item_type || item.itemType || '').trim().toLowerCase();
    return RENTAL_ITEM_TYPES.includes(type);
  });
}

/**
 * Get the appropriate agreement terms and heading based on order item types.
 *
 * @param {Array} items - Array of order items
 * @returns {{ terms: string[], heading: string, isRental: boolean }}
 */
export function getTermsForOrder(items) {
  const isRental = hasRentalItems(items);
  return {
    terms: isRental ? AGREEMENT_TERMS : AGREEMENT_NON_RENTAL_TERMS,
    heading: 'شروط',
    isRental,
  };
}
