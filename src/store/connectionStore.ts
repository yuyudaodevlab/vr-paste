import { create } from 'zustand';
import type { DeviceInfo, AuthRequest, ServerInfo } from '@/lib/constants';

interface ConnectionState {
  serverInfo: ServerInfo;
  connectedDevices: DeviceInfo[];
  pendingAuthRequests: AuthRequest[];
  approvalCode: string | null;
  approvalCodeExpiry: number | null;
  approvalRequestId: string | null;

  setServerInfo: (info: Partial<ServerInfo>) => void;
  setConnectedDevices: (devices: DeviceInfo[]) => void;
  addDevice: (device: DeviceInfo) => void;
  removeDevice: (deviceId: string) => void;
  addAuthRequest: (request: AuthRequest) => void;
  removeAuthRequest: (requestId: string) => void;
  setPendingAuthRequests: (requests: AuthRequest[]) => void;
  setApprovalCode: (code: string | null, expiry: number | null, requestId: string | null) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  serverInfo: { port: 0, ip: '0.0.0.0', status: 'stopped' },
  connectedDevices: [],
  pendingAuthRequests: [],
  approvalCode: null,
  approvalCodeExpiry: null,
  approvalRequestId: null,

  setServerInfo: (info) =>
    set((state) => ({
      serverInfo: { ...state.serverInfo, ...info },
    })),

  setConnectedDevices: (devices) => set({ connectedDevices: devices }),

  addDevice: (device) =>
    set((state) => {
      const exists = state.connectedDevices.some((d) => d.id === device.id);
      if (exists) {
        return {
          connectedDevices: state.connectedDevices.map((d) => 
            d.id === device.id ? device : d
          ),
        };
      }
      return {
        connectedDevices: [...state.connectedDevices, device],
      };
    }),

  removeDevice: (deviceId) =>
    set((state) => ({
      connectedDevices: state.connectedDevices.filter((d) => d.id !== deviceId),
    })),

  addAuthRequest: (request) =>
    set((state) => {
      const exists = state.pendingAuthRequests.some((r) => r.id === request.id);
      if (exists) {
        return {
          pendingAuthRequests: state.pendingAuthRequests.map((r) => 
            r.id === request.id ? request : r
          ),
        };
      }
      return {
        pendingAuthRequests: [...state.pendingAuthRequests, request],
      };
    }),

  removeAuthRequest: (requestId) =>
    set((state) => ({
      pendingAuthRequests: state.pendingAuthRequests.filter((r) => r.id !== requestId),
    })),

  setPendingAuthRequests: (requests) => set({ pendingAuthRequests: requests }),

  setApprovalCode: (code, expiry, requestId) =>
    set({
      approvalCode: code,
      approvalCodeExpiry: expiry,
      approvalRequestId: requestId,
    }),
}));
