#!/bin/sh -e
#
# /etc/rc.local
#
# This script is executed at the end of each multiuser runlevel.
# Make sure that the script will "exit 0" on success or any other
# value on error.
#
# In order to enable or disable this script just change the execution
# bits.
#
# By default this script does nothing.

###
# this script is used to launch the node main script
# 1. test if there is a new version of the script on the origin git repo
# 2. launch the js script with node and print the result into a log
###

FOLDER_PATH=/home/pi/skipq/
SCRIPT_FOLDER_PATH="${FOLDER_PATH}script/"
GIT_SCRIPT_FOLDER_PATH="$SCRIPT_FOLDER_PATH.git"
DATE=`date '+%Y-%m-%d %H:%M:%S'`

# need git update ?
git  --git-dir $GIT_SCRIPT_FOLDER_PATH pull

LOG_PATH="${FOLDER_PATH}logs/$DATE.log"
echo "Start script with log $LOG_PATH"
sudo touch "$LOG_PATH"
sudo chmod 777 "$LOG_PATH"
node "$SCRIPT_FOLDER_PATH/mainScript.js" > "$LOG_PATH"

exit 0
