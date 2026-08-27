import React from 'react';

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-black font-bold px-4 py-2 rounded-xl shadow ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`bg-[#1B1D21] hover:bg-[#232428] border border-neutral-800 text-neutral-200 px-3 py-2 rounded-xl ${className}`}
    >
      {children}
    </button>
  );
}

export default function Button(props) { return <PrimaryButton {...props} />; }
