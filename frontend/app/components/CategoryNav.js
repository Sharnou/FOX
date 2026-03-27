'use client';
const CATEGORIES = ['All', 'Vehicles', 'Electronics', 'Real Estate', 'Jobs', 'Services', 'Supermarket', 'Pharmacy', 'Fast Food', 'Fashion'];
export default function CategoryNav({ active, onChange }) {
  return (
    <div className="flex gap-2 p-4 overflow-x-auto bg-white shadow-sm">
      {CATEGORIES.map(c => (
        <button key={c} onClick={() => onChange(c)} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap font-medium ${active === c ? 'bg-brand text-white' : 'bg-gray-100 text-gray-700'}`}>{c}</button>
      ))}
    </div>
  );
}
