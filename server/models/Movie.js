const mongoose=require('mongoose');
const movieSchema=new mongoose.Schema(
{
    title: String,
    poster_url: String,
    synopsis: String,
    price: {
        type: Number,
        default: 200
    },
    onHold: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['active', 'held', 'deleted'],
        default: 'active'
    }
});
module.exports=mongoose.model('Movie', movieSchema);