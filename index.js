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
  })
})

const schema = new GraphQLSchema({
  query: RootQueryType,
})

app.use('/graphql', graphqlHTTP({
  schema: schema,
  graphiql: true
}))


// on first run get all payloads
// for each search find more data if not there

// start a update job ever 5 min

async function initServer()
{
  console.log("Init server");
  var bitbots = await JSON.parse(await redis.get('bitbots'));
  if (bitbots === null) await blockfrost.updateKnownBitbots();
}

initServer().then(() => {
  console.log("cors enabled")
  app.listen(4000, () => {
    console.log('Server Running, localhost:4000')
  })
})


