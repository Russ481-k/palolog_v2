### **Ubuntu에서 Palolog 로그 서버 설치 및 설정 방법**

로그 서버 설치 및 관리는 개발 환경에서 매우 중요한 작업입니다. 이 글에서는 Ubuntu 22.04 환경에서 Palolog 로그 서버를 설치하고 설정하는 방법을 단계별로 안내하겠습니다. 특히 Docker를 사용하여 서버를 설정하고 권한 문제를 해결하는 방법에 대해서도 설명합니다.

---

### **1. 필수 패키지 설치**

먼저 Git을 설치하고, Palolog 로그 서버 소스 코드를 클론합니다.

```bash
sudo apt-get install git
git clone "https://github.com/Russ481-k/palolog_v2.git"

```

### **2. Node Version Manager (NVM) 설치**

NVM(Node Version Manager)을 사용하여 Node.js 버전을 관리할 수 있습니다. NVM을 설치한 후 필요한 Node.js 버전을 설치합니다.

```bash
curl "https://raw.githubusercontent.com/creationix/nvm/master/install.sh" | bash
source ~/.bashrc
nvm install v20.15.0

```

### **3. npm 및 pnpm 설치**

Node.js를 설치한 후, 최신 npm과 pnpm 패키지를 설치합니다.

```bash
npm install -g npm@10.8.2
npm install -g pnpm

```

---

### **4. Docker 설치**

Palolog 로그 서버는 Docker를 통해 실행됩니다. Docker를 설치하는 단계는 다음과 같습니다.

### **1. 시스템 업데이트**

우선 우분투 시스템 패키지를 업데이트합니다.

```bash
sudo apt-get update

```

### **2. 필수 패키지 설치**

Docker 설치에 필요한 패키지들을 설치합니다.

```bash
sudo apt-get install apt-transport-https ca-certificates curl gnupg-agent software-properties-common jq

```

### **3. Docker GPG 키 추가**

Docker의 공식 GPG 키를 추가합니다.

```bash
curl -fsSL "https://download.docker.com/linux/ubuntu/gpg" | sudo apt-key add -

```

### **4. Docker 저장소 추가**

Docker의 공식 apt 저장소를 시스템에 추가합니다.

```bash
sudo add-apt-repository "deb [arch=amd64] "https://download.docker.com/linux/ubuntu" $(lsb_release -cs) stable"

```

### **5. Docker 설치**

Docker 패키지를 설치합니다.

```bash
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io

```

### **6. Docker 설치 확인**

다음 명령어로 Docker가 정상적으로 설치되었는지 확인합니다.

```bash
sudo systemctl status docker
sudo docker run hello-world

```

### **7. 사용자 Docker 그룹 추가**

Docker를 `sudo` 없이 사용하려면 현재 사용자를 `docker` 그룹에 추가해야 합니다.

```bash
sudo usermod -aG docker $USER
newgrp docker

```

---

### **5. Palolog 서버 설치**

Palolog 프로젝트 디렉토리에서 필요한 패키지들을 설치하고, Docker를 사용하여 서버를 실행합니다.

```bash
pnpm install

```

### **1. Docker Compose 실행**

다음 명령어로 Docker Compose를 사용하여 데이터베이스 및 서버를 초기화합니다.

```bash
pnpm dk:init

```

### **2. Windows에서의 Docker Compose**

Windows 환경에서 Docker Compose 실행 시 다음 명령어를 사용합니다.

```bash
docker compose up -d; Start-Sleep -Seconds 10; pnpm db:init

```

### **3. 서버 실행**

Docker에서 데이터베이스를 시작한 후 개발 서버를 실행합니다.

```bash
pnpm dk:start
pnpm dev

```

---

### **6. Dockerfile 권한 문제 해결**

Palolog의 초기 Dockerfile에서 `nextjs` 사용자가 `/app/package.json`에 접근할 수 없는 문제가 있었습니다. 이 문제는 비특권 사용자로 애플리케이션을 실행할 때 자주 발생하는 권한 문제입니다.

### **수정된 Dockerfile**

1. **`chown` 명령어 추가:**
    
    다음 명령어를 사용하여 `nextjs` 사용자가 `/app` 디렉토리에 접근할 수 있도록 소유권을 변경합니다.
    
    ```bash
    RUN chown -R nextjs:nodejs /app /pnpm
    
    ```
    
2. **`/pnpm` 디렉토리 생성:**
    
    `/pnpm` 디렉토리가 존재하지 않아 발생한 오류를 해결하기 위해 해당 디렉토리를 명시적으로 생성합니다.
    
    ```bash
    RUN mkdir -p /pnpm
    
    ```
    

---

### **7. 데이터베이스 연결 설정**

Palolog은 PostgreSQL 데이터베이스를 사용하며, `docker-compose.yml` 파일에서 데이터베이스 연결을 설정합니다.

```bash
# DATABASE 설정
DATABASE_URL="postgres://${DOCKER_DATABASE_USERNAME}:${DOCKER_DATABASE_PASSWORD}@palolog_v2-postgres-1:${DOCKER_DATABASE_PORT}/${DOCKER_DATABASE_NAME}"

```

---

### **8. Docker https 인증서 복사**
```bash
docker cp opensearch:/usr/share/opensearch/config/root-ca.pem ./ca-cert.pem
```

모든 설정이 완료된 후, Docker 이미지를 생성하고 서버를 실행합니다.


### **9. Docker 서버 실행 및 pm2 실행하여 서비스 배포**
```bash
docker stop $(docker ps -aq); docker rm $(docker ps -aq); pnpm dk:init; pm2 delete palolog; pnpm build; pm2 start pnpm --name 'palolog' --log '/home/vtek/palolog_v2/log.txt' -- start
```

---

### **마무리**

이 가이드를 따라 Palolog 로그 서버를 성공적으로 설치하고 실행할 수 있습니다. 설치 과정에서 발생할 수 있는 권한 문제나 Dockerfile 수정 사항도 함께 다뤘으며, 이를 통해 보다 원활한 서버 환경을 구축할 수 있을 것입니다.
