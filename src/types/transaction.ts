import type { Cents, EntityId, GameMinute, PaymentMethod } from "./common";

export type TabStatus = "open" | "closed";

export interface TabLineItem {
  productId: EntityId;
  productName: string;
  quantity: number;
  unitPrice: Cents;
  preparedByEmployeeId: EntityId | null;
}

export interface Tab {
  id: EntityId;
  tabNumber: number;
  customerId: EntityId;
  customerName: string;
  groupId: EntityId | null;
  openedAtGameMinute: GameMinute;
  closedAtGameMinute: GameMinute | null;
  lineItems: TabLineItem[];
  subtotal: Cents;
  tax: Cents;
  tip: Cents;
  total: Cents;
  paymentMethod: PaymentMethod | null;
  status: TabStatus;
}

export interface Receipt {
  id: EntityId;
  receiptNumber: number;
  tabId: EntityId;
  businessName: string;
  gameDay: number;
  gameHour: number;
  gameMinute: number;
  customerName: string;
  lineItems: TabLineItem[];
  subtotal: Cents;
  tax: Cents;
  tip: Cents;
  total: Cents;
  paymentMethod: PaymentMethod;
  cardProcessingFee?: Cents;
}
