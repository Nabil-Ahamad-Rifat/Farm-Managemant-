// Canonical TypeScript types shared between apps/web and apps/mobile.
// Mirrors the Prisma models (apps/web/prisma/schema.prisma) as seen by
// clients — dates may arrive as serialized strings (JSON) or as Date
// objects (passed directly from a Next.js Server Component), so most date
// fields are typed as `string | Date`.

export interface Cow {
  id: string;
  tagNumber: string;
  name: string;
  breed: string | null;
  purchasePrice: number | null;
  status: string;
  createdAt: Date | string;
}

export interface SalaryPayment {
  id: string;
  amount: number;
  periodMonth: number;
  periodYear: number;
  note: string | null;
  paidAt: string | Date;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  salary: number;
  joinDate: string | Date | null;
  status: string;
  salaryPayments?: SalaryPayment[];
}

export interface FeedBatch {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  remainingQuantity: number;
  createdAt: Date | string;
}

export interface OtherExpense {
  id: string;
  description: string;
  amount: number;
  category: string;
  expenseDate: string | Date;
  createdAt: string | Date;
}

export interface OtherIncome {
  id: string;
  description: string;
  amount: number;
  category: string;
  incomeDate: string | Date;
  createdAt: string | Date;
}

export interface Sale {
  id: string;
  customerName: string;
  amount: number;
  status: string;
  saleType: string;
  quantity: number | null;
  unitPrice: number | null;
  notes: string | null;
  cowId: string | null;
  cow?: Pick<Cow, 'id' | 'name' | 'tagNumber'> | null;
  createdAt: Date | string;
}

export interface PeriodStat {
  days: number;
  totalSales: number;
  totalOtherIncome: number;
  totalRevenue: number;
  salesCount: number;
  totalSalaryCost: number;
  totalFeedCost: number;
  totalOtherCost: number;
  totalCost: number;
  netProfit: number;
}

export interface DailyBreakdown {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
}

export interface RevenueData {
  periods: PeriodStat[];
  dailyBreakdown: DailyBreakdown[];
}
