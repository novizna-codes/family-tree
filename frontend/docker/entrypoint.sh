#!/bin/sh

# Function to create config.js with environment variables
create_config() {
    cat > /usr/share/nginx/html/config.js << EOF
window.ENV = {
    VITE_API_URL: '${VITE_API_URL:-http://localhost:8000}',
    VITE_APP_NAME: '${VITE_APP_NAME:-Family Tree Builder}'
};
EOF
}

# Create the config file with current environment variables
create_config

# Start nginx
exec nginx -g "daemon off;"