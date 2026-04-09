
export type MenuItem = {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  isSoldOut?: boolean;
  badge?: string;
};

export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  description?: string;
  selectedOptionLabel?: string;
  selectedOptions?: string[];
  note?: string;
};

export type ReservationDraft = {
  items: CartItem[];
  pickupDate?: string;
  pickupTime?: string;
  customerName?: string;
  phone?: string;
  note?: string;
  totalAmount?: number;
  totalQuantity?: number;
};

export type BookingConfigResponse = {
  ok?: boolean;
  availableDates?: string[];
  dates?: string[];
  bookableDates?: string[];
  bookableDateCount?: number;
  storeName?: string;
};

export type ReservationSubmitResponse = {
  ok?: boolean;
  reservationNo?: string;
  reservation_no?: string;
  id?: string;
  message?: string;
};
