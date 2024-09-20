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

get_user() {
    send_request "GET" "/user/$1"
}

get_user_rules() {
    send_request "GET" "/user/$1/rules"
}

update_password() {
    local username="$1"
    read -s -p "Enter current password: " currentPassword
    echo
    read -s -p "Enter new password: " newPassword
    echo
    read -s -p "Confirm new password: " newPasswordConfirm
    echo
    local data='{"currentPassword":"'"$currentPassword"'","newPassword":"'"$newPassword"'","passwordConfirm":"'"$newPasswordConfirm"'"}'
    send_request "PATCH" "/user/$username/update-password" "$data"
}

update_user() {
    local username="$1"
    read -p "Enter new name (leave blank to skip): " name
    read -p "Enter new email (leave blank to skip): " email
    local data='{}'
    [ -n "$name" ] && data=$(echo "$data" | jq --arg name "$name" '. + {name: $name}')
    [ -n "$email" ] && data=$(echo "$data" | jq --arg email "$email" '. + {email: $email}')
    send_request "PATCH" "/user/$username/update" "$data"
}

delete_user() {
    local username="$1"
    read -s -p "Enter your password to confirm deletion: " password
    echo
    local data='{"password":"'"$password"'"}'
    send_request "DELETE" "/user/$username/delete" "$data"
}

main() {
    echo "Available Routes:"
    echo "1. GET /user/:username"
    echo "2. GET /user/:username/rules"
    echo "3. PATCH /user/:username/update-password"
    echo "4. PATCH /user/:username/update"
    echo "5. DELETE /user/:username/delete"
    
    read -p "Enter your choice (1-5): " choice
    read -p "Enter username: " username

    case $choice in
        1) get_user "$username" ;;
        2) get_user_rules "$username" ;;
        3) update_password "$username" ;;
        4) update_user "$username" ;;
        5) delete_user "$username" ;;
        *) echo "Invalid choice" ;;
    esac
}

main