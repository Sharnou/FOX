#!/bin/bash
set -e
echo "Starting XTOX Backend..."
cd backend
npm install --production
node server/index.js
