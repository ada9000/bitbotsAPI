const dotenv = require("dotenv")
const blockfrost = require('@blockfrost/blockfrost-js');
const redis = require('../db/redis')
const { timeout } = require("nodemon/lib/config");
const { watchOptions } = require("nodemon/lib/config/defaults");
const { RedisFunctionFlags } = require("@redis/client/dist/lib/commands/generic-transformers");


dotenv.config()
const API = new blockfrost.BlockFrostAPI({
    projectId: process.env.BLOCKFROST,
});

const policy = "ba3afde69bb939ae4439c36d220e6b2686c6d3091bbc763ac0a1679c"

const t = {
    name: "bit_bot 0x0000", 
    ipfs:"https://infura-ipfs.io/ipfs/QmaywzdsutKJAqbp6Ey5kDt8DfwvWZB2dUdaj4WdbkQd6d",
    meta:{
      "fruit":"🍒",
      "moon":"🌓",
      "uid":"0x0C020F0100000000",
      "traits":{
        "background":"Two suns",
        "ears":"None",
        "eyes":"None",
        "hat":"None",
        "Mouth":"None",
        "special":"Headless"
      }
    },
    references:['1','2','3'],
    payloads:[{"0":"the"},{"4":"cake"},{"5":"lies"}],
}

async function assetToMetadata(assetHash)
{
    // if assetHash in hashes break
    var txHashes = await JSON.parse(await redis.get('txHashes'));
    if (txHashes === null) txHashes = Array();

    var lastBitbots = await JSON.parse(await redis.get('bitbots'));
    var bitbots = Array();
    if (lastBitbots === null) lastBitbots = Array();


    // todo asset to tx hash
    const assetTxs = await API.assetsTransactions(assetHash);

    metas = []
    for (const assetTx in assetTxs)
    {
        const txHash = assetTxs[assetTx].tx_hash;
        if (txHashes.includes(txHash)) continue;

        const metadata = await API.txsMetadata(txHash)
        // get 721
        for (const meta in metadata)
        {
            if (metadata[meta].label === '721')
            {
                const name = Object.keys(metadata[meta].json_metadata[policy])[0];
                const bitbotMeta = metadata[meta].json_metadata;
                const innerMeta = bitbotMeta[policy][name];

                var bitbot = {}
                bitbot.name = name;
                bitbot.ipfs = innerMeta.image;
                bitbot.references = innerMeta.references.src; 
                bitbot.meta = {
                    "fruit": innerMeta['Lucky Fruit'],
                    "moon": innerMeta.Moon,
                    "uid": innerMeta['Unique identification'],
                    "traits": innerMeta['traits']
                }
                if (bitbotMeta.payload !== undefined){
                    bitbot.payloads = bitbotMeta.payload
                }
                bitbots.push(bitbot)
                console.log(`appended ${name}`)
            }
        }
        txHashes.push(txHash)
        await redis.set('bitbots', JSON.stringify(lastBitbots.concat(bitbots)))
        await redis.set('txHashes', JSON.stringify(txHashes))
    }
}


async function updateAssetHashes()
{
    // get page convert to int
    var page = await redis.get('page')
    if (page === null) page = 0;
    page = parseInt(page)
    // get new assset hashes
    var newAssetHashes = Array()
    var pagesLeft = true;
    while (pagesLeft)
    {
        page += 1 // page starts at 1
        console.log(`start page ${page}`)
        const assets = await API.assetsPolicyById(policy, {page:page})
        if (assets.length === 0) {
            pagesLeft = false;
        }
        else {
            for (const asset in assets){
                newAssetHashes.push(assets[asset].asset)
            }
        }
    }

    // concat old and new hashesh
    var assetHashes = await JSON.parse(await redis.get('assetHashes'));
    if (assetHashes === null) assetHashes = Array();
    const allHashes = assetHashes.concat(newAssetHashes);

    // update page and hashes
    await redis.set('page', page-1); // page-1 as the last page might contain more next time we check
    await redis.set('assetHashes', JSON.stringify(allHashes));
}


async function updateKnownBitbots(){
    await updateAssetHashes()
    const assetHashes = await JSON.parse(await redis.get('assetHashes'))
    if (assetHashes !== null)
    {
        for (const asset in assetHashes)
        {
            await assetToMetadata(assetHashes[asset]);
        }
    }
}

module.exports = {updateKnownBitbots};