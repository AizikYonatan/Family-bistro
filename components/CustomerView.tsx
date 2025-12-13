import React, { useState, useEffect, useRef } from 'react';
import { MenuItem, CartItem, Order, OrderStatus } from '../types';
import { getMenu } from '../services/storageService';
import { MenuCard } from './MenuCard';
import { comms } from '../services/commsService';
import { ShoppingBag, X, ChefHat, ArrowLeft, Check, AlertCircle, BellRing } from 'lucide-react';

interface CustomerViewProps {
  onBack: () => void;
}

export const CustomerView: React.FC<CustomerViewProps> = ({ onBack }) => {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  
  // Track Active Order IDs for this session
  const [myActiveOrderIds, setMyActiveOrderIds] = useState<string[]>([]);
  const [readyOrder, setReadyOrder] = useState<string | null>(null);

  // Connection State
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState('');
  const reconnectTimeoutRef = useRef<number | null>(null);

  // Notification State
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    // Load local menu first as fallback
    setMenu(getMenu());

    // Setup comms listeners
    comms.onData((data) => {
        if (data.type === 'MENU_UPDATE') {
            setMenu(data.payload);
            setNotification('Menu Updated!');
            setTimeout(() => setNotification(null), 2000);
        }
        
        // Handle Order Ready Notification
        if (data.type === 'ORDER_STATUS' && data.payload.status === OrderStatus.READY) {
            // Check if this order belongs to me
            setMyActiveOrderIds(prev => {
                if (prev.includes(data.payload.orderId)) {
                    // It's mine!
                    setReadyOrder(data.payload.orderId);
                    try {
                        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                        audio.play();
                    } catch(e) {}
                    return prev; 
                }
                return prev;
            });
        }
    });

    // Auto-Connect Sequence
    attemptConnection();

    return () => {
        comms.disconnectClient();
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  const attemptConnection = async () => {
      setIsConnecting(true);
      setConnectionError('');
      try {
          // No params needed, uses global ID
          await comms.connectToKitchen();
          setIsConnected(true);
          setNotification(`Connected to Kitchen!`);
          setTimeout(() => setNotification(null), 3000);
      } catch (err: any) {
          console.error(err);
          setConnectionError("Searching for Kitchen...");
          setIsConnected(false);
          // Retry logic (optional, but good for "zero config")
          if (!comms.isHosting()) {
            reconnectTimeoutRef.current = window.setTimeout(attemptConnection, 3000);
          }
      } finally {
          setIsConnecting(false);
      }
  };

  const addToCart = (item: MenuItem) => {
    const newItem: CartItem = {
      ...item,
      cartId: Math.random().toString(36).substr(2, 9)
    };
    setCart([...cart, newItem]);
    
    setNotification(`Added ${item.name}!`);
    setTimeout(() => setNotification(null), 3000);
  };

  const removeFromCart = (cartId: string) => {
    setCart(cart.filter(item => item.cartId !== cartId));
  };

  const handlePlaceOrder = () => {
    if (!customerName.trim()) {
      alert("Please tell us who this order is for!");
      return;
    }
    if (cart.length === 0) return;

    const total = cart.reduce((sum, item) => sum + item.price, 0);
    const orderId = Date.now().toString(); // Generate ID here to track it
    
    const newOrder: Order = {
        id: orderId,
        customerName,
        items: cart,
        status: OrderStatus.PENDING,
        createdAt: Date.now(),
        total
    };

    if (isConnected) {
        comms.broadcast({ type: 'NEW_ORDER', payload: newOrder });
        setOrderPlaced(true);
        setMyActiveOrderIds(prev => [...prev, orderId]); // Track this order
        setCart([]);
        setCustomerName('');
    } else {
        alert("We lost connection to the kitchen! Please wait a moment.");
    }
  };

  const handleDismissReady = () => {
      setReadyOrder(null);
      setOrderPlaced(false); // Reset the "Order Sent" screen if it's still up
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  // Ready Notification Overlay
  if (readyOrder) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-bounce-in relative bg-green-500 z-50">
            <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full animate-pulse">
                <BellRing size={64} className="mx-auto text-green-500 mb-6" />
                <h1 className="text-4xl font-black text-gray-800 mb-4 uppercase tracking-tighter">Order Ready!</h1>
                <p className="text-xl text-gray-600 mb-8">
                    Your food is hot and ready at the counter. Go get it!
                </p>
                <button 
                    onClick={handleDismissReady}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl text-xl shadow-lg transform transition active:scale-95"
                >
                    Yum! I'm coming!
                </button>
            </div>
        </div>
      );
  }

  // If order successfully placed (and waiting)
  if (orderPlaced) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in relative bg-orange-50">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border-t-4 border-green-500">
          <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ChefHat size={40} className="text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Order Sent!</h2>
          <p className="text-gray-600 mb-8">
              Sit tight! We'll tell you when your food is ready.
          </p>
          <div className="flex flex-col gap-3">
            <button 
                onClick={() => {
                setOrderPlaced(false);
                setIsCartOpen(false);
                }}
                className="bg-orange-500 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-orange-600 transition-transform active:scale-95"
            >
                Order More Items
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 relative bg-slate-50">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-bounce-in">
          <Check size={18} className="text-green-400" />
          <span className="font-medium">{notification}</span>
        </div>
      )}

      {/* Connection Status Banner (if disconnected) */}
      {!isConnected && (
         <div className="bg-red-500 text-white text-xs font-bold text-center py-1 sticky top-0 z-20">
             {isConnecting ? "Connecting to Kitchen..." : "Kitchen Not Found - Is the Chef online?"}
         </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <ArrowLeft size={24} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-orange-600 flex items-center gap-2">
                <ChefHat size={24} />
                Family Bistro
            </h1>
            <span className={`text-xs flex items-center gap-1 ${isConnected ? 'text-green-600' : 'text-red-400'}`}>
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-400 animate-pulse'}`}></span>
                {isConnected ? 'Connected to Kitchen' : 'Searching...'}
            </span>
          </div>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setIsCartOpen(true)}
            className={`relative p-2 rounded-full transition-all duration-300 ${cart.length > 0 ? 'bg-orange-100 text-orange-600 hover:bg-orange-200' : 'text-gray-400'}`}
          >
            <ShoppingBag size={24} />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full animate-scale-in">
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Menu Grid */}
      <main className="p-4 max-w-7xl mx-auto">
        {menu.length === 0 && (
            <div className="text-center py-12 text-gray-400">
                <p>Waiting for menu from kitchen...</p>
            </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {menu.map(item => (
            <MenuCard key={item.id} item={item} onAdd={addToCart} />
          ))}
        </div>
      </main>

      {/* Cart Modal/Overlay */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end pointer-events-none">
          <div 
            className="absolute inset-0 bg-black/40 pointer-events-auto backdrop-blur-sm transition-opacity" 
            onClick={() => setIsCartOpen(false)}
          />
          <div className="bg-white w-full sm:w-96 h-[85vh] sm:h-full shadow-2xl rounded-t-2xl sm:rounded-none sm:rounded-l-2xl flex flex-col pointer-events-auto transform transition-transform duration-300 translate-y-0">
            
            <div className="p-4 border-b flex items-center justify-between bg-orange-50 rounded-t-2xl sm:rounded-none">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <ShoppingBag size={20} /> Your Order
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center text-gray-400 py-10 flex flex-col items-center">
                  <ShoppingBag size={48} className="mb-2 opacity-20" />
                  <p>Your tray is empty!</p>
                  <button onClick={() => setIsCartOpen(false)} className="mt-4 text-orange-600 font-medium hover:underline">
                    Browse Menu
                  </button>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.cartId} className="flex justify-between items-start bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div>
                      <h4 className="font-semibold text-gray-800">{item.name}</h4>
                      <span className="text-orange-600 text-sm">${item.price.toFixed(2)}</span>
                    </div>
                    <button 
                      onClick={() => removeFromCart(item.cartId)}
                      className="text-gray-400 hover:text-red-500 p-1"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t bg-white">
              <div className="flex justify-between items-center mb-4 text-lg font-bold">
                <span>Total</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              
              <div className="space-y-3">
                <input 
                  type="text" 
                  placeholder="Who is this for? (e.g. Dad)"
                  className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                
                {!isConnected && (
                    <div className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={12} /> Kitchen disconnected. Waiting...
                    </div>
                )}

                <button 
                  onClick={handlePlaceOrder}
                  disabled={cart.length === 0 || !isConnected}
                  className="w-full bg-orange-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  {isConnected ? 'Send to Kitchen' : 'Connecting...'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
