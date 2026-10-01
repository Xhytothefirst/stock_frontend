#!/bin/bash

PROJECT_PATH="/home/xray/projects/stock_frontend"

cd $PROJECT_PATH
git pull

pnpm install
pnpm run build

sudo rm -rf "/var/www/html/stock"
sudo mv "dist" "/var/www/html/stock"
