### **Ubuntu에서 EntaSys 2.0 로그 서버 설치 및 설정 방법**

1. entasys 폴더 압축 해제
2. 설치 명령어
    ```jsx
    sudo apt-get update;
    sudo apt-get install -y apt-transport-https ca-certificates curl gnupg-agent sysstat software-properties-common jq;



    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -;
    sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable";
    sudo apt-get update;
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io;

    sudo usermod -aG docker $USER;
    newgrp docker;
    sudo chown $USER /var/run/docker.sock;
    sudo chmod 666 /var/run/docker.sock;
    sudo chown vtek:vtek ./logstash/pipeline;
    ls -ld ./logstash/pipeline/;
    sudo chown -R vtek:vtek ./logstash/pipeline/;
    sudo chmod -R u+w ./logstash/pipeline/;
    sudo  chmod +x init_opensearch.sh
    ```
    
    ```jsx
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash;
    export NVM_DIR="$HOME/.nvm";
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm;
    nvm install v20.15.0;

    npm install -g npm@10.8.2;
    npm install -g pnpm;
    npm install -g pm2
    pnpm install;

    sudo chown -R $USER:$USER ./.next
    sudo chmod -R 755 ./.next
    # 시스템 레벨의 UDP 버퍼 크기 확인/조정
    sudo tee /etc/sysctl.d/99-network-tune.conf << EOF
    sudo sysctl -w vm.max_map_count=262144

    # Network Buffer Sizes
    net.core.rmem_max=268435456
    net.core.rmem_default=268435456
    net.core.wmem_max=268435456
    net.core.wmem_default=268435456

    # Network Backlog
    net.core.netdev_max_backlog=320000

    # UDP Memory
    net.ipv4.udp_mem=268435456 268435456 268435456

    # TCP Memory
    net.ipv4.tcp_rmem=4096 87380 268435456
    net.ipv4.tcp_wmem=4096 87380 268435456
    EOF

    # 설정 적용
    sudo sysctl -p /etc/sysctl.d/99-network-tune.conf

    
    pnpm prod   
    
    ```


    명령어를 2번 나눠 입력해 주시면 됩니다.
    중간중간에 엔터 눌러주셔야하고, 시간초가 흐르면 제가 메시지 드리는 코드 입력해 주시면 되겠습니다. 
    그리고 종종 빌드가 되지 않는 경우가 있는데, 그 때는 마지막 명령어를 한 번 씩 더 입력해 주시면 되겠습니다.
        
        
    # 514 포트 실시간 수신 패킷 수 확인
    ```jsx
    clear
    declare -a packet_counts
    total_packets=0
    index=0
    array_size=60  # 1분 = 60초

    # 초기 배열 채우기
    for ((i=0; i<array_size; i++)); do
        packet_counts[$i]=0
    done

    while true; do
        # 현재 초당 패킷 수 계산
        current_packets=$(sudo timeout 1s tcpdump -i any 'udp port 514' 2>/dev/null | wc -l)
        
        # 배열 업데이트
        total_packets=$((total_packets - packet_counts[index] + current_packets))
        packet_counts[index]=$current_packets
        index=$(((index + 1) % array_size))
        
        # 평균 계산
        avg_packets=$(echo "scale=2; $total_packets / 60" | bc)
        
        # 결과 출력 (현재 시간, 현재 패킷 수, 1분 평균)
        echo -ne "\r$(date +%H:%M:%S) Current: ${current_packets} packets/sec | 1min Avg: ${avg_packets} packets/sec     "
        
        sleep 1
    done
    
    ```


    ```
        prod:clean: 기존 PM2 프로세스와 포트 사용 정리
        build: Next.js 앱과 웹소켓 서버를 동시에 빌드
        prod:docker: 도커 컨테이너 재시작
        prod:permissions: .next 디렉토리 권한 설정
        prod:start: PM2로 Next.js 앱과 웹소켓 서버 시작

        prod:clean; build; prod:docker; prod:permissions; prod:start;
    ```