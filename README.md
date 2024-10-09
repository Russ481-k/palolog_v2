## INSTALL

```bash
sudo apt-get install git
```

```bash
git clone https://github.com/Russ481-k/palolog_v2.git
```

```bash
curl https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash
```

```bash
source ~/.bashrc
```

```bash
nvm install v20.15.
```

```bash
npm install -g npm@10.8.2

```

```bash
npm install -g @pnpm/ex
```

```bash
#도커 설치
실행환경
Ubuntu 22.04
Docker 설치방법

1. 우분투 시스템 패키지 업데이트
sudo apt-get update
2. 필요한 패키지 설치
sudo apt-get install apt-transport-https ca-certificates curl gnupg-agent software-properties-common

3. Docker의 공식 GPG키를 추가
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -

4. Docker의 공식 apt 저장소를 추가
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"

5. 시스템 패키지 업데이트
sudo apt-get update
6. Docker 설치
sudo apt-get install docker-ce docker-ce-cli containerd.io

7. Docker가 설치 확인
7-1 도커 실행상태 확인
sudo systemctl status docker
7-2 도커 실행
sudo docker run hello-world

8. 사용자 Docker 그룹 추가
newgrp docker
sudo usermod -aG docker $USER
```

```bash
pnpm install
```

```bash
# dk:init
pnpm dk:init

# 윈도우에서의 dk:init
docker compose up -d; Start-Sleep -Seconds 10; pnpm db:init
```

```bash
# Run the database in Docker (if not already started)
pnpm dk:start
# Run the development server
pnpm dev
```

```bash
docker build -t palolog .
docker run -p 8080:8080 palolog 
```

### 초기 Dockerfile 문제

처음 작성된 Dockerfile은 `nextjs` 사용자가 `/app/package.json` 파일에 접근할 수 없는 권한 문제를 일으켰습니다. 이는 Docker 컨테이너에서 애플리케이션을 비특권 사용자(`nextjs`)로 실행할 때 발생하는 일반적인 권한 문제입니다.

### 수정된 사항

1. **`chown` 명령어 추가:**
    
    ```
    dockerfile코드 복사
    RUN chown -R nextjs:nodejs /app /pnpm
    ```
    
    **이유:**`nextjs` 사용자가 `/app` 디렉토리 내의 파일에 접근할 수 있도록 소유권을 변경했습니다. 이 명령어는 `nextjs` 사용자가 파일을 읽고 쓸 수 있도록 보장합니다.
    
2. **`/pnpm` 디렉토리 생성:**
    
    ```
    dockerfile코드 복사
    RUN mkdir -p /pnpm
    ```
    
    **이유:**
    초기 시도에서는 `/pnpm` 디렉토리가 존재하지 않아 `chown` 명령어가 실패했습니다. 이를 해결하기 위해 `/pnpm` 디렉토리를 명시적으로 생성했습니다.
    

```bash
# DATABASE
DATABASE_URL="postgres://${DOCKER_DATABASE_USERNAME}:${DOCKER_DATABASE_PASSWORD}@palolog_v2-postgres-1:${DOCKER_DATABASE_PORT}/${DOCKER_DATABASE_NAME}"
```



### PM2

```jsx
실행 : pm2 start pnpm --name 'palolog' -- start

리스트 확인 : pm2 list

중지 : pm2 stop 'palolog'

재시작 : pm2 restart 'palolog'

삭제 : pm2 delete 'palolog'
```

```jsx
pm2 실행 옵션 (클러스터)

--watch : PM2가 실행된 프로젝트의 변경사항을 감지하여 서버를 자동 재시작(reload)

nodemon과 유사하다, 주로 개발단계에서 즉시 반영되므로 매우 편리하게 사용 할 수 있다.
만일 watch옵션시에 특정 폴더 경로는 무시해야할 때 --watch --ignore-watch="[dir]/*"

-i max(코어개수) : Node.js의 싱글 스레드를 보완하기 위한 클러스터(Cluster) 모드

-i 뒤에 코어의 개수를 입력하거나 max를 쓰면 최대 코어 개수로 클러스터링(Clustering) 된다.

--name  : 앱 이름 지정
--max-memory-restart <200MB> : 앱이 리로드 될때 최대의 메모리 지정
--log <log_path> : 로그 파일 경로 지정
-- arg1 arg2 arg3 : 스크립트에 추가 인수 전달
--restart-delay <delay in ms> : 재시작할때의 딜레이 지정
--time : 로그 남길때 프리픽스로 시간 지정
--no-autorestart : 재시작 불가하도록 설정
--cron <cron_pattern> : 주기적으로 강제 재시작이 필요할때 설정 (cron)
출처: https://inpa.tistory.com/entry/node-📚-PM2-모듈-사용법-클러스터-무중단-서비스 [Inpa Dev 👨‍💻:티스토리]
```

pnpm build; pm2 start pnpm --name 'palolog' -- start --log '/home/vtek/palolog_v2’

pm2 stop 'palolog'; pnpm dk:init; pnpm dk:start; pnpm build; pm2 restart 'palolog’

pnpm build; pm2 start pnpm --name 'palolog' --log '/home/vtek/palolog_v2/log.txt' -- start
docker-compose >> palolog_v2
