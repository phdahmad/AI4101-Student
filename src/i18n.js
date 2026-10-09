// AI4101 · My Work — interface strings in English and Arabic.
// Course content (item titles, feedback) stays in English, the language of the course.
const LANG_KEY = 'ai4101_portal_lang';

export const STRINGS = {
  en: {
    skip: 'Skip to content',
    brandName: 'My Work',
    themeBtn: 'Switch light or dark mode',
    langBtn: 'عربي',
    langBtnLabel: 'اعرض الصفحة بالعربية',
    signOut: 'Sign out',
    eyebrow: 'Artificial Intelligence Principles',
    loginTitle: 'Your marked work',
    lead: 'See your marked work, your feedback, and your scanned sheets.',
    sidLabel: 'University ID',
    codeLabel: 'Access code',
    codeHint: 'Your instructor sent you this code in a private message.',
    loginError: 'Student ID or access code is incorrect.',
    openBtn: 'Open my work',
    opening: 'Opening…',
    helpPrivateStrong: 'Keep your code private.',
    helpPrivate: 'Anyone with your ID and code can see your work.',
    helpLost: 'Lost your code? Send your instructor a message on Blackboard.',
    footerCourse: 'AI4101 · Artificial Intelligence Principles · Umm Al-Qura University',
    footerPrivacy: 'Your work is decrypted only on this device. Nothing is stored after you sign out.',
    offline: 'Could not reach the page. Check your internet connection and try again.',
    idle: 'You were signed out after 15 minutes without activity.',
    term: 'First semester 1448 AH',
    id: 'ID',
    lab: (n) => `Lab section ${n}`,
    marksTitle: 'Course marks so far',
    marksSub: 'Marks count toward your course grade only after each assessment is marked.',
    marksNote: 'Your official grade is the one on the university system.',
    ofCourse: (w) => `${w}% of the course`,
    notMarked: 'Not marked yet',
    categories: { assignments: 'Assignments', quizzes: 'Quizzes', midterm: 'Midterm exam', project: 'Group project', final: 'Final exam' },
    kinds: {
      activity: ['In-class activities', 'In-class activity'], quiz: ['Quizzes', 'Quiz'],
      assignment: ['Assignments', 'Assignment'], lab: ['Labs', 'Lab'], midterm: ['Midterm exam', 'Midterm exam'],
      project: ['Group project', 'Group project'], final: ['Final exam', 'Final exam'],
    },
    status: {
      completed: 'Completed', graded: 'Marked', not_submitted: 'Not submitted',
      excused: 'Excused', marking: 'Being marked', upcoming: 'Not marked yet',
    },
    module: (n) => `Module ${n}`,
    back: 'All my work',
    scaled: (s, w) => `= ${s} of ${w} course marks`,
    feedback: 'Feedback',
    statusTitle: 'Status',
    introCompleted: 'You completed this activity. It is not graded — the feedback below is to help you learn.',
    introMissing: 'We have no sheet from you for this one. If you think this is a mistake, tell your instructor.',
    introExcused: 'You are excused from this one. It does not count against you.',
    reviewed: 'Reviewed by your instructor.',
    feedbackLang: '',
    sheet: 'Your sheet',
    sheetHint: 'Tap a page to open it. Pinch or double-tap to zoom.',
    page: (n) => `Page ${n}`,
    openPage: (n) => `Open page ${n}`,
    pageOf: (i, n) => `Page ${i} of ${n}`,
    scannedOf: (i, n) => `Scanned page ${i} of ${n}`,
    viewer: 'Scanned page',
    close: 'Close',
    prev: 'Previous page',
    next: 'Next page',
    zoomHint: 'Pinch or double-tap to zoom',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },
  ar: {
    skip: 'انتقل إلى المحتوى',
    brandName: 'أعمالي',
    themeBtn: 'التبديل بين الوضع الفاتح والداكن',
    langBtn: 'EN',
    langBtnLabel: 'View this page in English',
    signOut: 'خروج',
    eyebrow: 'مبادئ الذكاء الاصطناعي',
    loginTitle: 'أعمالك المصحّحة',
    lead: 'اطّلع على أعمالك المصحّحة والتغذية الراجعة وصور أوراقك.',
    sidLabel: 'الرقم الجامعي',
    codeLabel: 'رمز الدخول',
    codeHint: 'أرسل لك أستاذ المقرر هذا الرمز في رسالة خاصة.',
    loginError: 'الرقم الجامعي أو رمز الدخول غير صحيح.',
    openBtn: 'افتح أعمالي',
    opening: 'جارٍ الفتح…',
    helpPrivateStrong: 'رمزك خاص بك.',
    helpPrivate: 'من يعرف رقمك ورمزك يستطيع رؤية أعمالك، فلا تشاركه أحداً.',
    helpLost: 'فقدت رمزك؟ راسل أستاذ المقرر على Blackboard.',
    footerCourse: 'AI4101 · مبادئ الذكاء الاصطناعي · جامعة أم القرى',
    footerPrivacy: 'تُفكّ بيانات أعمالك على جهازك وحده، ولا يُحفظ شيء بعد خروجك.',
    offline: 'تعذّر الوصول إلى الصفحة. تحقّق من اتصالك بالإنترنت وحاول مرة أخرى.',
    idle: 'سُجّل خروجك بعد 15 دقيقة دون نشاط.',
    term: 'الفصل الدراسي الأول 1448هـ',
    id: 'الرقم الجامعي',
    lab: (n) => `شعبة المعمل ${n}`,
    marksTitle: 'درجات المقرر حتى الآن',
    marksSub: 'تُحتسب الدرجة في مقررك بعد تصحيح كل تقييم.',
    marksNote: 'درجتك الرسمية هي المسجّلة في نظام الجامعة.',
    ofCourse: (w) => `${w}% من درجة المقرر`,
    notMarked: 'لم يُصحَّح بعد',
    categories: { assignments: 'الواجبات', quizzes: 'الاختبارات القصيرة', midterm: 'الاختبار النصفي', project: 'المشروع الجماعي', final: 'الاختبار النهائي' },
    kinds: {
      activity: ['الأنشطة الصفّية', 'نشاط صفّي'], quiz: ['الاختبارات القصيرة', 'اختبار قصير'],
      assignment: ['الواجبات', 'واجب'], lab: ['المعامل', 'معمل'], midterm: ['الاختبار النصفي', 'الاختبار النصفي'],
      project: ['المشروع الجماعي', 'المشروع الجماعي'], final: ['الاختبار النهائي', 'الاختبار النهائي'],
    },
    status: {
      completed: 'مكتمل', graded: 'مُصحَّح', not_submitted: 'لم يُسلَّم',
      excused: 'معذور', marking: 'قيد التصحيح', upcoming: 'لم يُصحَّح بعد',
    },
    module: (n) => `الوحدة ${n}`,
    back: 'كل أعمالي',
    scaled: (s, w) => `= ${s} من ${w} من درجة المقرر`,
    feedback: 'التغذية الراجعة',
    statusTitle: 'الحالة',
    introCompleted: 'أكملت هذا النشاط، وهو بلا درجة. التغذية الراجعة أدناه لتساعدك على الفهم.',
    introMissing: 'لا توجد لدينا ورقة منك لهذا البند. إن كان هذا خطأً فأخبر أستاذ المقرر.',
    introExcused: 'أنت معذور في هذا البند، ولا يُحتسب عليك.',
    reviewed: 'راجعها أستاذ المقرر.',
    feedbackLang: 'التغذية الراجعة بالإنجليزية، لغة المقرر.',
    sheet: 'ورقتك',
    sheetHint: 'اضغط على الصفحة لفتحها، وكبّرها بإصبعين أو بضغطتين.',
    page: (n) => `الصفحة ${n}`,
    openPage: (n) => `افتح الصفحة ${n}`,
    pageOf: (i, n) => `الصفحة ${i} من ${n}`,
    scannedOf: (i, n) => `الصفحة الممسوحة ${i} من ${n}`,
    viewer: 'الصفحة الممسوحة',
    close: 'إغلاق',
    prev: 'الصفحة السابقة',
    next: 'الصفحة التالية',
    zoomHint: 'كبّر بإصبعين أو بضغطتين',
    months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  },
};

function initialLang() {
  try { const s = localStorage.getItem(LANG_KEY); if (s === 'ar' || s === 'en') return s; } catch { /* private mode */ }
  return (navigator.language || '').toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

let lang = initialLang();
export const getLang = () => lang;
export const t = (key, ...args) => {
  const v = STRINGS[lang][key] ?? STRINGS.en[key];
  return typeof v === 'function' ? v(...args) : v;
};

// Direction is set as a property on <html>; the stylesheet uses logical properties.
export function applyLang(next) {
  if (next) {
    lang = next;
    try { localStorage.setItem(LANG_KEY, next); } catch { /* private mode */ }
  }
  const root = document.documentElement;
  root.lang = lang;
  root.dir = lang === 'ar' ? 'rtl' : 'ltr';
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-label]')) el.setAttribute('aria-label', t(el.dataset.i18nLabel));
}
