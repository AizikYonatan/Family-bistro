import React from 'react';
import { MenuItem } from '../types';
import { Plus, Sparkles } from 'lucide-react';

interface MenuCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}

export const MenuCard: React.FC<MenuCardProps> = ({ item, onAdd }) => {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 border border-orange-100 flex flex-col h-full">
      <div className="relative h-48 overflow-hidden bg-gray-100 group">
        <img 
          src={item.imageUrl || `https://picsum.photos/seed/${item.id}/400/300`} 
          alt={item.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {item.isAiGenerated && (
          <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-sm opacity-90">
            <Sparkles size={12} />
            AI Special
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-lg text-gray-800 leading-tight">{item.name}</h3>
          <span className="font-semibold text-orange-600">${item.price.toFixed(2)}</span>
        </div>
        <p className="text-gray-500 text-sm mb-4 flex-grow">{item.description}</p>
        <button 
          onClick={() => onAdd(item)}
          className="w-full bg-orange-100 hover:bg-orange-200 text-orange-700 font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Plus size={18} />
          Add to Order
        </button>
      </div>
    </div>
  );
};
