// ponytail: static placeholder data. Swap each export for an API call when the backend lands.

export const C = {
  navy: "#0F2C4A",
  navySoft: "#1B3D63",
  orange: "#F96B1F",
  bg: "#F4F6F9",
  border: "#E5E9F0",
  muted: "#6B7280",
  green: "#16A34A",
  red: "#DC2626",
  amber: "#D97706",
};

export const user = { name: "John", email: "manager@logicproperties.com", role: "Landlord" };

export const dashboard = {
  properties: 12,
  units: 248,
  occupancy: 92,
  rentCollected: 24560,
  collected: 24560,
  outstanding: 6240,
  collectionRate: 87,
  collectionDelta: "+6.3% vs last month",
  arrears: [
    { label: "0-30 Days", amount: 2120, color: C.amber },
    { label: "31-60 Days", amount: 2450, color: "#EA580C" },
    { label: "60+ Days", amount: 1670, color: C.red },
  ],
};

export type Property = {
  id: string;
  name: string;
  address: string;
  city: string;
  units: number;
  occupied: number;
  vacant: number;
  occupancy: number;
  outstanding: number;
  collected: number;
  active: boolean;
  openRequests: number;
};

export const properties: Property[] = [
  { id: "riverside", name: "Riverside Apartments", address: "123 Riverside Drive", city: "Harare, Zimbabwe", units: 24, occupied: 22, vacant: 2, occupancy: 92, outstanding: 3240, collected: 8560, active: true, openRequests: 6 },
  { id: "sunset", name: "Sunset Complex", address: "45 Sunset Boulevard", city: "Harare, Zimbabwe", units: 32, occupied: 28, vacant: 4, occupancy: 88, outstanding: 1200, collected: 12400, active: true, openRequests: 2 },
  { id: "greenview", name: "Greenview Towers", address: "78 Greenview Road", city: "Bulawayo, Zimbabwe", units: 48, occupied: 46, vacant: 2, occupancy: 95, outstanding: 4560, collected: 21300, active: true, openRequests: 4 },
  { id: "lakeview", name: "Lakeview Estate", address: "9 Lakeview Lane", city: "Mutare, Zimbabwe", units: 16, occupied: 12, vacant: 4, occupancy: 75, outstanding: 1780, collected: 5200, active: false, openRequests: 1 },
];

export type Unit = {
  id: string;
  label: string;
  propertyId: string;
  tenantId?: string;
  tenant?: string;
  rent: number;
  status: "Occupied" | "Vacant" | "Maintenance";
  due?: number;
  paid?: boolean;
  floor: string;
  bedrooms: number;
};

export const units: Unit[] = [
  { id: "1a", label: "Unit 1A", propertyId: "riverside", tenantId: "chikomo", tenant: "John Chikomo", rent: 650, status: "Occupied", paid: true, floor: "1st Floor", bedrooms: 2 },
  { id: "1b", label: "Unit 1B", propertyId: "riverside", rent: 650, status: "Vacant", floor: "1st Floor", bedrooms: 2 },
  { id: "2a", label: "Unit 2A", propertyId: "riverside", tenantId: "moyo", tenant: "Tendai Moyo", rent: 650, status: "Occupied", due: 150, floor: "2nd Floor", bedrooms: 2 },
  { id: "2b", label: "Unit 2B", propertyId: "riverside", tenantId: "chirwa", tenant: "Rudo Chirwa", rent: 650, status: "Occupied", paid: true, floor: "2nd Floor", bedrooms: 1 },
  { id: "3a", label: "Unit 3A", propertyId: "riverside", rent: 650, status: "Vacant", floor: "3rd Floor", bedrooms: 2 },
  { id: "3b", label: "Unit 3B", propertyId: "riverside", tenantId: "bhasera", tenant: "M. Bhasera", rent: 650, status: "Occupied", due: 300, floor: "3rd Floor", bedrooms: 3 },
];

export const tenant = {
  id: "moyo",
  name: "Tendai Moyo",
  initials: "TM",
  phone: "+263 77 123 4567",
  email: "tendaimoyo@email.com",
  unit: "Unit 2A",
  property: "Riverside Apartments",
  leaseStart: "Dec 1, 2025",
  leaseEnd: "Dec 31, 2026",
  balance: 150,
  lastPayment: { amount: 500, date: "Aug 5, 2026" },
  nextDue: "Jun 1, 2026",
  rent: 650,
};

export const statement = [
  { date: "Aug 1, 2026", label: "Rent Charge - Aug 2026", amount: 650 },
  { date: "Aug 5, 2026", label: "Payment - EcoCash", amount: -500 },
  { date: "Jul 1, 2026", label: "Rent Charge - Jul 2026", amount: 650 },
  { date: "Jul 3, 2026", label: "Payment - Bank Transfer", amount: -650 },
];

export const paymentMethods = [
  { id: "ecocash", name: "EcoCash", hint: "Pay using EcoCash wallet", icon: "phone-portrait-outline", tint: "#16A34A" },
  { id: "innbucks", name: "InnBucks", hint: "Pay using InnBucks", icon: "wallet-outline", tint: "#DC2626" },
  { id: "card", name: "Visa / Mastercard", hint: "Pay using card", icon: "card-outline", tint: "#2563EB" },
  { id: "bank", name: "Bank Transfer", hint: "Manual bank transfer", icon: "business-outline", tint: "#D97706" },
] as const;

export type Request = {
  id: string;
  title: string;
  unit: string;
  property: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Resolved";
  reported: string;
  reporter: string;
  description: string;
};

export const requests: Request[] = [
  { id: "MR-1042", title: "Leaking kitchen tap", unit: "Unit 2A", property: "Riverside Apartments", priority: "High", status: "Open", reported: "May 10, 2026", reporter: "Tendai Moyo", description: "Kitchen tap drips continuously and the cabinet below is getting damp." },
  { id: "MR-1041", title: "Broken window latch", unit: "Unit 1A", property: "Riverside Apartments", priority: "Medium", status: "In Progress", reported: "May 8, 2026", reporter: "John Chikomo", description: "Bedroom window will not latch shut." },
  { id: "MR-1039", title: "Corridor light out", unit: "Common Area", property: "Sunset Complex", priority: "Low", status: "Open", reported: "May 4, 2026", reporter: "Staff", description: "Second floor corridor light has stopped working." },
  { id: "MR-1035", title: "Geyser not heating", unit: "Unit 3B", property: "Riverside Apartments", priority: "High", status: "Resolved", reported: "Apr 28, 2026", reporter: "M. Bhasera", description: "No hot water since Monday. Vendor replaced element." },
];

export const money = (n: number) =>
  `$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const moneyShort = (n: number) => `$${Math.abs(n).toLocaleString("en-US")}`;

/** Server money fields are an integer count of minor units (cents) as a string. */
export const centsToDollars = (minor: string | number) => Number(minor) / 100;
