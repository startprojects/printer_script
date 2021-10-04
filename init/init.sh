#!/bin/sh -e
#
# rc.local
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

# configure the log for the file
DATE=`date '+%Y-%m-%d %H:%M:%S'`
exec 2> "/home/pi/skipq/init_logs/init_$DATE.log"
exec 1>&2
set -x


FOLDER_PATH=/home/pi/skipq/
SCRIPT_FOLDER_PATH=/home/pi/skipq/script/
GIT_SCRIPT_FOLDER_PATH="$SCRIPT_FOLDER_PATH.git"

# test internet connexion
counter=0
while :;
do
    is_internet_connection="$(wget -q --spider http://github.com > /dev/null && echo ok || echo error)"
    if [ $is_internet_connection = "ok" ]
    then
		echo 'ok'
        break
    else
		counter=$((counter+1))
		time=`date '+%Y-%m-%d %H:%M:%S'`
		echo "failed at try $counter at $time"
        sleep 10
    fi
done


# need git update ?
sudo su -l pi -c "cd /home/pi/skipq/script/ && git pull"

LOG_PATH="${FOLDER_PATH}logs/$DATE.log"
echo "Start script with log $LOG_PATH"
sudo touch "$LOG_PATH"
sudo chmod 777 "$LOG_PATH"


# nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash

export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s
sudo "/home/pi/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm

$NVM_DIR/nvm.sh install 10

$NVM_DIR/nvm.sh alias default 10

$NVM_DIR/nvm.sh use 10

node -v


node "$SCRIPT_FOLDER_PATH/stillAlive.js" &
node "$SCRIPT_FOLDER_PATH/mainScript.js" > "$LOG_PATH"


exit 0
