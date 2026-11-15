import type { Allergen, Lang, LocalizedString } from "./types";

export const t = (s: LocalizedString | undefined, lang: Lang) => (s ? s[lang] || s.ar || s.en : "");

const nf = {
  ar: new Intl.NumberFormat("ar-SA", { numberingSystem: "arab", maximumFractionDigits: 2 }),
  en: new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }),
};

export const formatNumber = (n: number, lang: Lang) => nf[lang].format(n);

/** `٩٥ ر.س` in Arabic, `SAR 95` in English. */
export const formatPrice = (n: number, lang: Lang) =>
  lang === "ar" ? `${formatNumber(n, lang)} ر.س` : `SAR ${formatNumber(n, lang)}`;

/** `null` means the kitchen hasn't supplied a value yet: shown as "—" instead of a made-up number. */
export const formatCalories = (n: number | null, lang: Lang) =>
  n === null ? (lang === "ar" ? "— سعرة" : "— cal") : lang === "ar" ? `${formatNumber(n, lang)} سعرة` : `${formatNumber(n, lang)} cal`;

export const allergenLabels: Record<Allergen, LocalizedString> = {
  spicy: { ar: "حار", en: "Spicy" },
  nuts: { ar: "مكسرات", en: "Nuts" },
  dairy: { ar: "ألبان", en: "Dairy" },
  gluten: { ar: "غلوتين", en: "Gluten" },
  seed: { ar: "بقوليات / بذور", en: "Bean / Seed" },
  fish: { ar: "أسماك", en: "Fish" },
  chef: { ar: "اختيار الشيف", en: "Chef's Choice" },
};

const dict = {
  table: { ar: "طاولة رقم", en: "Table #" },
  featured: { ar: "مختارات الشيف", en: "Chef's Showcase" },
  menu: { ar: "قائمة الطعام", en: "The Menu" },
  soldOut: { ar: "نفدت الكمية", en: "Sold Out" },
  addToOrder: { ar: "أضف للطلب", en: "Add to Order" },
  customizeOrder: { ar: "خصّص واطلب", en: "Customize & Order" },
  required: { ar: "إلزامي", en: "Required" },
  optional: { ar: "اختياري", en: "Optional" },
  allergens: { ar: "مسببات الحساسية", en: "Allergens & Dietary" },
  noAllergens: { ar: "لا توجد مسببات حساسية معروفة", en: "No declared allergens" },
  energy: { ar: "القيمة الحرارية", en: "Energy" },
  quantity: { ar: "الكمية", en: "Quantity" },
  items: { ar: "أصناف", en: "items" },
  item: { ar: "صنف", en: "item" },
  viewOrder: { ar: "عرض الطلب", en: "View Order" },
  yourOrder: { ar: "طلبك", en: "Your Order" },
  emptyCart: { ar: "سلتك فارغة — اكتشف أطباقنا المميزة", en: "Your order is empty — explore our signature dishes" },
  kitchenNotes: { ar: "ملاحظات للمطبخ", en: "Notes for the kitchen" },
  dishNote: { ar: "ملاحظات التخصيص", en: "Customisation notes" },
  dishNotePh: { ar: "مثال: بدون بصل، الصلصة جانباً…", en: "e.g. no onions, sauce on the side…" },
  kitchenNotesPh: { ar: "مثال: بدون بصل، حساسية من الفول السوداني…", en: "e.g. no onions, peanut allergy…" },
  subtotal: { ar: "المجموع", en: "Total" },
  vatIncluded: { ar: "شامل ضريبة القيمة المضافة ١٥٪", en: "Incl. 15% VAT" },
  vatAmount: { ar: "منها ضريبة", en: "of which VAT" },
  sendWhatsApp: { ar: "إرسال الطلب عبر واتساب", en: "Send Order via WhatsApp" },
  callWaiter: { ar: "طلب النادل", en: "Call Waiter" },
  requestBill: { ar: "طلب الفاتورة", en: "Request Bill" },
  waiterOnWay: { ar: "تم إبلاغ النادل، سيصلك خلال لحظات", en: "Your waiter has been notified" },
  billOnWay: { ar: "جارٍ تجهيز فاتورتك", en: "Your bill is on its way" },
  addedToOrder: { ar: "أُضيف إلى طلبك", en: "Added to your order" },
  chooseRequired: { ar: "يرجى اختيار", en: "Please choose" },
  clear: { ar: "إفراغ", en: "Clear" },
  service: { ar: "الخدمة", en: "Service" },
  close: { ar: "إغلاق", en: "Close" },
  sfda: {
    ar: "يحتاج البالغون إلى ٢٠٠٠ سعرة حرارية في المتوسط يومياً، وقد تختلف الاحتياجات من شخص لآخر",
    en: "Adults need an average of 2,000 calories a day; individual needs may vary",
  },
  pricesNote: { ar: "جميع الأسعار بالريال السعودي وتشمل ضريبة القيمة المضافة 15%", en: "All prices in SAR · 15% VAT included" },
} satisfies Record<string, LocalizedString>;

export type DictKey = keyof typeof dict;
export const tr = (key: DictKey, lang: Lang) => dict[key][lang];
