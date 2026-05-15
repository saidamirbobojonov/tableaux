"use client";

import Image from "next/image";

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  image: string | null;
  quantity: number;
  notes: string;
}

interface OrderSidebarProps {
  tableNumber: string;
  onTableChange: (v: string) => void;
  cart: CartItem[];
  onQtyChange: (menuItemId: string, delta: number) => void;
  onClearCart: () => void;
  onSendToKitchen: () => void;
  onCheckout: () => void;
  submitting: boolean;
}

const SERVICE_PCT = 0.1;
const TAX_PCT = 0.05;

export default function OrderSidebar({
  tableNumber,
  onTableChange,
  cart,
  onQtyChange,
  onClearCart,
  onSendToKitchen,
  onCheckout,
  submitting,
}: OrderSidebarProps) {
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const service = subtotal * SERVICE_PCT;
  const tax = subtotal * TAX_PCT;
  const total = subtotal + service + tax;

  return (
    <aside className="w-full md:w-[360px] lg:w-[400px] border-l border-[#e2e2df] dark:border-[#333] bg-white dark:bg-[#252420] flex flex-col shadow-xl z-10 shrink-0">
      {/* Header */}
      <div className="p-5 border-b border-[#e2e2df] dark:border-[#333]">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[#151513] dark:text-white text-xl font-bold">
                {tableNumber ? `Table ${tableNumber}` : "No Table"}
              </h1>
              <input
                type="text"
                value={tableNumber}
                onChange={(e) => onTableChange(e.target.value)}
                placeholder="№"
                className="w-12 text-center text-sm border border-[#e2e2df] dark:border-[#444] rounded-lg px-1 py-0.5 bg-[#f7f7f6] dark:bg-[#333] text-[#151513] dark:text-white focus:outline-none focus:ring-1 focus:ring-[#a7a66c]"
              />
            </div>
            <p className="text-[#7b7b6f] text-xs font-medium mt-0.5">
              {cart.length === 0 ? "Empty order" : `${cart.reduce((s, i) => s + i.quantity, 0)} items`}
            </p>
          </div>
          <button
            onClick={onClearCart}
            className="flex items-center justify-center h-9 w-9 rounded-full bg-[#f7f7f6] dark:bg-[#32312a] text-[#7b7b6f] hover:text-red-500 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">delete</span>
          </button>
        </div>

        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#a7a66c]/10 border border-[#a7a66c]/20">
          <span className="material-symbols-outlined text-[#a7a66c]" style={{ fontVariationSettings: "'FILL' 1" }}>
            shopping_bag
          </span>
          <p className="text-[#a7a66c] text-sm font-bold">Current Order Items</p>
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[#7b7b6f]">
            <span className="material-symbols-outlined text-4xl">shopping_cart</span>
            <p className="text-sm">Add items from the menu</p>
          </div>
        ) : (
          <div className="divide-y divide-[#f3f3f2] dark:divide-[#333]">
            {cart.map((item) => (
              <div
                key={item.menuItemId}
                className="flex items-center gap-4 px-5 min-h-[80px] py-3 hover:bg-[#f7f7f6] dark:hover:bg-[#32312a]/30 transition-colors"
              >
                {/* Image */}
                <div className="relative size-12 rounded-lg overflow-hidden bg-[#f7f7f6] dark:bg-[#32312a] shrink-0 shadow-sm">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} fill className="object-cover" sizes="48px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#a7a66c]">
                      <span className="material-symbols-outlined text-lg">restaurant_menu</span>
                    </div>
                  )}
                </div>

                {/* Name + price */}
                <div className="flex-1 min-w-0">
                  <p className="text-[#151513] dark:text-white text-sm font-semibold truncate">{item.name}</p>
                  <p className="text-[#a7a66c] text-xs font-bold mt-0.5">{item.price.toFixed(2)} TJS</p>
                </div>

                {/* Qty controls */}
                <div className="shrink-0">
                  <div className="flex items-center gap-2 bg-[#f3f3f2] dark:bg-[#333] p-1 rounded-full">
                    <button
                      onClick={() => onQtyChange(item.menuItemId, -1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-[#444] shadow-sm hover:bg-gray-50 active:scale-95 transition-all text-[#a7a66c] font-bold text-lg leading-none"
                    >
                      −
                    </button>
                    <span className="text-sm font-bold w-4 text-center text-[#151513] dark:text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => onQtyChange(item.menuItemId, +1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-[#444] shadow-sm hover:bg-gray-50 active:scale-95 transition-all text-[#a7a66c] font-bold text-lg leading-none"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-5 bg-[#f7f7f6] dark:bg-[#1c1b16] border-t border-[#e2e2df] dark:border-[#333]">
        <div className="flex flex-col gap-1.5 mb-5">
          {[
            { label: "Subtotal", value: subtotal },
            { label: "Service Charge (10%)", value: service },
            { label: "Tax (VAT 5%)", value: tax },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center text-[#7b7b6f] text-sm">
              <span>{label}</span>
              <span>{value.toFixed(2)} TJS</span>
            </div>
          ))}
          <div className="flex justify-between items-center text-[#151513] dark:text-white text-lg font-bold mt-2 pt-2 border-t border-dashed border-[#e2e2df] dark:border-[#444]">
            <span>Total Amount</span>
            <span className="text-[#a7a66c]">{total.toFixed(2)} TJS</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onSendToKitchen}
            disabled={cart.length === 0 || submitting}
            className="flex flex-col items-center justify-center gap-1 rounded-xl h-16 bg-[#f3f3f2] dark:bg-[#333] text-[#151513] dark:text-white border border-[#e2e2df] dark:border-[#444] hover:bg-white dark:hover:bg-[#444] disabled:opacity-50 transition-all"
          >
            <span className="material-symbols-outlined">flatware</span>
            <span className="text-xs font-bold uppercase tracking-wider">Kitchen</span>
          </button>
          <button
            onClick={onCheckout}
            disabled={cart.length === 0 || submitting}
            className="flex flex-col items-center justify-center gap-1 rounded-xl h-16 bg-[#a7a66c] text-white shadow-lg shadow-[#a7a66c]/30 hover:bg-[#a7a66c]/90 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all"
          >
            <span className="material-symbols-outlined">payments</span>
            <span className="text-xs font-bold uppercase tracking-wider">
              {submitting ? "Placing..." : "Checkout"}
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
