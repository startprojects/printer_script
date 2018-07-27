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
# 3. replace /etc/rc.local by init.sh
sudo cp /home/pi/skipq/script/init/init.sh /etc/rc.local

# confirgure the timzone
sudo timedatectl set-timezone Europe/Brussels

# clone the repo then switch to the branch
git clone git@github.com:SkipQ/printer_script.git /home/pi/skipq/script
cd /home/pi/skipq/script/ && git fetch
cd /home/pi/skipq/script/ && git checkout deploy

# create the folders for logs and tickets
mkdir /home/pi/skipq/logs
mkdir /home/pi/skipq/ticketToPrint
mkdir /home/pi/skipq/init_logs

# install network-manager
sudo apt-get install network-manager

# init alexandre iphone network
nmcli dev wifi connect 'Alexandre de Pret iPhone' password vgal8855

# TODO register the printer to the server

#reboot
reboot
