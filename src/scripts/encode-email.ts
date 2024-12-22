import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';

dayjs.extend(duration);

// 테스트용 값 설정
const testValues = {
  domain: 'smtp.naver.com',
  port: '465',
  id: 'dbstnqls920',
  pw: 'dpffhgkdlzm@',
  email: 'dbstnqls920@naver.com',
  timeout: '180000',
};

// 인코딩
const hexEncodedDomain = Buffer.from(testValues.domain).toString('hex');
const hexEncodedPort = Buffer.from(testValues.port).toString('hex');
const hexEncodedId = Buffer.from(testValues.id).toString('hex');
const hexEncodedPw = Buffer.from(testValues.pw).toString('hex');
const hexEncodedEmail = Buffer.from(testValues.email).toString('hex');
const hexEncodedTimeout = Buffer.from(testValues.timeout).toString('hex');

// 원본 값 출력
console.log('\nOriginal Values:');
console.log('Domain:', testValues.domain);
console.log('Port:', testValues.port);
console.log('ID:', testValues.id);
console.log('Email:', testValues.email);

// 인코딩된 값 출력
console.log('\nHex Encoded Values (Add these to your .env file):');
console.log('X_H=' + hexEncodedDomain);
console.log('X_P=' + hexEncodedPort);
console.log('X_K=' + hexEncodedId);
console.log('X_V=' + hexEncodedPw);
console.log('X_U=' + hexEncodedEmail);
console.log('X_T=' + hexEncodedTimeout);

// 디코딩 확인
console.log('\nDecoded Values (verification):');
console.log('Domain:', Buffer.from(hexEncodedDomain, 'hex').toString());
console.log('Port:', Buffer.from(hexEncodedPort, 'hex').toString());
console.log('ID:', Buffer.from(hexEncodedId, 'hex').toString());
console.log('Email:', Buffer.from(hexEncodedEmail, 'hex').toString());
