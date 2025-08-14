#!/bin/bash
set -e
echo "--- Changing directory to public ---"
cd public
echo "--- Installing npm dependencies ---"
npm install
echo "--- Running tests ---"
npm test
