#!/usr/bin/env bash

####
# STRUCTURE
# /etc/rc.local : contain the script to pull the branch + execute the script
# /home/pi/skipq : contain files that installed at the initialisation of the SD card.
#           these files should not be removed!
#           /logs : contains logs
#           /ticketToPrint : contains all tickets received
# /home/pi/skipq/script : the git repo that should be executed. Should contains at least the mainScript.js file
####

# configure :
# install printer tool
sudo apt-get update
sudo apt-get install cups-client -y
# !!! wrong printer version : the task are remove when there is no paper into the printer
# follow this tutorial  : https://www.hmazter.com/2013/05/raspberry-pi-printer-server-for-labelwriter/
# define printer as main printer
lpadmin -d DYMO_LabelWriter_450
# install node
sudo curl https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
source ~/.bashrc
sudo nvm install 6

# confirgure the timzone
sudo timedatectl set-timezone Europe/Brussels

# clone the repo then switch to the branch
git clone https://github.com/SkipQ/printer_script.git /home/pi/skipq/script
cd /home/pi/skipq/script/ && git fetch
cd /home/pi/skipq/script/ && git checkout deploy-prod

# 3. replace /etc/rc.local by init.sh
sudo cp /home/pi/skipq/script/init/init.sh /etc/rc.local

# create the folders for logs and tickets
mkdir /home/pi/skipq/logs
mkdir /home/pi/skipq/ticketToPrint
mkdir /home/pi/skipq/init_logs

# install network-manager
sudo apt-get install network-manager -y

# init alexandre iphone network
# nmcli dev wifi connect 'Alexandre de Pret iPhone' password vgal8855

# TODO register the printer to the server

#reboot
reboot
