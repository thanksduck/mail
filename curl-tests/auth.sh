#!/bin/bash

url='http://127.0.0.1:3456'
prefix='api/v1'

login() {
    local email="$1"
    local password="$2"
    curl -s -c cookie.txt -H "Content-Type: application/json" \
         -d '{"email":"'"$email"'","password":"'"$password"'"}' \
         "$url/$prefix/auth/login" | jq
}

signup() {
    local name="$1"
    local username="$2"
    local email="$3"
    local password="$4"
    local passwordConfirm="$5"
    curl -s -c cookie.txt -H "Content-Type: application/json" \
         -d '{"name":"'"$name"'","username":"'"$username"'","email":"'"$email"'","password":"'"$password"'","passwordConfirm":"'"$passwordConfirm"'"}' \
         "$url/$prefix/auth/signup" | jq
}

prompt_input() {
    local prompt="$1"
    local var_name="$2"
    local is_password="$3"

    if [ "$is_password" = true ]; then
        read -s -p "$prompt: " "$var_name"
        echo
    else
        read -p "$prompt: " "$var_name"
    fi
}

main() {
    if [ "$1" = "-l" ]; then
        if [ $# -ne 3 ]; then
            echo "Usage: $0 -l <email> <password>"
            exit 1
        fi
        login "$2" "$3"
    else
        echo "Select Route You want to test"
        echo "1. /auth/login"
        echo "2. /auth/signup"
        read -p "Enter your choice: " choice

        case $choice in
            1)
                prompt_input "Enter Email" email
                prompt_input "Enter your password" password true
                login "$email" "$password"
                ;;
            2)
                prompt_input "Enter Name" name
                prompt_input "Enter Username" username
                prompt_input "Enter Email" email
                prompt_input "Enter Password" password true
                prompt_input "Confirm Password" passwordConfirm true
                signup "$name" "$username" "$email" "$password" "$passwordConfirm"
                ;;
            *)
                echo "Invalid Choice"
                exit 1
                ;;
        esac
    fi
}

main "$@"