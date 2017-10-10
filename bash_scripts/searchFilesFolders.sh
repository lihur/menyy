#!/bin/bash
find $1 / -maxdepth 3 -type f 2>/dev/null -not -path '*/\.*' -print  | sort -u| grep -i $2 | head -n $3 

#Here is an example with multiple directories:
#find . -type d \( -path dir1 -o -path dir2 -o -path dir3 \) -prune -o -print
