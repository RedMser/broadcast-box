#!/bin/sh
# This script can be used to start from cron or other places
PATH_TO_BROADCAST_BOX=/path/to/broadcast-box

SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin:

# if go isn't in the path, you need to add it
# PATH=$PATH: /path/to/go/bin
# export GOPATH=/path/to/go-dep

cd $PATH_TO_BROADCAST_BOX
APP_ENV=production go run . &
