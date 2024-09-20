#!/bin/bash

url='http://127.0.0.1:3456'
prefix='api/v1'

send_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    
    if [ -n "$data" ]; then
        curl -s -X "$method" -b cookie.txt -H "Content-Type: application/json" \
             -d "$data" \
             "$url/$prefix$endpoint" | jq
    else
        curl -s -X "$method" -b cookie.txt -H "Content-Type: application/json" \
             "$url/$prefix$endpoint" | jq
    fi
}

create_rule() {
    read -p "Enter alias: " alias
    read -p "Enter destination: " destination
    local data='{"alias":"'"$alias"'","destination":"'"$destination"'"}'
    send_request "POST" "/mail/rule" "$data"
}

get_rule() {
    read -p "Enter rule ID: " id
    send_request "GET" "/mail/rule/$id"
}

update_rule() {
    read -p "Enter rule ID: " id
    read -p "Enter new alias (leave blank to skip): " alias
    read -p "Enter new destination (leave blank to skip): " destination
    local data='{}'
    [ -n "$alias" ] && data=$(echo "$data" | jq --arg alias "$alias" '. + {alias: $alias}')
    [ -n "$destination" ] && data=$(echo "$data" | jq --arg destination "$destination" '. + {destination: $destination}')
    send_request "PATCH" "/mail/rule/$id" "$data"
}

delete_rule() {
    read -p "Enter rule ID: " id
    send_request "DELETE" "/mail/rule/$id"
}

echo "Available Routes:"
echo "1. POST /mail/rule"
echo "2. GET /mail/rule/:id"
echo "3. PATCH /mail/rule/:id"
echo "4. DELETE /mail/rule/:id"

read -p "Enter your choice (1-4): " choice

case $choice in
    1) create_rule ;;
    2) get_rule ;;
    3) update_rule ;;
    4) delete_rule ;;
    *) echo "Invalid choice" ;;
esac