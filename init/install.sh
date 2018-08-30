#!/usr/bin/env bash

####
# STRUCTURE
# /etc/rc.local : contain the script to pull the branch + execute the script
# /home/pi/skipq : contain files that installed at the initialisation of the SD card.
#           these files should not be removed!
#           rsa / rsa.bus : the ssh key used for the log to github
#           /logs : contains logs
#           /ticketToPrint : contains all tickets received
# /home/pi/skipq/script : the git repo that should be executed. Should contains at least the mainScript.js file
####

# configure :
# install printer tool
sudo apt-get update
sudo apt-get  install cups-client
# follow this tutorial  : https://www.hmazter.com/2013/05/raspberry-pi-printer-server-for-labelwriter/
# define printer as main printer
lpadmin -d DYMO_LabelWriter_450
# install node
sudo apt-get install nodejs

# mysql
sudo apt-get install mysql-server
# change root password
# sudo mysqladmin -u root password
# change password
sudo mysql -u root
GRANT ALL PRIVILEGES on *.* to 'root'@'localhost' IDENTIFIED BY 'root';
FLUSH PRIVILEGES;
# create DB /  table
create database printer;
use printer;
create table print_task(
   id  bigint(20) NOT NULL AUTO_INCREMENT,
   printTaskId  bigint(20) NOT NULL,
   fileName VARCHAR(255) NOT NULL,
   status VARCHAR(255) NOT NULL,
   printerTaskId VARCHAR(255),
   PRIMARY KEY ( id )
);



# SD card config : 
# 1. add rsa and rsa.pub into /home/pi/skipq
# ?? sudo chmod 400 /home/pi/skipq/rsa
# ?? sudo chmod 400 /home/pi/skipq/rsa.pub
# 2. add into /home/pi/.ssh/config :
mkdir /home/pi/.ssh
touch /home/pi/.ssh/config
echo "Host github.com" >> /home/pi/.ssh/config
echo "User florianjeanmart" >>  /home/pi/.ssh/config
echo "IdentityFile = /home/pi/skipq/rsa" >>  /home/pi/.ssh/config
echo "StrictHostKeyChecking no" >>  /home/pi/.ssh/config

# confirgure the timzone
sudo timedatectl set-timezone Europe/Brussels

# clone the repo then switch to the branch
git clone git@github.com:SkipQ/printer_script.git /home/pi/skipq/script
cd /home/pi/skipq/script/ && git fetch
cd /home/pi/skipq/script/ && git checkout deploy

# 3. replace /etc/rc.local by init.sh
sudo cp /home/pi/skipq/script/init/init.sh /etc/rc.local

# create the folders for logs and tickets
mkdir /home/pi/skipq/logs
mkdir /home/pi/skipq/ticketToPrint
mkdir /home/pi/skipq/init_logs

# install network-manager
sudo apt-get install network-manager

# init alexandre iphone network
# nmcli dev wifi connect 'Alexandre de Pret iPhone' password vgal8855

# TODO register the printer to the server

#reboot
reboot
