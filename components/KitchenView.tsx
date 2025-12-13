import React, { useState, useEffect } from 'react';
import { Order, OrderStatus, MenuItem } from '../types';
import { getOrders, updateOrderStatus, getMenu, saveMenuItem, updateOrderAiComment, clearCompletedOrders, deleteMenuItem } from '../services/storageService';
import { generateMenuDescription, generateMenuImage, generateChefComment } from '../services/geminiService';
import { comms } from '../services/commsService';
import { ChefHat, CheckCircle, Clock, RefreshCw, Sparkles, Trash2, ArrowLeft, Power, XCircle, Upload, Image as ImageIcon } from 'lucide-react';

interface KitchenViewProps {
  onBack: () => void;
}

export const KitchenView: React.FC<KitchenViewProps> = ({ onBack }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');
  const [menu, setMenu] = useState<MenuItem[]>([]);
  
  // Connection State
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [connectedClients, setConnectedClients] = useState(0);

  // Menu Creation State
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemImage, setNewItemImage] = useState<string>('');
  const [newItemCategory, setNewItemCategory] = useState<MenuItem['category']>('main');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);

  useEffect(() => {
    refreshData();
    
    // Auto-start or check existing host session
    if (comms.isHosting()) {
        setIsConnected(true);
        setupListeners();
    }
  }, []);

  const setupListeners = () => {
    comms.onData((data) => {
        if (data.type === 'NEW_ORDER') {
            refreshData();
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.play();
            } catch(e) {}
        }
    });
    
    comms.onHostConnect(() => {
        setConnectedClients(prev => prev + 1);
        const currentMenu = getMenu();
        const currentOrders = getOrders();
        
        // Broadcast Menu to new client
        comms.broadcast({ type: 'MENU_UPDATE', payload: currentMenu });
        
        // Broadcast active orders so Tracker view can see them immediately
        const activeOrders = currentOrders.filter(o => o.status !== OrderStatus.COMPLETED);
        comms.broadcast({ type: 'SYNC_ORDERS', payload: activeOrders });
    });
  };

  const startHosting = async () => {
      setIsConnecting(true);
      setConnectionError('');
      
      try {
          await comms.startHost();
          setIsConnected(true);
          setupListeners();
          comms.broadcast({ type: 'MENU_UPDATE', payload: menu });
      } catch (err: any) {
          setConnectionError(err.message || 'Failed to start kitchen.');
          setIsConnected(false);
      } finally {
          setIsConnecting(false);
      }
  };

  const stopHosting = () => {
      comms.stopHosting();
      setIsConnected(false);
  };

  const refreshData = () => {
    setOrders(getOrders());
    setMenu(getMenu());
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    updateOrderStatus(orderId, newStatus);
    refreshData();
    comms.broadcast({ 
        type: 'ORDER_STATUS', 
        payload: { orderId, status: newStatus } 
    });
  };

  const handleAiAssist = async (order: Order) => {
    if (order.aiChefComment) return;
    setLoadingOrderId(order.id);
    const comment = await generateChefComment(order);
    updateOrderAiComment(order.id, comment);
    setLoadingOrderId(null);
    refreshData();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItemImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateDescription = async () => {
    if (!newItemName) return;
    setIsGenerating(true);
    const desc = await generateMenuDescription(newItemName);
    setNewItemDescription(desc);
    setIsGenerating(false);
  };

  const handleCreateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;

    let finalDescription = newItemDescription;
    let finalImage = newItemImage;

    setIsGenerating(true);

    // If description is empty, try to generate it
    if (!finalDescription) {
        finalDescription = await generateMenuDescription(newItemName);
    }

    // If image is empty, try to generate it
    if (!finalImage) {
        finalImage = await generateMenuImage(newItemName, finalDescription) || '';
    }

    const newItem: MenuItem = {
      id: Date.now().toString(),
      name: newItemName,
      price: parseFloat(newItemPrice),
      description: finalDescription,
      imageUrl: finalImage,
      category: newItemCategory,
      isAiGenerated: !newItemDescription || !newItemImage // Mark as AI if we had to fill gaps
    };

    saveMenuItem(newItem);
    const updatedMenu = getMenu();
    setMenu(updatedMenu);
    
    // Reset Form
    setIsGenerating(false);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemDescription('');
    setNewItemImage('');
    
    if (isConnected) {
        comms.broadcast({ type: 'MENU_UPDATE', payload: updatedMenu });
    }
  };

  const handleDeleteItem = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = deleteMenuItem(id);
    setMenu(updated);
    if (isConnected) {
        comms.broadcast({ type: 'MENU_UPDATE', payload: updated });
    }
  };

  const handleClearCompleted = () => {
    clearCompletedOrders();
    refreshData();
  };

  if (!isConnected) {
      return (
          <div className="min-h-screen bg-slate-800 flex items-center justify-center p-6">
              <div className="bg-white max-w-md w-full rounded-2xl p-8 shadow-2xl text-center">
                  <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-600 animate-pulse">
                      <ChefHat size={40} />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">Kitchen Control</h2>
                  <p className="text-gray-500 mb-8">Ready to start the service? This will allow family members to connect.</p>
                  
                  <div className="space-y-4">
                      {connectionError && (
                          <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm font-bold border border-red-100 flex flex-col gap-1">
                              <span>⚠️ Connection Issue</span>
                              <span className="font-normal">{connectionError}</span>
                          </div>
                      )}

                      <button 
                        onClick={startHosting}
                        disabled={isConnecting}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                      >
                          {isConnecting ? (
                              <RefreshCw className="animate-spin" />
                          ) : (
                              <Power size={24} />
                          )}
                          {isConnecting ? 'Starting Systems...' : 'Open Kitchen'}
                      </button>
                      
                      <button onClick={onBack} className="text-gray-400 text-sm hover:text-gray-600">
                          Back to Home
                      </button>
                  </div>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-800 text-white p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-full text-slate-300">
                <ArrowLeft size={24} />
            </button>
            <div className="flex flex-col">
                <div className="flex items-center gap-2">
                    <ChefHat className="text-orange-400" />
                    <h1 className="text-xl font-bold">Kitchen Dashboard</h1>
                </div>
                <div className="flex items-center gap-2 text-xs text-green-400">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Live • {connectedClients > 0 ? `${connectedClients} devices` : 'Waiting...'}
                </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
                onClick={stopHosting}
                className="bg-red-500/20 hover:bg-red-500/40 text-red-300 p-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                title="Stop hosting kitchen"
            >
                <XCircle size={18} />
                <span className="hidden sm:inline">Close</span>
            </button>
            <div className="flex bg-slate-700 p-1 rounded-lg">
                <button 
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'orders' ? 'bg-orange-500 text-white' : 'text-slate-300 hover:text-white'}`}
                >
                Orders ({orders.filter(o => o.status !== OrderStatus.COMPLETED).length})
                </button>
                <button 
                onClick={() => setActiveTab('menu')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'menu' ? 'bg-orange-500 text-white' : 'text-slate-300 hover:text-white'}`}
                >
                Menu
                </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        {activeTab === 'orders' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Incoming Orders</h2>
                <button 
                    onClick={handleClearCompleted}
                    className="text-sm text-slate-500 hover:text-slate-800 underline"
                >
                    Clear History
                </button>
            </div>
            
            {orders.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                    <CheckCircle size={64} className="mx-auto mb-4 opacity-20" />
                    <p className="text-xl">Kitchen is all clear!</p>
                    <p className="text-sm mt-2 opacity-70">
                        Kitchen is running in background.
                        <br/>
                        You can navigate away and orders will still come in.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orders.map(order => (
                    <div 
                    key={order.id} 
                    className={`bg-white rounded-xl shadow-sm border-l-4 overflow-hidden ${
                        order.status === OrderStatus.COMPLETED ? 'border-green-500 opacity-75' : 
                        order.status === OrderStatus.READY ? 'border-blue-500' :
                        order.status === OrderStatus.PREPARING ? 'border-orange-500' : 'border-yellow-400'
                    }`}
                    >
                    <div className="p-5">
                        <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800">#{order.id.slice(-4)} - {order.customerName}</h3>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <Clock size={12} />
                            {new Date(order.createdAt).toLocaleTimeString()}
                            </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider
                            ${order.status === OrderStatus.PENDING ? 'bg-yellow-100 text-yellow-700' : ''}
                            ${order.status === OrderStatus.PREPARING ? 'bg-orange-100 text-orange-700' : ''}
                            ${order.status === OrderStatus.READY ? 'bg-blue-100 text-blue-700' : ''}
                            ${order.status === OrderStatus.COMPLETED ? 'bg-green-100 text-green-700' : ''}
                        `}>
                            {order.status}
                        </span>
                        </div>

                        <div className="space-y-2 mb-4 border-b border-gray-100 pb-4">
                        {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                            <span className="text-slate-700 font-medium">1x {item.name}</span>
                            <span className="text-slate-400">${item.price.toFixed(2)}</span>
                            </div>
                        ))}
                        </div>

                        {/* AI Chef Comment Section */}
                        <div className="bg-orange-50 p-3 rounded-lg mb-4 text-sm border border-orange-100">
                            <div className="flex items-center gap-2 mb-1 text-orange-800 font-bold text-xs uppercase">
                                <Sparkles size={12} /> Chef AI Says:
                            </div>
                            {order.aiChefComment ? (
                                <p className="text-slate-700 italic">"{order.aiChefComment}"</p>
                            ) : (
                                <button 
                                    onClick={() => handleAiAssist(order)}
                                    disabled={loadingOrderId === order.id}
                                    className="text-orange-600 hover:text-orange-700 text-xs font-medium flex items-center gap-1"
                                >
                                    {loadingOrderId === order.id ? 'Thinking...' : 'Get cooking tip'}
                                </button>
                            )}
                        </div>

                        <div className="flex gap-2 mt-2">
                        {order.status !== OrderStatus.COMPLETED && (
                            <button 
                            onClick={() => {
                                const next = order.status === OrderStatus.PENDING ? OrderStatus.PREPARING 
                                : order.status === OrderStatus.PREPARING ? OrderStatus.READY 
                                : OrderStatus.COMPLETED;
                                handleStatusChange(order.id, next);
                            }}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors text-white 
                                ${order.status === OrderStatus.PREPARING ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-800 hover:bg-slate-900'}
                            `}
                            >
                            {order.status === OrderStatus.PENDING ? 'Start Cooking' : 
                            order.status === OrderStatus.PREPARING ? 'Mark Order Ready' : 'Complete'}
                            </button>
                        )}
                        </div>
                    </div>
                    </div>
                ))}
                </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Create New Item Form */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-24">
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <ChefHat className="text-orange-500" />
                  Add Menu Item
                </h2>
                <p className="text-sm text-slate-500 mb-6">
                  Fill in the details yourself, or leave the description blank and let AI write it for you!
                </p>
                
                <form onSubmit={handleCreateMenuItem} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Dish Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Grandma's Pie"
                      className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-orange-500 outline-none"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Price ($)</label>
                        <input 
                        type="number"
                        required
                        step="0.01"
                        placeholder="0.00"
                        className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-orange-500 outline-none"
                        value={newItemPrice}
                        onChange={(e) => setNewItemPrice(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                        <select 
                        className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-orange-500 outline-none"
                        value={newItemCategory}
                        onChange={(e) => setNewItemCategory(e.target.value as any)}
                        >
                        <option value="starter">Starter</option>
                        <option value="main">Main</option>
                        <option value="dessert">Dessert</option>
                        <option value="drink">Drink</option>
                        </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between">
                        Description
                        <button type="button" onClick={handleGenerateDescription} className="text-xs text-orange-600 font-bold hover:underline flex items-center gap-1">
                            <Sparkles size={10} /> AI Auto-Fill
                        </button>
                    </label>
                    <textarea 
                        rows={3}
                        placeholder="Describe the dish..."
                        className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-orange-500 outline-none resize-none text-sm"
                        value={newItemDescription}
                        onChange={(e) => setNewItemDescription(e.target.value)}
                    />
                  </div>

                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Photo</label>
                     <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors relative">
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {newItemImage ? (
                            <div className="relative h-32 w-full">
                                <img src={newItemImage} alt="Preview" className="h-full w-full object-contain mx-auto" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 hover:opacity-100 transition-opacity font-bold">
                                    Change Photo
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-gray-400">
                                <Upload size={24} className="mb-2" />
                                <span className="text-xs">Click to Upload Image</span>
                            </div>
                        )}
                     </div>
                  </div>

                  <button 
                    type="submit"
                    disabled={isGenerating || !newItemName}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-lg shadow-md transition-all disabled:opacity-70 flex justify-center items-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="animate-spin" size={20} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles size={20} className="text-orange-400" />
                        Add Item
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Existing Menu List */}
            <div className="lg:col-span-2 space-y-4">
               <div className="flex justify-between items-center mb-2">
                 <h3 className="text-lg font-bold text-slate-700">Current Menu Items</h3>
               </div>
               
               {menu.map(item => (
                 <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-100 flex gap-4 items-start group hover:border-orange-200 transition-colors">
                   <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden relative">
                      <img 
                        src={item.imageUrl || `https://picsum.photos/seed/${item.id}/200`} 
                        alt={item.name} 
                        className="w-full h-full object-cover"
                      />
                       {item.isAiGenerated && (
                        <div className="absolute bottom-0 left-0 right-0 bg-purple-600/80 text-white text-[10px] text-center py-0.5">
                            AI Generated
                        </div>
                       )}
                   </div>
                   <div className="flex-1">
                     <div className="flex justify-between">
                       <h4 className="font-bold text-slate-800">{item.name}</h4>
                       <span className="font-semibold text-orange-600">${item.price.toFixed(2)}</span>
                     </div>
                     <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                     <div className="mt-2 flex items-center gap-2">
                       <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600 uppercase font-medium">{item.category}</span>
                     </div>
                   </div>
                   <button 
                    type="button"
                    onClick={(e) => handleDeleteItem(item.id, e)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer z-10 active:scale-95"
                    title="Delete this item"
                   >
                     <Trash2 size={20} />
                   </button>
                 </div>
               ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};