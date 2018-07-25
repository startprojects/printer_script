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
# 2. add into /home/pi/.ssh/config : 
# Host github.com
# User florianjeanmart
# IdentityFile = /home/pi/skipq/rsa
# 3. replace /etc/rc.local by init.sh

# clone the repo then switch to the branch
git clone git@github.com:SkipQ/printer_script.git /home/pi/skipq/script
git --git-dir  /home/pi/skipq/script/.git fetch
git --git-dir  /home/pi/skipq/script/.git checkout deploy

# create the folders for logs and tickets
mkdir /home/pi/skipq/logs
mkdir /home/pi/skipq/ticketToPrint

# TODO register the printer to the server
