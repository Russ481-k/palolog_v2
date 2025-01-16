import { io } from 'socket.io-client';

const testWebSocketConnection = async () => {
  const socket = io('http://localhost:3001', {
    path: '/api/ws/download',
    transports: ['websocket', 'polling'],
    autoConnect: false,
  });

  socket.on('connect', () => {
    console.log('Connected to server');

    // Test subscription
    socket.emit('subscribe', {
      downloadId: 'test-download',
      searchId: 'test-search',
      searchParams: {
        menu: 'system',
        timeFrom: new Date().toISOString(),
        timeTo: new Date().toISOString(),
        searchTerm: 'test',
      },
      totalRows: 100,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on('connected', () => {
    console.log('Server acknowledged connection');
  });

  socket.on('disconnect', (reason) => {
    console.log('Disconnected:', reason);
  });

  socket.on('error', (error) => {
    console.error('Error:', error);
  });

  // Specific progress event handlers
  socket.on('generation_progress', (message) => {
    console.log('Generation progress:', {
      fileName: message.fileName,
      progress: message.progress,
      status: message.status,
      processedRows: message.processedRows,
      totalRows: message.totalRows,
      message: message.message,
      timestamp: message.timestamp,
    });
  });

  socket.on('file_ready', (message) => {
    console.log('File ready:', {
      fileName: message.fileName,
      status: message.status,
      message: message.message,
      timestamp: message.timestamp,
    });
  });

  socket.on('download_progress', (message) => {
    console.log('Download progress:', {
      fileName: message.fileName,
      progress: message.progress,
      status: message.status,
      message: message.message,
      timestamp: message.timestamp,
    });
  });

  socket.on('count_update', (message) => {
    console.log('Count update:', message);
  });

  socket.on('progress', (message) => {
    console.log('Generic progress update:', message);
  });

  socket.connect();

  // Keep the process running for a while
  await new Promise((resolve) => setTimeout(resolve, 10000));
  socket.disconnect();
};

testWebSocketConnection().catch(console.error);
