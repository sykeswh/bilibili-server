/*
包含n个能操作mongodb数据库集合的model的模块
1. 连接数据库
  1.1. 引入mongoose
  1.2. 连接指定数据库(URL只有数据库是变化的)
  1.3. 获取连接对象
  1.4. 绑定连接完成的监听(用来提示连接成功)
2. 定义对应特定集合的Model
  2.1. 字义Schema(描述文档结构)
  2.2. 定义Model(与集合对应, 可以操作集合)
3. 向外暴露获取Model的方法
 */
// 1. 连接数据库
const mongoose = require('mongoose')
mongoose.connect('mongodb://localhost:27017/bilibili_server')
const conn = mongoose.connection
conn.on('connected', function () {
  console.log('数据库连接成功!')
})

// 2. 得到对应特定集合的Model: UserModel
const userSchema = mongoose.Schema({
  // 用户名
  'name': {type: String},
  // 密码
  'pwd': {type: String},
  // 电话
  'phone': {type: String},
  //邮箱
  'email': {type: String},
  //头像
  'header': {type:String},
  //性别
  'sex': {type: String},
  //出生日期
  'birthday':{type:Date,default:Date.now()},
  //个性签名
  'personal':{type: String},
  //等级
  'level':{type: String},
  //UID
  'uid':{type: String}
})
UserModel = mongoose.model('user', userSchema)
const commentSchema = mongoose.Schema({
  //_id:这条评论的id
  'article_id':{type:String},//哪个视频的评论
  'user_id':{type:String},//哪个用户发的评论
  'comment_date':{type:String},//什么时间发送的评论
  'comment_content':{type:String},//评论内容
  'parent_id':{type:String}//回复的哪条评论
})
CommentModel = mongoose.model('comment', commentSchema)
const collectionSchema = mongoose.Schema({
  'user_id':{type:String},//哪个用户收藏的
  'video_id':{type:String}
})
CollectionModel = mongoose.model('collection', collectionSchema)
const followSchema = mongoose.Schema({
  'user_id':{type:String},//谁关注的
  'sub_id':{type:String}//被关注的
})
FollowModel = mongoose.model('follow', followSchema)
// 3. 向外暴露
module.exports = {
  getModel(name) {
    return mongoose.model(name)
  }
}

