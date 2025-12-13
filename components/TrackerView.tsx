import React, { useEffect, useState, useRef } from 'react';
import { comms } from '../services/commsService';
import { Order, OrderStatus } from '../types';
import { getOrders } from '../services/storageService';
import { ArrowLeft, Clock, ChefHat, Check, AlertCircle, BellRing } from 'lucide-react';

interface TrackerViewProps {
  onBack: () => void;
}

export const TrackerView: React.FC<TrackerViewProps> = ({ onBack }) => {
  // Initialize with local storage data so it appears instantly on the same device
  const [orders, setOrders] = useState<Order[]>(getOrders());
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const reconnectTimeoutRef = useRef<number | null>(null);
  
  // Track notifications
  const [justReadyId, setJustReadyId] = useState<string | null>(null);

  useEffect(() => {
    // Setup listeners
    comms.onData((data) => {
      if (data.type === 'SYNC_ORDERS') {
        setOrders(data.payload);
      }
      
      if (data.type === 'NEW_ORDER') {
        setOrders(prev => [data.payload, ...prev]);
      }
      
      if (data.type === 'ORDER_STATUS') {
        const { orderId, status } = data.payload;
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: status as OrderStatus } : o));
        
        if (status === OrderStatus.READY) {
            setJustReadyId(orderId);
            try {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.play();
            } catch(e) {}
            // Auto dismiss after 5s
            setTimeout(() => setJustReadyId(null), 5000);
        }
      }
    });

    attemptConnection();

    return () => {
      comms.disconnectClient();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  const attemptConnection = async () => {
    setIsConnecting(true);
    try {
        await comms.connectToKitchen();
        setIsConnected(true);
    } catch (err) {
        setIsConnected(false);
        // Only retry if not hosting (Loopback mode resolves immediately and doesn't fail)
        if (!comms.isHosting()) {
            reconnectTimeoutRef.current = window.setTimeout(attemptConnection, 3000);
        }
    } finally {
        setIsConnecting(false);
    }
  };

  const preparingOrders = orders.filter(o => o.status === OrderStatus.PENDING || o.status === OrderStatus.PREPARING);
  const readyOrders = orders.filter(o => o.status === OrderStatus.READY);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
       {/* Connection Banner */}
       {!isConnected && (
         <div className="bg-red-500 text-white text-xs font-bold text-center py-1 sticky top-0 z-20">
             {isConnecting ? "Connecting to Kitchen..." : "Kitchen Not Found - Is the Chef online?"}
         </div>
      )}
      
      <header className="bg-white shadow-sm p-4 flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800">
              <ArrowLeft size={24} />
              <span className="font-bold">Back</span>
          </button>
          <h1 className="text-xl font-black text-slate-800 uppercase tracking-widest">Order Tracker</h1>
          <div className="w-8"></div>
      </header>

      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* IN KITCHEN COLUMN */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden flex flex-col">
              <div className="bg-yellow-400 p-4 text-center">
                  <h2 className="text-2xl font-black text-yellow-900 uppercase flex items-center justify-center gap-3">
                      <Clock size={28} /> In the Kitchen
                  </h2>
              </div>
              <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                  {preparingOrders.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 min-h-[200px]">
                          <ChefHat size={48} className="mb-2 opacity-50" />
                          <p>No orders cooking right now</p>
                      </div>
                  ) : (
                      preparingOrders.map(order => (
                          <div key={order.id} className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-sm">
                              <div className="flex justify-between items-center">
                                  <span className="font-bold text-lg text-slate-800">#{order.id.slice(-4)}</span>
                                  <span className="text-sm font-medium px-2 py-1 bg-yellow-200 text-yellow-800 rounded uppercase">
                                      {order.status === OrderStatus.PENDING ? 'Pending' : 'Cooking'}
                                  </span>
                              </div>
                              <p className="text-slate-600 mt-1 font-medium">{order.customerName}</p>
                              <p className="text-xs text-slate-400 mt-2">{order.items.length} items</p>
                          </div>
                      ))
                  )}
              </div>
          </div>

          {/* READY COLUMN */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden flex flex-col">
              <div className="bg-green-500 p-4 text-center">
                  <h2 className="text-2xl font-black text-white uppercase flex items-center justify-center gap-3">
                      <BellRing size={28} /> Ready to Eat
                  </h2>
              </div>
              <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                  {readyOrders.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 min-h-[200px]">
                          <Check size={48} className="mb-2 opacity-50" />
                          <p>Nothing ready yet</p>
                      </div>
                  ) : (
                      readyOrders.map(order => (
                          <div key={order.id} className={`bg-green-50 border-l-4 border-green-500 p-6 rounded-r-lg shadow-sm transform transition-all duration-500 ${justReadyId === order.id ? 'scale-105 ring-4 ring-green-200' : ''}`}>
                              <div className="flex justify-between items-center mb-2">
                                  <span className="font-black text-2xl text-green-800">#{order.id.slice(-4)}</span>
                                  <span className="bg-green-200 text-green-800 px-3 py-1 rounded-full text-xs font-bold uppercase">Ready</span>
                              </div>
                              <h3 className="text-xl font-bold text-slate-800">{order.customerName}</h3>
                              <div className="mt-4 pt-4 border-t border-green-100 text-sm text-slate-600">
                                  {order.items.map(i => i.name).join(', ')}
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      </main>

      {/* Pop up overlay for NEW READY */}
      {justReadyId && (
          <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
             <div className="bg-green-600 text-white px-8 py-6 rounded-3xl shadow-2xl animate-bounce-in flex items-center gap-4">
                 <BellRing size={48} className="animate-ring" />
                 <div>
                     <h3 className="text-2xl font-black">ORDER UP!</h3>
                     <p className="font-medium">Order #{justReadyId.slice(-4)} is ready!</p>
                 </div>
             </div>
          </div>
      )}
    </div>
  );
};
