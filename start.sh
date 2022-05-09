#!/bin/bash

# When installing a new node version do this:
# 1. Remove script from startup
#    - pm2 unstartup
# 2. Stop running server and vue:
#    - pm2 delete all
# 3. Stop pm2 daemon:
#    - ps aux | grep pm2 & kill -9 PID
# 4. Check lastest version:
#    - nvm ls-remote
# 5. nvm install v16.15.0
# 6. nvm use v16.15.0 & nvm current
# 7. npm i -g pm2
# 8. Add new path for pm2 in this script

# To run each services at startup use pm2 commands and not CRON
# Link: https://www.tecmint.com/enable-pm2-to-auto-start-node-js-app/
#       https://pm2.keymetrics.io/docs/usage/startup/
# Generate Startup Script
# $ pm2 startup
# Freeze your process list across server restart
# $ pm2 save
# Remove Startup Script
# $ pm2 unstartup
# For checking the satus of the PM2 service on system
# systemctl status pm2-pi.service

cd /home/pi/Code/ACM/Backend
/home/pi/.nvm/versions/node/v16.15.0/bin/pm2 start server.js --output ./Logs/info.log --error ./Logs/error.log --time --restart-delay 3000

cd /home/pi/Code/ACM/Backend/Microservices
/home/pi/.nvm/versions/node/v16.15.0/bin/pm2 start alertActivation.js --output ../Logs/info.log --error ../Logs/error.log --time --restart-delay 4000
/home/pi/.nvm/versions/node/v16.15.0/bin/pm2 start notifications.js --output ../Logs/info.log --error ../Logs/error.log --time --restart-delay 5000

cd /home/pi/Code/ACM/Frontend
/home/pi/.nvm/versions/node/v16.15.0/bin/pm2 start "npm run serve" --name vue-client --output ../Backend/Logs/vue-client-out.log --error ../Backend/Logs/vue-client-error.log --time --restart-delay 3000

cd ~

