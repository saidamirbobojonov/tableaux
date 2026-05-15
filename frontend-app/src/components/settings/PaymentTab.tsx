"use client";

const PAYMENT_METHODS = [
  {
    key: "CASH",
    label: "Cash",
    description: "Physical currency accepted at the counter",
    icon: "payments",
    color: "text-green-600",
    bg: "bg-green-50 dark:bg-green-900/20",
  },
  {
    key: "CARD",
    label: "Card",
    description: "Credit and debit card payments via terminal",
    icon: "credit_card",
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    key: "QR",
    label: "QR Payment",
    description: "Mobile QR code payment (Alif Pay, Vasl, etc.)",
    icon: "qr_code",
    color: "text-purple-600",
    bg: "bg-purple-50 dark:bg-purple-900/20",
  },
];

export default function PaymentTab() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-extrabold text-[#151513] dark:text-white">Payment Methods</h2>
        <p className="text-sm text-[#7b7b6f] mt-1">
          These are the available payment methods across all orders. Cashiers select one when completing a transaction.
        </p>
      </div>

      <div className="space-y-3">
        {PAYMENT_METHODS.map((method) => (
          <div
            key={method.key}
            className="bg-white dark:bg-[#25241e] rounded-2xl border border-[#e2e2df] dark:border-[#3a3930] px-5 py-4 flex items-center gap-4"
          >
            <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${method.bg}`}>
              <span className={`material-symbols-outlined text-2xl ${method.color}`}>{method.icon}</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-[#151513] dark:text-white">{method.label}</p>
              <p className="text-xs text-[#7b7b6f] mt-0.5">{method.description}</p>
            </div>
            <div className="flex items-center gap-1.5 text-green-600 text-xs font-bold bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Active
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-[#a7a66c]/10 rounded-xl border border-[#a7a66c]/20">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-[#a7a66c] text-xl mt-0.5">info</span>
          <p className="text-sm text-[#7b7b6f]">
            Payment method configuration (enable/disable, add payment terminals) will be available in a future update.
            Currently all three methods are active system-wide.
          </p>
        </div>
      </div>
    </div>
  );
}
