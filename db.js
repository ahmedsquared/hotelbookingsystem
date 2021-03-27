const { registerHelper } = require("hbs");
var { MongoClient } = require("mongodb");

var db = null;
async function connect(){
    if(db == null){
        var url = 'mongodb+srv://coliwong:3Vh0IaUalo9V0YRC@cluster0.u1riz.mongodb.net/cps888?retryWrites=true&w=majority';
        var options = {
            useUnifiedTopology: true,
        };

        var connection = await MongoClient.connect(url, options);
        db = await connection.db("cps888");
    }
    
    return db;
}

async function payment_info(username) {
    var conn = await connect();
    //Store user if exist into existingUser var
    var existingUser = await conn.collection('users').findOne({ username });
    
    if(existingUser == null) {
        await conn.collection('users').insertOne({ username });
    }
}

payment_info("colin");