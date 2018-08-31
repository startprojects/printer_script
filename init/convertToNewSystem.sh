#!/usr/bin/env bash

# confirgure the timzone
sudo timedatectl set-timezone Europe/Brussels

# remove all
sudo rm -rf /home/pi/skipq/
sudo rm /home/pi/Desktop/*
mkdir /home/pi/skipq


# clone the repo then switch to the branch
git clone https://github.com/SkipQ/printer_script.git /home/pi/skipq/script
cd /home/pi/skipq/script/ && git fetch
cd /home/pi/skipq/script/ && git checkout deploy

# prepare for git ssh connexion
# 1. add rsa and rsa.pub into /home/pi/skipq
#sudo cp /home/pi/tmp/init/rsa /home/pi/skipq/
#sudo cp /home/pi/tmp/init/rsa.pub /home/pi/skipq/
#sudo chmod 400 /home/pi/skipq/rsa
#sudo chmod 400 /home/pi/skipq/rsa.pub
# 2. add into /home/pi/.ssh/config :
#mkdir /home/pi/.ssh
#touch /home/pi/.ssh/config
#echo "Host github.com" >> /home/pi/.ssh/config
#echo "User florianjeanmart" >>  /home/pi/.ssh/config
#echo "IdentityFile = /home/pi/skipq/rsa" >>  /home/pi/.ssh/config
#echo "StrictHostKeyChecking no" >>  /home/pi/.ssh/config


# 3. replace /etc/rc.local by init.sh
sudo cp /home/pi/skipq/script/init/init.sh /etc/rc.local

# create the folders for logs and tickets
mkdir /home/pi/skipq/logs
mkdir /home/pi/skipq/ticketToPrint
mkdir /home/pi/skipq/init_logs

#reboot
reboot
