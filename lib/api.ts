import { BookingConfig, MenuItem } from './types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || '';

const fallbackMenus: MenuItem[] = [
  {
    key: 'karaage',
    name: 'からあげ弁当',
    price: 700,
    description: 'ジューシーな唐揚げが楽しめる人気の定番弁当です。',
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/05/5.png',
    soldOut: false,
    visible: true,
    category: 'bento',
    allowLargeRice: true
  },
  {
    key: 'chicken_nanban',
    name: 'チキン南蛮弁当',
    price: 900,
    description: 'こだわりのタルタルで仕上げた満足感たっぷりの一品です。',
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/05/3.png',
    soldOut: false,
    visible: true,
    category: 'bento',
    allowLargeRice: true
  },
  {
    key: 'shogayaki',
    name: '生姜焼き弁当',
    price: 700,
    description: '香ばしく焼き上げた生姜焼きでごはんが進むお弁当です。',
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/05/6.png',
    soldOut: false,
    visible: true,
    category: 'bento',
    allowLargeRice: true
  },
  {
    key: 'hamburg_original',
    name: 'オリジナルハンバーグ弁当',
    price: 900,
    description: 'ふっくらジューシーなオリジナルハンバーグを楽しめるお弁当です。',
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/05/9.png',
    soldOut: false,
    visible: true,
    category: 'bento',
    allowLargeRice: true
  },
  {
    key: 'hamburg_cheese',
    name: 'チーズハンバーグ弁当',
    price: 1000,
    description: 'とろけるチーズをたっぷりのせた人気のハンバーグ弁当です。',
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/05/4.png',
    soldOut: false,
    visible: true,
    category: 'bento',
    allowLargeRice: true
  },
  {
    key: 'hamburg_oroshi_ponzu',
    name: 'おろしポン酢ハンバーグ弁当',
    price: 1000,
    description: 'さっぱり食べられるおろしポン酢仕立てのハンバーグ弁当です。',
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/05/2.png',
    soldOut: false,
    visible: true,
    category: 'bento',
    allowLargeRice: true
  },
  {
    key: 'hamburg_demiglace',
    name: 'デミグラスソースハンバーグ弁当',
    price: 1000,
    description: 'コクのあるデミグラスソースで仕上げた贅沢なハンバーグ弁当です。',
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/05/1.png',
    soldOut: false,
    visible: true,
    category: 'bento',
    allowLargeRice: true
  },
  {
    key: 'chicken_katsu',
    name: 'チキンカツ弁当',
    price: 900,
    description: 'サクッと揚がったチキンカツを楽しめる食べ応えあるお弁当です。',
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/05/8.png',
    soldOut: false,
    visible: true,
    category: 'bento',
    allowLargeRice: true
  },
  {
    key: 'chicken_katsu_tartar',
    name: 'チキンカツ弁当　タルタルソースがけ',
    price: 1000,
    description: 'チキンカツにタルタルソースをたっぷりかけた満足感の高い一品です。',
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/05/7.png',
    soldOut: false,
    visible: true,
    category: 'bento',
    allowLargeRice: true
  },
  {
    key: 'extra_karaage',
    name: '追加唐揚げ',
    price: 80,
    description: 'お弁当に追加できる唐揚げです（1個80円）',
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/03/photo_2026-03-22_14-58-55.jpg',
    soldOut: false,
    visible: true,
    category: 'extra',
    allowLargeRice: false
  },
  {
    key: 'drink_irohasu',
    name: 'いろはす',
    price: 150,
    description: 'すっきり飲みやすいミネラルウォーター',
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/03/e6b0b4-1.jpg',
    soldOut: false,
    visible: true,
    category: 'drink'
  },
  {
    key: 'drink_mugicha',
    name: 'やかんの麦茶',
    price: 200,
    description: '食事と相性のいい定番ドリンク',
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/03/518rlhbonql.jpg',
    soldOut: false,
    visible: true,
    category: 'drink'
  },
  {
    key: 'drink_cola',
    name: 'コカ・コーラ',
    price: 200,
    description: 'シュワッと爽快な人気ドリンク',
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/03/e382b3e383bce383a9-1.jpg',
    soldOut: false,
    visible: true,
    category: 'drink'
  },
  {
    key: 'drink_cola_zero',
    name: 'コカ・コーラゼロ',
    price: 200,
    description: 'ゼロシュガーで飲みやすい定番ドリンク',
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/03/mono62457659-240314-02.jpg',
    soldOut: false,
    visible: true,
    category: 'drink'
  }
];

const fallbackBookingConfig: BookingConfig = {
  ok: true,
  storeName: 'かむらど',
  availableDates: [],
  pickupTimesByDate: {},
  sameDayLeadMinutes: 10
};

async function safeFetch<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, {
      cache: 'no-store'
    });

    if (!res.ok) {
      return fallback;
    }

    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export async function getBookingConfig(): Promise<BookingConfig> {
  if (!API_BASE) return fallbackBookingConfig;
  return safeFetch<BookingConfig>(
    `${API_BASE}/api/web/booking-config`,
    fallbackBookingConfig
  );
}

export async function getMenus(date?: string): Promise<MenuItem[]> {
  if (!API_BASE) return fallbackMenus.filter((item) => item.visible !== false);

  const params = new URLSearchParams();
  if (date) params.set('date', date);

  const url = `${API_BASE}/api/web/menu${
    params.toString() ? `?${params.toString()}` : ''
  }`;

  return safeFetch<MenuItem[]>(
    url,
    fallbackMenus.filter((item) => item.visible !== false)
  );
}
