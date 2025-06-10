'use client';  

import React, { createContext, useContext, useMemo } from 'react';
import { io } from 'socket.io-client';

import type { TypedSocket } from '../types/socket';

interface SocketContextType {
  socket: TypedSocket | null;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const SocketProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
const socket = useMemo(() => {
  return io("http://localhost:3005", { autoConnect: false }) as TypedSocket;
}, []);

React.useEffect(() => {
  socket.connect();

  return () => {
    socket.disconnect();
  }
}, [socket]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): TypedSocket|null => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context.socket;
};