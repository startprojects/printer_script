#!/usr/bin/env bash

###
# this script is used to launch the node main script
# 1. test if there is a new version of the script on the origin git repo
# 2. launch the js script with node and print the result into a log
###

GIT_FOLDER_PATH=./printerScript/.git
DATE=`date '+%Y-%m-%d %H:%M:%S'`

# need git update ?
# compare the commit id from local and origin repo
ORIGIN_COMMIT_ID="$(git --git-dir $GIT_FOLDER_PATH rev-parse origin/deploy)"
LOCAL_COMMIT_ID="$(git --git-dir $GIT_FOLDER_PATH rev-parse HEAD)"

if [ "$ORIGIN_COMMIT_ID" != "$LOCAL_COMMIT_ID" ];then
	git $GIT_FOLDER_PATH pull
	echo "GIT REPO REFRESHED"
else
    echo "GIT REPO UP TO DATE"
fi

echo "Start script"
node "$GIT_FOLDER_PATH/mainScript.js" > "/home/pi/skipq/logs/$DATE.log"
