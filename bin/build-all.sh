#!/bin/sh

#
# This script is executed in a pre-commit hook to automagically
# regenerate the top-level persist-all-min.js file.
#

cat extras/swfobject.js src/persist.js | jsmin > persist-all-min.js
