"use client";

import Image from "next/image";

interface MenuItemCardProps {
  id: string;
  name: string;
  price: string;
  image: string | null;
  isAvailable: boolean;
  onClick: () => void;
}

export default function MenuItemCard({ name, price, image, isAvailable, onClick }: MenuItemCardProps) {
  return (
    <div
      onClick={isAvailable ? onClick : undefined}
      className={`flex flex-col bg-white dark:bg-[#252420] rounded-xl overflow-hidden shadow-sm transition-all border border-transparent group
        ${isAvailable
          ? "hover:shadow-md hover:border-[#a7a66c]/30 cursor-pointer"
          : "opacity-60 cursor-not-allowed"
        }`}
    >
      {/* Image */}
      <div className="relative aspect-square w-full bg-[#f7f7f6] dark:bg-[#32312a]">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 20vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#a7a66c]">
            <span className="material-symbols-outlined text-4xl">restaurant_menu</span>
          </div>
        )}

        {/* Hover overlay */}
        {isAvailable && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
            <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all text-4xl">
              add_circle
            </span>
          </div>
        )}

        {/* Sold out badge */}
        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-white font-bold uppercase tracking-widest text-xs bg-black/60 px-2 py-1 rounded">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-[#151513] dark:text-white text-sm font-semibold leading-tight line-clamp-1">
          {name}
        </p>
        <p className={`text-sm font-bold mt-1 ${isAvailable ? "text-[#a7a66c]" : "text-[#7b7b6f]"}`}>
          {Number(price).toFixed(2)} TJS
        </p>
      </div>
    </div>
  );
}
