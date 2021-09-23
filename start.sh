#!/bin/bash

# When installing a new node version do this:
# 1. Stop runing server and vue:
#    - pm2 delete server & pm2 delete vue-client
# 2. Stop pm2 daemon:
#    - ps aux | grep pm2 & kill -9 PID
# 3. Check lastest version:
#    - nvm ls-remote
# 4. nvm install v16.8.0
# 5. nvm use v16.8.0 & nvm current
# 6. npm i -g pm2
# 7. Add new path for pm2 in this script

cd /home/pi/Code/ACM/Backend
/home/pi/.nvm/versions/node/v16.8.0/bin/pm2 start server.js --output ./Logs/info.log --error ./Logs/error.log --time --restart-delay 3000

cd /home/pi/Code/ACM/Backend/Microservices
/home/pi/.nvm/versions/node/v16.8.0/bin/pm2 start alertActivation.js --output ../Logs/info.log --error ../Logs/error.log --time --restart-delay 4000
/home/pi/.nvm/versions/node/v16.8.0/bin/pm2 start notifications.js --output ../Logs/info.log --error ../Logs/error.log --time --restart-delay 5000

cd /home/pi/Code/ACM/Frontend
/home/pi/.nvm/versions/node/v16.8.0/bin/pm2 start "npm run serve" --name vue-client --output ../Backend/Logs/vue-client-out.log --error ../Backend/Logs/vue-client-error.log --time --restart-delay 3000

cd ~
