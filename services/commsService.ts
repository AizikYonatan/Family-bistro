import { Peer } from 'peerjs';
import { Order, MenuItem, OrderStatus } from '../types.ts';
import { getOrders } from './storageService.ts';

const GLOBAL_KITCHEN_ID = 'family-bistro-global-kitchen-v1';

export type CommEvent = 
  | { type: 'MENU_UPDATE'; payload: MenuItem[] }
  | { type: 'NEW_ORDER'; payload: Order }
  | { type: 'ORDER_STATUS'; payload: { orderId: string; status: string } }
  | { type: 'SYNC_ORDERS'; payload: Order[] };

class CommsService {
  private hostPeer: Peer | null = null;
  private clientPeer: Peer | null = null;
  
  private hostConnections: any[] = [];
  private clientConnection: any | null = null;
  
  // Track if we are in local fallback mode
  private isLocalFallback = false;

  // Callbacks for UI updates
  private onDataCallback: ((data: CommEvent) => void) | null = null;
  private onHostConnectCallback: (() => void) | null = null;

  // --- HOST LOGIC (KITCHEN) ---

  async startHost(): Promise<string> {
    this.isLocalFallback = false; // Ensure we aren't in fallback if we become host
    
    return new Promise((resolve, reject) => {
      if (this.hostPeer && !this.hostPeer.destroyed) {
        console.log("Resuming existing host session...");
        resolve(this.hostPeer.id);
        return;
      }

      try {
        this.hostPeer = new Peer(GLOBAL_KITCHEN_ID, { debug: 1 });

        this.hostPeer.on('open', (id) => {
          console.log('Kitchen Opened with ID: ' + id);
          resolve(id);
        });

        this.hostPeer.on('connection', (conn) => {
          console.log('Host: Customer connected');
          this.hostConnections.push(conn);
          if (this.onHostConnectCallback) this.onHostConnectCallback();

          conn.on('data', (data: any) => {
            console.log('Host received data:', data);
            
            // BACKGROUND HANDLING: Save order immediately to storage
            if (data && data.type === 'NEW_ORDER') {
               this.handleBackgroundOrder(data.payload);
            }

            // UI Notification
            if (this.onDataCallback) this.onDataCallback(data);
          });

          conn.on('close', () => {
             this.hostConnections = this.hostConnections.filter(c => c !== conn);
          });
        });

        this.hostPeer.on('error', (err: any) => {
          console.error("Host Peer Error:", err);
          if (err.type === 'unavailable-id') {
             // If ID is taken, assume we are the host in another tab or just re-use storage
             reject(new Error("The Kitchen is already open on another device!"));
          } else {
             reject(err);
          }
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  // Helper to save order even if UI is not active
  private handleBackgroundOrder(newOrder: Order) {
      try {
          const stored = localStorage.getItem('family-bistro-orders');
          const currentOrders: Order[] = stored ? JSON.parse(stored) : [];
          
          // Avoid duplicates
          if (!currentOrders.find(o => o.id === newOrder.id)) {
              const updated = [newOrder, ...currentOrders];
              localStorage.setItem('family-bistro-orders', JSON.stringify(updated));
          }
      } catch (e) {
          console.error("Failed to save background order", e);
      }
  }

  isHosting(): boolean {
      return !!(this.hostPeer && !this.hostPeer.destroyed);
  }

  stopHosting() {
      if (this.hostPeer) {
          this.hostPeer.destroy();
          this.hostPeer = null;
          this.hostConnections = [];
      }
  }

  // --- CLIENT LOGIC (CUSTOMER) ---

  connectToKitchen(): Promise<void> {
    // LOOPBACK MODE: If we are already hosting (same device), skip PeerJS connection
    if (this.isHosting()) {
        console.log("Comms: Local Loopback Mode Active (Hosting & Viewing on same device)");
        return Promise.resolve();
    }

    return new Promise((resolve) => {
      // Always create a new client peer to ensure fresh connection logic
      if (this.clientPeer) {
          this.clientPeer.destroy();
      }

      this.clientPeer = new Peer(); // Random ID

      // TIMEOUT: If connection takes too long (3s), assume local/offline
      const timeoutId = setTimeout(() => {
          console.warn("Connection timeout - enabling local fallback");
          this.isLocalFallback = true;
          resolve();
      }, 3000);

      this.clientPeer.on('open', () => {
        const conn = this.clientPeer!.connect(GLOBAL_KITCHEN_ID, { reliable: true });

        conn.on('open', () => {
          clearTimeout(timeoutId);
          console.log('Client: Connected to kitchen!');
          this.clientConnection = conn;
          this.isLocalFallback = false;
          resolve();
        });

        conn.on('data', (data: any) => {
          console.log('Client received data:', data);
          if (this.onDataCallback) this.onDataCallback(data);
        });
        
        conn.on('error', (err) => {
            console.error('Client Connection error:', err);
        });
      });
      
      this.clientPeer.on('error', (err: any) => {
          clearTimeout(timeoutId);
          console.error("Client Peer Error (Recovering with Local Fallback):", err);
          // On any peer error (like unavailable-id which means Kitchen is closed), 
          // we fallback to local mode so the app still works for testing.
          this.isLocalFallback = true;
          resolve();
      });
    });
  }

  disconnectClient() {
      if (this.clientConnection) {
          this.clientConnection.close();
          this.clientConnection = null;
      }
      if (this.clientPeer) {
          this.clientPeer.destroy();
          this.clientPeer = null;
      }
  }

  // --- SHARED ---

  broadcast(event: CommEvent) {
    // 1. Send to remote clients (if we are Host)
    this.hostConnections.forEach(conn => {
      if (conn.open) conn.send(event);
    });

    // 2. Send to Kitchen (if we are a remote Client)
    if (this.clientConnection && this.clientConnection.open) {
        this.clientConnection.send(event);
    }

    // 3. LOOPBACK / FALLBACK HANDLING
    // If we are hosting on this device OR if we fell back to local mode,
    // we must manually handle the "backend" logic.
    if (this.isHosting() || this.isLocalFallback) {
        // A: Simulate saving the order to the DB (Storage)
        if (event.type === 'NEW_ORDER') {
            this.handleBackgroundOrder(event.payload);
        }

        // B: Update local listeners (CustomerView, TrackerView) immediately
        if (this.onDataCallback) {
            this.onDataCallback(event);
        }
    }
  }

  onData(cb: (data: CommEvent) => void) {
    this.onDataCallback = cb;
  }

  onHostConnect(cb: () => void) {
      this.onHostConnectCallback = cb;
  }
}

export const comms = new CommsService();