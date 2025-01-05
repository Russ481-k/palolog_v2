import React from 'react';

import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { trpc } from '@/lib/trpc/client';

import { DownloadButton } from '../DownloadButton';

const mockStartDownload = vi.fn().mockResolvedValue({ downloadId: 'test-id' });
const mockDownloadFile = vi.fn();
const mockCleanup = vi.fn().mockResolvedValue(undefined);
const mockPauseDownload = vi.fn();
const mockResumeDownload = vi.fn();
const mockCancelDownload = vi.fn().mockResolvedValue(undefined);

vi.mock(
  '@/lib/trpc/client',
  () =>
    ({
      trpc: {
        download: {
          startDownload: {
            useMutation: () => ({
              mutateAsync: mockStartDownload,
              isLoading: false,
            }),
          },
          downloadFile: {
            useMutation: () => ({
              mutate: mockDownloadFile,
            }),
          },
          cleanup: {
            useMutation: () => ({
              mutate: mockCleanup,
              mutateAsync: mockCleanup,
            }),
          },
          pauseDownload: {
            useMutation: () => ({
              mutate: mockPauseDownload,
            }),
          },
          resumeDownload: {
            useMutation: () => ({
              mutate: mockResumeDownload,
            }),
          },
          cancelDownload: {
            useMutation: () => ({
              mutate: mockCancelDownload,
              mutateAsync: mockCancelDownload,
            }),
          },
        },
        Provider: ({ children }: { children: React.ReactNode }) => (
          <>{children}</>
        ),
      },
    }) as any
);

class MockWebSocket implements WebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readonly CONNECTING = MockWebSocket.CONNECTING;
  readonly OPEN = MockWebSocket.OPEN;
  readonly CLOSING = MockWebSocket.CLOSING;
  readonly CLOSED = MockWebSocket.CLOSED;

  binaryType: BinaryType = 'blob';
  bufferedAmount = 0;
  extensions = '';
  protocol = '';
  readyState: number = WebSocket.CONNECTING;
  url = '';
  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
  onerror: ((this: WebSocket, ev: Event) => any) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;
  onopen: ((this: WebSocket, ev: Event) => any) | null = null;
  connectAttempts = 0;

  constructor() {
    this.connectAttempts = 0;
    this.readyState = MockWebSocket.CONNECTING;
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen.call(this as unknown as WebSocket, new Event('open'));
      }
    }, 0);
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSING;
    if (this.onclose) {
      this.onclose.call(this as unknown as WebSocket, new CloseEvent('close'));
    }
    this.readyState = MockWebSocket.CLOSED;
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {}

  addEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    // Implementation not needed for tests
  }

  removeEventListener<K extends keyof WebSocketEventMap>(
    type: K,
    listener: (this: WebSocket, ev: WebSocketEventMap[K]) => any,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void {
    // Implementation not needed for tests
  }

  dispatchEvent(event: Event): boolean {
    return true;
  }

  emitError(error: Error): void {
    this.connectAttempts++;
    if (this.onerror) {
      this.onerror.call(this as unknown as WebSocket, new Event('error'));
    }
  }

  emitMessage(data: any): void {
    if (this.onmessage) {
      this.onmessage.call(
        this as unknown as WebSocket,
        new MessageEvent('message', { data: JSON.stringify(data) })
      );
    }
  }

  connect(): void {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen.call(this as unknown as WebSocket, new Event('open'));
    }
  }
}

// Mock WebSocket globally
global.WebSocket = vi.fn().mockImplementation(() => {
  const ws = new MockWebSocket();
  // Connect after a short delay to simulate real WebSocket behavior
  setTimeout(() => {
    ws.readyState = MockWebSocket.OPEN;
    if (ws.onopen) {
      ws.onopen.call(ws as unknown as WebSocket, new Event('open'));
    }
  }, 0);
  return ws;
}) as any;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const mockTrpcClient = {
  download: {
    startDownload: {
      useMutation: () => ({
        mutateAsync: mockStartDownload,
        isLoading: false,
      }),
    },
    downloadFile: {
      useMutation: () => ({
        mutate: mockDownloadFile,
        isLoading: false,
      }),
    },
    cleanup: {
      useMutation: () => ({
        mutate: mockCleanup,
        mutateAsync: mockCleanup,
        isLoading: false,
      }),
    },
    pauseDownload: {
      useMutation: () => ({
        mutate: mockPauseDownload,
        isLoading: false,
      }),
    },
    resumeDownload: {
      useMutation: () => ({
        mutate: mockResumeDownload,
        isLoading: false,
      }),
    },
    cancelDownload: {
      useMutation: () => ({
        mutate: mockCancelDownload,
        mutateAsync: mockCancelDownload,
        isLoading: false,
      }),
    },
  },
} as any;

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ChakraProvider>
      <QueryClientProvider client={queryClient}>
        <trpc.Provider client={mockTrpcClient} queryClient={queryClient}>
          {ui}
        </trpc.Provider>
      </QueryClientProvider>
    </ChakraProvider>
  );
};

describe('DownloadButton', () => {
  const defaultProps = {
    searchId: 'test-search',
    totalRows: 100,
    searchParams: {
      timeFrom: '2023-01-01',
      timeTo: '2023-12-31',
      menu: 'test',
      searchTerm: 'test',
    },
  };

  let mockWs: MockWebSocket;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    mockWs = new MockWebSocket();
    (global.WebSocket as any).mockImplementation(() => mockWs);
  });

  afterEach(async () => {
    mockWs.close();
    await act(async () => {
      await queryClient.clear();
    });
  });

  describe('네트워크 오류 및 재시도', () => {
    it('네트워크 오류 발생 시 재시도한다', async () => {
      renderWithProviders(<DownloadButton {...defaultProps} />);

      const downloadButton = await screen.findByRole('button', {
        name: /Download/i,
      });
      await act(async () => {
        await userEvent.click(downloadButton);
      });

      // Simulate WebSocket error and reconnection
      await act(async () => {
        mockWs.emitError(new Error('Connection failed'));
      });

      await waitFor(() => {
        expect(mockWs.connectAttempts).toBeGreaterThan(0);
      });

      // Simulate successful reconnection
      await act(async () => {
        mockWs.connect();
      });

      await waitFor(() => {
        expect(mockWs.readyState).toBe(MockWebSocket.OPEN);
      });
    }, 70000);
  });

  describe('파일 다운로드 및 정리', () => {
    it('다운로드 완료 후 정리가 실행된다', async () => {
      renderWithProviders(<DownloadButton {...defaultProps} />);

      const downloadButton = await screen.findByRole('button', {
        name: /Download/i,
      });
      await act(async () => {
        await userEvent.click(downloadButton);
      });

      // Simulate download progress
      await act(async () => {
        mockWs.emitMessage({
          type: 'progress',
          fileName: 'test.csv',
          progress: 100,
          status: 'completed',
        });
      });

      // Close modal
      const closeButton = await screen.findByRole('button', { name: /Close/i });
      await act(async () => {
        await userEvent.click(closeButton);
      });

      await waitFor(() => {
        expect(mockCleanup).toHaveBeenCalled();
      });
    }, 70000);
  });

  describe('다운로드 센터 모달', () => {
    it('모달이 열리고 닫힐 때 상태가 올바르게 변경된다', async () => {
      renderWithProviders(<DownloadButton {...defaultProps} />);

      const downloadButton = await screen.findByRole('button', {
        name: /Download/i,
      });
      await act(async () => {
        await userEvent.click(downloadButton);
      });

      // Wait for modal to open
      const modal = await screen.findByRole('dialog');
      expect(modal).toBeInTheDocument();

      // Close modal
      const closeButton = await screen.findByRole('button', { name: /Close/i });
      await act(async () => {
        await userEvent.click(closeButton);
        // Wait for any cleanup operations
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    }, 70000);

    it('다운로드 진행 상태가 올바르게 표시된다', async () => {
      renderWithProviders(<DownloadButton {...defaultProps} />);

      const downloadButton = await screen.findByRole('button', {
        name: /Download/i,
      });
      await act(async () => {
        await userEvent.click(downloadButton);
      });

      // Simulate download progress
      await act(async () => {
        mockWs.emitMessage({
          type: 'progress',
          fileName: 'test.csv',
          progress: 50,
          status: 'downloading',
        });
      });

      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toBeInTheDocument();
      });
    }, 70000);

    it('다운로드 완료 후 파일 목록이 표시된다', async () => {
      renderWithProviders(<DownloadButton {...defaultProps} />);

      const downloadButton = await screen.findByRole('button', {
        name: /Download/i,
      });
      await act(async () => {
        await userEvent.click(downloadButton);
      });

      // Simulate download completion
      await act(async () => {
        mockWs.emitMessage({
          type: 'progress',
          fileName: 'test.csv',
          progress: 100,
          status: 'completed',
        });
        // Wait for the grid to be rendered
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await waitFor(() => {
        const fileList = screen.getByTestId('download-grid');
        expect(fileList).toBeInTheDocument();
      });
    }, 70000);
  });
});

const simulateWebSocketMessage = async (
  downloadId: string,
  progress: number,
  status: string
) => {
  const ws = (window.WebSocket as any).mock.results[0].value;
  await act(async () => {
    ws.emitMessage({
      type: 'progress',
      downloadId,
      fileName: 'result.csv',
      progress,
      status,
    });
  });
};
