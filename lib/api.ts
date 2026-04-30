import { BookingConfigResponse, MenuItem } from './types';

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || '';

const fallbackMenus: MenuItem[] = [
  {
    id: 'karaage',
    name: 'からあげ弁当',
    price: 700,
    description: 'ジューシーな唐揚げが楽しめる人気の定番弁当です。',
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/05/5.png',
    isSoldOut: false,
    badge: '人気'
  },
  {
    id: 'chicken_nanban',
    name: 'チキン南蛮弁当',
    price: 900,
    description: 'こだわりのタルタルで仕上げた満足感たっぷりの一品です。',
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/05/3.png',
    isSoldOut: false
  },
  {
    id: 'shogayaki',
    name: '生姜焼き弁当',
    price: 700,
    description: '香ばしく焼き上げた生姜焼きでごはんが進むお弁当です。',
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/05/6.png',
    isSoldOut: false
  },
  {
    id: 'hamburg_original',
    name: 'オリジナルハンバーグ弁当',
    price: 900,
    description: 'ふっくらジューシーなオリジナルハンバーグを楽しめるお弁当です。',
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/05/9.png',
    isSoldOut: false
  },
  {
    id: 'hamburg_cheese',
    name: 'チーズハンバーグ弁当',
    price: 1000,
    description: 'とろけるチーズをたっぷりのせた人気のハンバーグ弁当です。',
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/05/4.png',
    isSoldOut: false
  },
  {
    id: 'hamburg_oroshi_ponzu',
    name: 'おろしポン酢ハンバーグ弁当',
    price: 1000,
    description: 'さっぱり食べられるおろしポン酢仕立てのハンバーグ弁当です。',
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/05/2.png',
    isSoldOut: false
  },
  {
    id: 'hamburg_demiglace',
    name: 'デミグラスソースハンバーグ弁当',
    price: 1000,
    description: 'コクのあるデミグラスソースで仕上げた贅沢なハンバーグ弁当です。',
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/05/1.png',
    isSoldOut: false
  },
  {
    id: 'chicken_katsu',
    name: 'チキンカツ弁当',
    price: 900,
    description: 'サクッと揚がったチキンカツを楽しめる食べ応えあるお弁当です。',
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/05/8.png',
    isSoldOut: false
  },
  {
    id: 'chicken_katsu_tartar',
    name: 'チキンカツ弁当　タルタルソースがけ',
    price: 1000,
    description: 'チキンカツにタルタルソースをたっぷりかけた満足感の高い一品です。',
    imageUrl:
      'https://komradefoods1025-geskw.wpcomstaging.com/wp-content/uploads/2026/05/7.png',
    isSoldOut: false
  }
];

const fallbackBookingConfig: BookingConfigResponse = {
  ok: true,
  availableDates: [],
  dates: [],
  pickupTimes: [],
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

export async function getBookingConfig(): Promise<BookingConfigResponse> {
  if (!API_BASE) return fallbackBookingConfig;

  return safeFetch<BookingConfigResponse>(
    `${API_BASE}/api/web/booking-config`,
    fallbackBookingConfig
  );
}

export async function getMenus(date?: string): Promise<MenuItem[]> {
  if (!API_BASE) return fallbackMenus;

  const params = new URLSearchParams();
  if (date) params.set('date', date);

  const url = `${API_BASE}/api/web/menu${
    params.toString() ? `?${params.toString()}` : ''
  }`;

  return safeFetch<MenuItem[]>(url, fallbackMenus);
}
