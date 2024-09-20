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

create_destination() {
    read -p "Enter destination: " destination
    local data='{"destination":"'"$destination"'"}'
    send_request "POST" "/mail/destination" "$data"
}

list_destinations() {
    send_request "GET" "/mail/destination"
}

get_destination() {
    read -p "Enter destination ID: " id
    send_request "GET" "/mail/destination/$id"
}

delete_destination() {
    read -p "Enter destination ID: " id
    read -s -p "Enter your password: " password
    echo
    local data='{"password":"'"$password"'"}'
    send_request "DELETE" "/mail/destination/$id" "$data"
}

echo "Available Routes:"
echo "1. POST /mail/destination"
echo "2. GET /mail/destination/"
echo "3. GET /mail/destination/:id"
echo "4. DELETE /mail/destination/:id"

read -p "Enter your choice (1-4): " choice

case $choice in
    1) create_destination ;;
    2) list_destinations ;;
    3) get_destination ;;
    4) delete_destination ;;
    *) echo "Invalid choice" ;;
esac