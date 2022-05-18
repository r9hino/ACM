## To-do:
1. Run server on booting and check if influx docker can be reached at startup.
2. Use bcrypt for hashing passwords.
3. Add only one array element when saving to local and remote DB.
4. Check there is no problem when 2 alert are duplicated, or when two or more alert get activated.
5. Control decimation in chart. Add stacket option in case there is boolean sensors or actuators.
6. Add actuator section in Monitor.
7. Add environment variables backend and frontend.
9. Add QR scanner for adding new devices to node-red.
10. Make node-red work only locally using vpn. Probably need to modify iptables.
11. Use environment variables for dns and port on front-end.

## Installing a new node version
### Cancel start of server on boot
1. Remove PM2 booter: ```pm2 unstartup```
2. Follow instructions...
3. Stop running server and vue: ```pm2 delete all```
4. Stop pm2 daemon: ```ps aux | grep pm2 & kill -9 PID```
### Install new version of node and pm2
1. Install new node: 
    * ```nvm install v16.15.0```
    * ```nvm use v16.15.0 & nvm current```
2. Optional, remove previous node version: ```nvm uninstall v16.13.2```
3. Install new pm2: ```npm i -g pm2```
### Start/stop server on boot
1. Run services: ```/home/pi/Code/ACM/start.sh```
2. Generate startup script: ```pm2 startup```
3. Follow instructions...
4. Freeze your process list across server restart: ```pm2 save```
5. Stop server from booting up: ```pm2 unstartup```
6. Follow instructions...

## Managing SSH key
### Generating keys
1. Generate public and private key using ecdsa: ```ssh-keygen -t ecdsa -b 521```
2. Change name id_ecdsa.pub to authorized_keys: ```mv id_ecdsa.pub authorized_keys```
### Downloading keys
1. Enable ssh with password: ```sudo nano /etc/ssh/ssh_config```
2. Set PasswordAuthentication yes
3. Restart ssh service: ```sudo systemctl restart ssh.service```
4. Login with SCP and download id_ecdsa to local computer.
5. Disable ssh with password: ```sudo nano /etc/ssh/ssh_config```
6. Unset PasswordAuthentication no
7. Restart ssh service: ```sudo systemctl restart ssh.service```

## Managing npm packages
### Updating npm packages
1. Go to Backend folder
2. Check for outdated packages: ```npm outdated```
3. Install packages with small changes: ```npm install package-name```
4. Install packages with big changes: ```npm install package-name@2.0.0```

## Mounting docker containers
### Mounting nodered container with docker
[Getting node-red docker](https://nodered.org/docs/getting-started/docker):
1. Create volume to persist data: ```docker volume create --name node_red_data```
2. Check volume: ```docker volume ls```
3. Get docker: ```docker run -p 51880:1880 -v node_red_data:/data --name nodered nodered/node-red```
4. [Add login to node-red](https://nodered.org/docs/user-guide/runtime/securing-node-red):
    * Enter node-red cointainer: ```docker exec -it nodered /bin/bash```
    * Edit /data/settings.js file: ```nano /data/settings.js```
5. [Enable to store context to localFileSystem](https://nodered.org/docs/api/context/).
6. Backup file from container to external folder: ```docker cp nodered:/data /your/backup/directory```
7. Get host ip (physical device) from container: ```docker exec -it nodered ip route show default | awk '/default/ {print $3}'```
### Mounting all containers with docker-compose
1. Go to project docker folder: ```cd /home/pi/Code/ACM/Docker```
2. ```docker-compose -f docker-nodered-influxdb-pigpiod.yml --env-file ./../.env up -d```
3. Change user uid to 1000: ```sudo chown -R 1000:1000 path/to/your/node-red/data```
4. [Add login to node-red](https://nodered.org/docs/user-guide/runtime/securing-node-red):
    * Enter node-red cointainer: ```docker exec -it nodered /bin/bash```
    * Edit /data/settings.js file: ```nano /data/settings.js```

## Github commands
1. Clone repository: ```git clone -b master https://github.com/r9hino/ACM.git```
2. Github commit:
    * ```git add .```
    * ```git commit -m "Description"```
    * ```git push origin master```

## Backup Ubuntu OS while running
### Mount storage device
1. Create mounting point: ```mkdir /mnt/SD```
2. Check if device was detected and what is it partition: ```lsblk```
3. Mount the device: ```sudo mount /dev/sda1 /mnt/SD```
4. Check if device was correctly mounted: ```lsblk```
### Make an Ubuntu image and store it on the mounted device
1. Download [PiSafe](https://github.com/RichardMidnight/pi-safe):
    * ```wget https://raw.githubusercontent.com/RichardMidnight/pi-safe/main/pisafe -O pisafe```
    * ```bash pisafe install```
2. Stop all processes:
    * ```pm2 stop all```
    * ```cd /home/pi/Code/ACM/Docker```
    * ```doker-compose -f docker-nodered-influxdb-pigpiod.yml stop```
3. Run PiSafe: ```pisafe```
4. On Settings turn off "hide root device"
5. Go to Backup
6. Choose Ubuntu OS partition
7. Set destination path to /mnt/SD
8. After finishing the image creation, unmount device: ```sudo umount /mnt/SD```
9. Check unmounting: ```lsblk```

## Bring up server after cloning Github project repository
1. Backup ACM: ```mv ACM ACM-backup```
2. Clone Github repository.
3. Copy .env files:
    * ```cp ACM-backup/Backend/Helper/.env ACM/Backend/Helper/.env```
    * ```cp ACM-backup/Docker/.env ACM/Docker/.env```
4. Install npm modules:
    * ```cd Backend & npm install```
    * ```cd Frontend & npm install```
5. Start docker containers:
    * ```cd ACM/Docker```
    * Make InfluxDB folders if necessary: ```mkdir influxdb2/data influxdb2/config```
    * Change user id for node-red/data folder to 1000: ```sudo chown -R 1000:1000 ACM/Docker/node-red/data```
    * Start containers: ```docker-compose -f docker-nodered-influxdb-pigpiod.yml --env-file ./../.env up -d```
6. If necessary copy new token from influxdb page to .env files and nodered nodes.
7. In nodered, install npm packages: node-red-node-pi-gpiod, node-red-contrib-influxdb, node-red-contrib-soap.