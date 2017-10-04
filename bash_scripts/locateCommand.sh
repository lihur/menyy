#!/bin/bash
# Locates the command
function findCommandInfo {
	COMMAND=`type -P $1`
	MIME=`file --mime-type -b $COMMAND`
	echo $COMMAND
	echo $MIME
}

findCommandInfo $1
