import { DownloadStatus, WebSocketMessage } from '@/types/download';

import { ConnectionState } from './constants';

interface MessageValidationConfig {
  connectionState: ConnectionState;
  socketId?: string;
  currentDownloadId: string | null;
}

export const useMessageProcessor = () => {
  const validateMessage = (
    rawMessage: Record<string, unknown>,
    messageType: string
  ): boolean => {
    const baseRequiredFields = ['downloadId', 'fileName'];
    const typeSpecificFields: Record<string, string[]> = {
      generation_progress: ['processedRows', 'totalRows', 'progress'],
      file_ready: ['status'],
      download_progress: ['processedRows', 'totalRows', 'progress'],
      progress: ['status', 'processedRows', 'totalRows'],
    };

    const requiredFields = [
      ...baseRequiredFields,
      ...(typeSpecificFields[messageType] || []),
    ];

    const missingFields = requiredFields.filter(
      (field) => !(field in rawMessage)
    );

    if (missingFields.length > 0) {
      console.error(`[Socket.IO] Missing required fields in ${messageType}:`, {
        missingFields,
        messageType,
        rawMessage,
        timestamp: new Date().toISOString(),
      });
      return false;
    }

    if (
      messageType === 'generation_progress' ||
      messageType === 'download_progress'
    ) {
      const progress = rawMessage.progress as number;
      const processedRows = rawMessage.processedRows as number;
      const totalRows = rawMessage.totalRows as number;

      if (typeof progress !== 'number' || progress < 0 || progress > 100) {
        console.error(`[Socket.IO] Invalid progress value in ${messageType}:`, {
          progress,
          messageType,
          timestamp: new Date().toISOString(),
        });
        return false;
      }

      if (
        typeof processedRows !== 'number' ||
        typeof totalRows !== 'number' ||
        processedRows < 0 ||
        totalRows < 0 ||
        processedRows > totalRows
      ) {
        console.error(`[Socket.IO] Invalid rows values in ${messageType}:`, {
          processedRows,
          totalRows,
          messageType,
          timestamp: new Date().toISOString(),
        });
        return false;
      }
    }

    return true;
  };

  const processMessage = (
    rawMessage: Record<string, unknown>,
    messageType: string,
    config: MessageValidationConfig,
    baseFields: Partial<WebSocketMessage> = {}
  ): WebSocketMessage | null => {
    console.log(`[Socket.IO] Processing ${messageType} message:`, {
      rawMessage,
      connectionState: config.connectionState,
      socketId: config.socketId,
      timestamp: new Date().toISOString(),
    });

    if (!validateMessage(rawMessage, messageType)) {
      return null;
    }

    try {
      const message: WebSocketMessage = {
        type: messageType as WebSocketMessage['type'],
        downloadId: rawMessage.downloadId as string,
        fileName: rawMessage.fileName as string,
        clientFileName: (rawMessage.clientFileName as string) || undefined,
        status: (rawMessage.status as DownloadStatus) || 'generating',
        progress: (rawMessage.progress as number) || 0,
        processedRows: rawMessage.processedRows as number,
        totalRows: rawMessage.totalRows as number,
        message: (rawMessage.message as string) || 'Processing...',
        timestamp: new Date().toISOString(),
        ...baseFields,
      };

      console.log(`[Socket.IO] Processed ${messageType} message:`, {
        message,
        timestamp: new Date().toISOString(),
      });

      return message;
    } catch (error) {
      console.error(`[Socket.IO] Error processing ${messageType} message:`, {
        error: error instanceof Error ? error.message : error,
        rawMessage,
        timestamp: new Date().toISOString(),
      });
      return null;
    }
  };

  return {
    validateMessage,
    processMessage,
  };
};
