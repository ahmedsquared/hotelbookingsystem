var { MongoClient } = require("mongodb");

var db = null;
async function connect(){
    if(db == null){
        var url = 'mongodb+srv://dbUser:Wf81kH5ELPmpAo1u@cluster0.gnrno.mongodb.net/cps888?retryWrites=true&w=majority';
        var options = {
            useUnifiedTopology: true,
        };

        var connection = await MongoClient.connect(url, options);
        db = await connection.db("cps888");
    }
    
    return db;
}

async function register(username, password){
    var conn = await connect();
    var existingUser = await conn.collection('customers').findOne({username});

    if (existingUser != null){
        throw new Error('User already exists!')
    }

    await conn.collection('customers').insertOne({username});
}

async function login(username, password){
    var conn = await connect();
    var user = await conn.collection('customers').findOne({username});

    if (user == null){
        throw new Error('User does not exist.')
    }
}

login('Ahmed');
//register("Ahmed", "lol");