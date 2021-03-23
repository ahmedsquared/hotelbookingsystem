var { MongoClient } = require("mongodb");

var db = null;
async function connect(){
    if(db == null){
        var url = 'mongodb+srv://dbUser:Wf81kH5ELPmpAo1u@cluster0.gnrno.mongodb.net/cps888?retryWrites=true&w=majority';
        var options = {
            useUnifiedTopology: true,
        };

        var connection = await MongoClient.connect(url, options);
        db = connection.db("cps888");
    }
    
    return db;
}
