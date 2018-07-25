#!/usr/bin/env bash

function testStatus() {
	lpstat | grep "$1" &> /dev/null
	if [ $? == 0 ]; then
		return
	else
		false
	fi
}

status='unknown'

# out of paper ?
if testStatus $1;then
	echo 'WAITING';
else
	echo 'DONE';
fi
