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

async function enter_payment_info(username){
    var conn = await connect();
    var user = await conn.collection('users').findOne({ username });

    if (user == null) {
        throw new Error('User does not exist!');
    }
}

async function add_payment_info(username, credit_num, csv) {
    var conn = await connect();

    await conn.collection('users').updateOne(
        { username },
        {
            $push: {
                list: {
                    $each: [credit_num, csv]
                }

            }
        }
    )
}

async function getListItems(username) {
    var conn = await connect();
    var user = await conn.collection('users').findOne({ username });

    console.log("List items: ", user.list);
}

async function deleteListItems(username, item) {
    var conn = await connect();
    await conn.collection('users').updateOne(
        { username },
        {
            $pull: {
                list: item,
            }
        }
    )
}
//add_payment_info("colin", "another credit number", "another csv");
//deleteListItems('colin', 'another csv')
//getListItems("colin");