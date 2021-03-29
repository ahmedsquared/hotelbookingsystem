var {MongoClient} = require("mongodb");
var bcrypt = requre("bcrypt");
var db = null;
async function connect(){
    if (db == null){
        var url = 'mongodb+srv://dbUser:H09gHCOOguRPlSpg@cluster0.rqwpp.mongodb.net/cps888?retryWrites=true&w=majority';
        var options = {
         useUnifiedTopology: true,
        }

        var connection = await MongoClient.connect(url);
        db = await connection.db("cps888");
    }

    return db;
}

async function register(username, password){
    var conn = await connect();
    var existingUser = await conn.collection('users').findOne({username});

    if (existingUser != null){
        throw new Error('User already exists.');
    }

    var SALT_ROUNDS = 10;
    var passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await conn.collection('users').insertOne({username, passwordHash});

}

async function login(username, password){
    var conn = await connect();
    var user = await conn.collection('users').findOne({username});

    if (user == null){
        throw new Error("User does not exist.");
    }

    var valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid){
        throw new Error("Invalid password.")
    }
}

async function addListItem(username, item){
    var conn = await connect();

    await conn.collection('users').updateOne(
        {username},
        {
            $push: {
                list: item,
            }
        }
    )
}

async function getListItems(username){
    var conn = await connect();
    var user = await conn.collection('users').findOne({username});

    console.log("List items:", user.list);
}

async function deleteListItems(username, item){
    var conn = await connect();
    await conn.collection('users').updateOne(
        {username},
        {
            $pull: {
                list: item,
            }
        }
    )
}
