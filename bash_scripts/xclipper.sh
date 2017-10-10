#!/bin/bash
xclip -i -selection clipboard -t text/uri-list <<< $1
