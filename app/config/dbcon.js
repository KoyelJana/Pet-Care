const mongoose = require('mongoose')

const dbcon = async () => {
    try{
        const con = mongoose.connect(process.env.MONGO_URL) 
        if(con)
        {
            console.log('Database Conencted')
        }
    }
    catch(error)
    {
        console.log(error)
    }
}

module.exports = dbcon