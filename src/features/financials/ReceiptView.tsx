import { formatCents } from "@/utils/money";
import { formatGameClock } from "@/utils/time";
import type { Receipt } from "@/types";

/** Visually resembles a printed bar receipt (Master Plan Section 26). */
export function ReceiptView({ receipt }: { receipt: Receipt }) {
  return (
    <div className="receipt">
      <div style={{ textAlign: "center", fontWeight: 700 }}>{receipt.businessName}</div>
      <div style={{ textAlign: "center", fontSize: 12 }}>
        Day {receipt.gameDay} · {formatGameClock(receipt.gameMinute)}
      </div>
      <div style={{ fontSize: 12 }}>Receipt #{receipt.receiptNumber}</div>
      <div style={{ fontSize: 12 }}>Customer: {receipt.customerName}</div>
      <hr />
      {receipt.lineItems.map((li, idx) => (
        <div className="receipt-line" key={idx}>
          <span>
            {li.quantity} x {li.productName}
          </span>
          <span>{formatCents(li.unitPrice * li.quantity)}</span>
        </div>
      ))}
      <hr />
      <div className="receipt-line">
        <span>Subtotal</span>
        <span>{formatCents(receipt.subtotal)}</span>
      </div>
      <div className="receipt-line">
        <span>Tax</span>
        <span>{formatCents(receipt.tax)}</span>
      </div>
      <div className="receipt-line">
        <span>Tip</span>
        <span>{formatCents(receipt.tip)}</span>
      </div>
      {receipt.cardProcessingFee !== undefined && (
        <div className="receipt-line">
          <span>Card Fee</span>
          <span>{formatCents(receipt.cardProcessingFee)}</span>
        </div>
      )}
      <hr />
      <div className="receipt-line" style={{ fontWeight: 700 }}>
        <span>Total</span>
        <span>{formatCents(receipt.total)}</span>
      </div>
      <div style={{ marginTop: 8, fontSize: 12, textTransform: "uppercase" }}>Paid by {receipt.paymentMethod}</div>
    </div>
  );
}
