#!/bin/sh

#
# This script is executed in a pre-commit hook to automagically
# regenerate the top-level persist-min.js file.
#

jsmin < src/persist.js > persist-min.js
