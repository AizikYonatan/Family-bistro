import { MenuItem, Order, OrderStatus } from '../types';

const KEYS = {
  MENU: 'family-bistro-menu',
  ORDERS: 'family-bistro-orders',
};

// Default Menu Data
const DEFAULT_MENU: MenuItem[] = [
  {
    id: '1',
    name: 'Dad\'s Famous Burger',
    description: 'A juicy beef patty with secret sauce, caramelized onions, and cheddar cheese.',
    price: 12.99,
    category: 'main',
    imageUrl: 'https://picsum.photos/400/300?random=1'
  },
  {
    id: '2',
    name: 'Mom\'s Mac & Cheese',
    description: 'Creamy, cheesy goodness baked with a crispy breadcrumb topping.',
    price: 8.50,
    category: 'starter',
    imageUrl: 'https://picsum.photos/400/300?random=2'
  },
  {
    id: '3',
    name: 'Magic Sparkle Water',
    description: 'Refreshing sparkling water with a hint of lemon and lime.',
    price: 2.00,
    category: 'drink',
    imageUrl: 'https://picsum.photos/400/300?random=3'
  },
  {
    id: '4',
    name: 'Super Sundae',
    description: 'Vanilla ice cream with chocolate syrup, sprinkles, and a cherry on top.',
    price: 5.00,
    category: 'dessert',
    imageUrl: 'https://picsum.photos/400/300?random=4'
  }
];

export const getMenu = (): MenuItem[] => {
  const stored = localStorage.getItem(KEYS.MENU);
  if (!stored) {
    localStorage.setItem(KEYS.MENU, JSON.stringify(DEFAULT_MENU));
    return DEFAULT_MENU;
  }
  return JSON.parse(stored);
};

export const saveMenuItem = (item: MenuItem): MenuItem[] => {
  const menu = getMenu();
  const updated = [...menu, item];
  localStorage.setItem(KEYS.MENU, JSON.stringify(updated));
  return updated;
};

export const deleteMenuItem = (id: string): MenuItem[] => {
  const menu = getMenu();
  // Ensure we compare strings to strings to avoid type mismatch issues
  const updated = menu.filter(i => String(i.id) !== String(id));
  localStorage.setItem(KEYS.MENU, JSON.stringify(updated));
  return updated;
};

export const getOrders = (): Order[] => {
  const stored = localStorage.getItem(KEYS.ORDERS);
  return stored ? JSON.parse(stored) : [];
};

export const createOrder = (customerName: string, items: any[]): Order => {
  const orders = getOrders();
  const total = items.reduce((sum, item) => sum + item.price, 0);
  
  const newOrder: Order = {
    id: Date.now().toString(),
    customerName,
    items,
    status: OrderStatus.PENDING,
    createdAt: Date.now(),
    total
  };

  const updatedOrders = [newOrder, ...orders];
  localStorage.setItem(KEYS.ORDERS, JSON.stringify(updatedOrders));
  return newOrder;
};

export const updateOrderStatus = (orderId: string, status: OrderStatus): Order[] => {
  const orders = getOrders();
  const updated = orders.map(o => o.id === orderId ? { ...o, status } : o);
  localStorage.setItem(KEYS.ORDERS, JSON.stringify(updated));
  return updated;
};

export const updateOrderAiComment = (orderId: string, comment: string): Order[] => {
  const orders = getOrders();
  const updated = orders.map(o => o.id === orderId ? { ...o, aiChefComment: comment } : o);
  localStorage.setItem(KEYS.ORDERS, JSON.stringify(updated));
  return updated;
};

export const clearCompletedOrders = (): Order[] => {
  const orders = getOrders();
  const active = orders.filter(o => o.status !== OrderStatus.COMPLETED);
  localStorage.setItem(KEYS.ORDERS, JSON.stringify(active));
  return active;
};

// --- SYNC FEATURES ---

export const getExportString = (): string => {
  const data = {
    menu: getMenu(),
    orders: getOrders()
  };
  // Simple Base64 encoding to make it look like a "code"
  return btoa(JSON.stringify(data));
};

export const importDataString = (code: string): boolean => {
  try {
    const json = atob(code);
    const data = JSON.parse(json);
    
    // Merge Menu: Add items that don't exist by ID, update ones that do
    if (data.menu && Array.isArray(data.menu)) {
      const currentMenu = getMenu();
      const menuMap = new Map(currentMenu.map(i => [i.id, i]));
      
      data.menu.forEach((item: MenuItem) => {
        menuMap.set(item.id, item);
      });
      
      localStorage.setItem(KEYS.MENU, JSON.stringify(Array.from(menuMap.values())));
    }

    // Merge Orders: Add orders that don't exist by ID
    if (data.orders && Array.isArray(data.orders)) {
      const currentOrders = getOrders();
      const orderMap = new Map(currentOrders.map(o => [o.id, o]));
      
      data.orders.forEach((order: Order) => {
        // Only add/update if status is "fresher"? No, let's just trust the import for now.
        // We prioritize the imported data if it exists, effectively syncing state.
        orderMap.set(order.id, order);
      });
      
      // Sort by date new to old
      const sortedOrders = Array.from(orderMap.values()).sort((a, b) => b.createdAt - a.createdAt);
      localStorage.setItem(KEYS.ORDERS, JSON.stringify(sortedOrders));
    }

    return true;
  } catch (e) {
    console.error("Import failed", e);
    return false;
  }
};
