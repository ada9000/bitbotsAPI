const express = require('express')
const {graphqlHTTP} = require('express-graphql')
const {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLString,
  GraphQLList,
  GraphQLInt,
  GraphQLNonNull
} = require('graphql')
const cors = require('cors')
const app = express()
app.use(cors())

const blockfrost = require('./api/blockfrost')
const redis = require('./db/redis')

const PayloadType = new GraphQLObjectType({
  name: 'Payload',
  description: 'Represents a bit_bot payloads',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLString) },
    data: { type: new GraphQLNonNull(GraphQLString) },
  })
})

const TraitsType = new GraphQLObjectType({
  name: 'Traits',
  description: 'Represents a bit_bot traits',
  fields: () => ({
    background: { type: new GraphQLNonNull(GraphQLString) },
    ears: { type: new GraphQLNonNull(GraphQLString) },
    eyes: { type: new GraphQLNonNull(GraphQLString) },
    hat: { type: new GraphQLNonNull(GraphQLString) },
    mouth: { type: new GraphQLNonNull(GraphQLString) },
    special: { type: new GraphQLNonNull(GraphQLString) },
  })
})

const MetaType = new GraphQLObjectType({
  name: 'Meta',
  description: 'Represents a bit_bot meta',
  fields: () => ({
    fruit: { type: new GraphQLNonNull(GraphQLString) },
    moon: { type: new GraphQLNonNull(GraphQLString) },
    uid: { type: new GraphQLNonNull(GraphQLString) },
    traits: {type: TraitsType},
  })
})


const BitbotType = new GraphQLObjectType({
  name: 'Bitbot',
  description: 'Represents a bit_bot',
  fields: () => ({
    name: { type: new GraphQLNonNull(GraphQLString) },
    ipfs: { type: new GraphQLNonNull(GraphQLString) },
    meta: { type: MetaType},
    references: {type: new GraphQLList(GraphQLString)},
    payload: {type: new GraphQLList(PayloadType)}
  })
})

const PayloadsType = new GraphQLObjectType({
  name: 'Payloads',
  description: 'Represents a bit_bot payloads',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLString) },
    name: { type: new GraphQLNonNull(GraphQLString) },
    data: { type: new GraphQLList(GraphQLString) },
    ipfs: { type: new GraphQLNonNull(GraphQLString) }
  })
})

const RootQueryType = new GraphQLObjectType({
  name: 'Query',
  description: 'Root Query',
  fields: () => ({ 
    bitbots: {
      type: new GraphQLList(BitbotType),
      description: 'All bots',
      resolve: async () => {
        return JSON.parse(await redis.get('bitbots'))
      }
    },
    bitbot: {
      type: BitbotType,
      description: 'A single bot',
      args: {
        name: { type: GraphQLString }
      },
      resolve: async (parent, args) => {
        const bitbots = JSON.parse(await redis.get('bitbots'))
        return bitbots.find(bot => bot.name === args.name)
      }
    },
    payloads: {
      type: new GraphQLList(PayloadsType),
      description: 'bitbots with given payload',
      args: {
        ids: { type: new GraphQLList(GraphQLString) }
      },
      resolve: async (parent, args) => {
        //const bitbots = JSON.parse(await redis.get('bitbots'))
        const payloads = JSON.parse(await redis.get('payloads'))
        var filteredPayloads = Array()
        for (const id in args.ids)
        {
          filteredPayloads.push(payloads.find(payload => payload.id === args.ids[id]))
        }
        return filteredPayloads;
      }
    },
  })
})

const schema = new GraphQLSchema({
  query: RootQueryType,
})

app.use('/graphql', graphqlHTTP({
  schema: schema,
  graphiql: true
}))

async function updateOnChainData()
{
  console.log("Updating on chain data")
  await blockfrost.updateKnownBitbots();
}

async function initServer()
{
  console.log("Init server");
  await blockfrost.updateKnownBitbots();
  var bitbots = await JSON.parse(await redis.get('bitbots'));
}

initServer().then(() => {
  app.listen(4000, () => {
    console.log('Server Running, localhost:4000')
  })
  // update data every minute
  console.log("Setting 1min update job")
  setInterval(updateOnChainData, 60000)
})


