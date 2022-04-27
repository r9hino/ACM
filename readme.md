## To-do:
1. Run server on booting and check if influx docker can be reached at startup.
2. Use bcrypt for hashing passwords.
3. Add only one array element when saving to local and remote DB.
4. Check there is no problem when 2 alert are duplicated, or when two or more alert get activated.
5. Control decimation in chart. Add stacket option in case there is boolean sensors or actuators.
6. Add actuator section in Monitor.
7. Add environment variables backend and frontend.
9. Add QR scanner for adding new devices to node-red.


## Managing npm packages:
### Updating npm packages:
1. Go to Backend folder
2. check for outdated packages: ```npm outdated```
3. Install packages with small changes: ```npm install package-name```
4. Install packages with big changes: ```npm install package-name@2.0.0```


## Mounting node-red with docker:
### Using docker
Getting node-red docker - Link: https://nodered.org/docs/getting-started/docker:
1. Create volume to persist data: ```docker volume create --name node_red_data```
2. Check volume: ```docker volume ls```
3. Get docker: ```docker run -p 1880:1880 -v node_red_data:/data --name mynodered nodered/node-red```
4. Add login to node-red - Link https://nodered.org/docs/user-guide/runtime/securing-node-red 
    - Enter node-red cointainer: ```docker exec -it mynodered /bin/bash```
    - Edit /data/settings.js file: ```nano /data/settings.js```
5. Backup file from container to external folder: ```docker cp  mynodered:/data  /your/backup/directory```

## Github commands:
### Commit changes:
1. Go to ACM folder
2. ```git add .```
3. ```git commit -m "Description"```
4. ```git push origin master```