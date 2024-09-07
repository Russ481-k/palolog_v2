export const csvDownload = (data: string, dateFromTo: string) => {
  const dataString = data;
  const csvContent = 'data:text/csv;charset=utf-8,' + dataString;
  const encodedUri = encodeURI(csvContent);

  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', dateFromTo + '.csv');

  document.body.appendChild(link);
  link.click();

  link.remove();
};
