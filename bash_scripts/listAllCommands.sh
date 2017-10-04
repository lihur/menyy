#!/bin/bash
function createList {
	(echo -n $PATH | tr : '\0' | xargs -0 -n 1 ls; alias | sed 's/alias \([^=]*\)=.*/\1/') | sort -u | grep "$@"
}

function getMatches {
	# creates a list starting with the suitable string
	# Even though the other one finds all of those apps as well, this way the ones starting with the string will be in the front of the line
	createList -i ^$1
	# creates a list containing a suitable string
	createList -i $1
}

# removes duplicates from the list (because it runs twice)
getMatches $1 $2 | awk '!a[$0]++' | head -$2
