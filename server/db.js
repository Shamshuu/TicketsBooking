const mongoose=require('mongoose');
const connectDB=async()=>
{
    try
    {
        const uri='mongodb+srv://shamshu2004:chandu123@cluster0.53yadzb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
        await mongoose.connect(uri, 
        {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to Mongodb');
    }
    catch(err)
    {
        console.log('Error connecting to MongoDB',err.message);
        process.exit(1);
    }
};
module.exports=connectDB;