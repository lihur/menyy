#!/bin/bash
find $1 . -print | grep -i $2 | head -n $3
