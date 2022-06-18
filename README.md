# Bitbots API
* The api used by bitbots.art
* First time writting graphql please forgive the lack of structure

# Requirements
First you must install redis (debian example)
* sudo apt install redis-server
* sudo systemctl restart redis.service


# Build
Ensure you have met the requirements. 
* cp .env.example .env
* in .env change YOUR_API_KEY_HERE to your https://blockfrost.io/dashboard mainnet key 
* yarn install
* yarn start
* wait (a while as all known bitbots are queried on chain)