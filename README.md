### **Ubuntu에서 Palolog 2.0 로그 서버 설치 및 설정 방법**

1. palolog 폴더 압축 해제
2. 설치 명령어
    ```jsx
    sudo apt-get update;
    sudo apt-get install -y apt-transport-https ca-certificates curl gnupg-agent software-properties-common jq;
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -;
    sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable";
    sudo apt-get update;
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io;

    sudo usermod -aG docker $USER;
    newgrp docker;
    sudo chown $USER /var/run/docker.sock;
    sudo chmod 666 /var/run/docker.sock;
    sudo chown vtek:vtek /home/vtek/palolog_v2/logstash/pipeline;
    ls -ld /home/vtek/palolog_v2/logstash/pipeline/;
    sudo chown -R vtek:vtek /home/vtek/palolog_v2/logstash/pipeline/;
    sudo chmod -R u+w /home/vtek/palolog_v2/logstash/pipeline/;
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

    docker stop $(docker ps -aq); docker rm $(docker ps -aq);

    pm2 delete palolog ;
    pnpm build;
    pnpm dk:init;
    pm2 start pnpm --name 'palolog' --log '/home/vtek/palolog_v2/log.txt' -- start;
    ```