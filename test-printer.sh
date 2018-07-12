#!/usr/bin/env bash

function testStatus() {
	lpstat -l -p DYMO_LabelWriter_450 | grep "$1" &> /dev/null
	if [ $? == 0 ]; then
		return
	else
		false
	fi
}

function testPlugged() {
	lsusb | grep "LabelWriter 450" &> /dev/null
	if [ $? == 0 ]; then
		return
	else
		false
	fi
}

status='unknown'

# unlugged ? 
if ! testPlugged;then
	status='unplugged'
# out of paper ?
elif testStatus 'out-of-paper';then
	status='out_of_paper'
# not plugged ?
elif testStatus 'Waiting for printer to become available';then
	status='not_available'
# everything is ok ? 
elif testStatus 'Ready to print.';then
	status='ready_to_print'
# idle ?
elif testStatus ' is idle..';then
	status='idle'
fi

# other
if [ $status == "unknown" ];then
	status="$(lpstat -l -p DYMO_LabelWriter_450)"
fi

echo $status;

