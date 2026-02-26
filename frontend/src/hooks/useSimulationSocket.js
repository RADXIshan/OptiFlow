import { useState, useEffect, useRef } from 'react';

export function useSimulationSocket(url = 'ws://localhost:8000/ws/simulation') {
  const [simulationState, setSimulationState] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const connect = () => {
      try {
        const socket = new WebSocket(url);
        socketRef.current = socket;

        socket.onopen = () => {
          setIsConnected(true);
          setError(null);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            setSimulationState(data);
          } catch (err) {
            console.error('Failed to parse websocket message', err);
          }
        };

        socket.onclose = () => {
          setIsConnected(false);
          // Try to reconnect after a delay
          setTimeout(connect, 2000);
        };

        socket.onerror = (err) => {
          console.error('WebSocket Error:', err);
          setError(err);
        };
      } catch (err) {
        setError(err);
      }
    };

    connect();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [url]);

  return { simulationState, isConnected, error };
}
