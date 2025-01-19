import dayjs from 'dayjs';

export const generateFileNames = (config) => {
  const { downloadId, index, total } = config;
  // 서버 파일명은 항상 downloadId_index.csv 형식을 사용
  const serverFileName = total
    ? `${downloadId}_${(index || 0) + 1}.csv`
    : `${downloadId}_1.csv`;
  // 클라이언트 파일명은 menu_timestamp_index 형식을 사용
  const timestamp = dayjs().format('YYYY-MM-DD_HH:mm:ss');
  const clientFileName = total
    ? `${config.menu}_${timestamp}_${(index || 0) + 1}of${total}.csv`
    : `${config.menu}_${timestamp}_1of1.csv`;
  return {
    serverFileName,
    clientFileName,
  };
};
export const getServerFileName = (downloadId, index = 0) => {
  return `${downloadId}_${index + 1}.csv`;
};
