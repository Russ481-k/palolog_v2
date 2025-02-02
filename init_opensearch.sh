#!/bin/bash

# OpenSearch를 백그라운드에서 실행
/usr/share/opensearch/opensearch-docker-entrypoint.sh &

# OpenSearch가 시작될 때까지 대기
echo "Waiting for OpenSearch to start..."
until curl -s -f "https://localhost:9200/_cluster/health" -u "admin:admin" --insecure > /dev/null; do
    echo "Still waiting..."
    sleep 5
done

echo "OpenSearch is up and running!"

# 템플릿 적용
echo "Applying OpenSearch template..."
curl -X PUT "https://localhost:9200/_template/logstash_template" \
     -H "Content-Type: application/json" \
     -u "admin:admin" \
     --insecure \
     -d @"/templates/template.json"

echo "Template applied successfully!"

# 프로세스가 종료되지 않도록 대기
wait 