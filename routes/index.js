var express = require('express');
var router = express.Router();
const md5 = require('blueimp-md5')
const models = require('../db/models')
const UserModel = models.getModel('user')
const CommentModel = models.getModel('comment')
const CollectionModel = models.getModel('collection')
const FollowModel = models.getModel('follow')
const _filter = {'pwd': 0, '__v': 0} // 查询时过滤掉
const sms_util = require('../util/sms_util')
const users = {}
const ajax = require('../api/ajax')
var svgCaptcha = require('svg-captcha')

/*
密码登陆
 */
// router.post('/login_pwd', function (req, res) {
//   const name = req.body.name
//   const pwd = md5(req.body.pwd)
//   const captcha = req.body.captcha.toLowerCase()
//   console.log('/login_pwd', name, pwd, captcha, req.session)

//   // 可以对用户名/密码格式进行检查, 如果非法, 返回提示信息
//   if(captcha!==req.session.captcha) {
//     return res.send({code: 1, msg: '验证码不正确'})
//   }
//   // 删除保存的验证码
//   delete req.session.captcha

//   UserModel.findOne({name}, function (err, user) {
//     if (user) {
//       console.log('findUser', user)
//       if (user.pwd !== pwd) {
//         res.send({code: 1, msg: '用户名或密码不正确!'})
//       } else {
//         req.session.userid = user._id
//         res.send({code: 0, data: {_id: user._id, name: user.name, phone: user.phone}})
//       }
//     } else {
//       const userModel = new UserModel({name, pwd})
//       userModel.save(function (err, user) {
//         // 向浏览器端返回cookie(key=value)
//         // res.cookie('userid', user._id, {maxAge: 1000*60*60*24*7})
//         req.session.userid = user._id
//         const data = {_id: user._id, name: user.name}
//         // 3.2. 返回数据(新的user)
//         res.send({code: 0, data})
//       })
//     }
//   })
// })
/*
密码登陆
 */
router.post('/login_pwd', function (req, res) {
  const account = req.body.account
  const pwd = md5(req.body.pwd)
  console.log('/login_pwd', account, pwd)

  UserModel.findOne({phone:account}, function (err, user) {
    if (user) {
      console.log('findUser', user)
      if (user.pwd !== pwd) {
        res.send({code: 1, msg: '账户或密码错误!'})
      } else {
        req.session.userid = user._id
        res.send({code: 0, data: user})
      }
    } else {
      UserModel.findOne({email:account}, function (err, user) {
        if (user) {
          console.log('findUser', user)
          if (user.pwd !== pwd) {
            res.send({code: 1, msg: '账户或密码错误!'})
          } else {
            req.session.userid = user._id
            res.send({code: 0, data: user})
          }
        } else {
          res.send({code: 1, msg: '账户或密码错误!'})
        }
      })
    }
  })
})
/*
一次性图形验证码
 */
router.get('/captcha', function (req, res) {
  var captcha = svgCaptcha.create({
    ignoreChars: '0o1l',
    noise: 2,
    color: true
  });
  req.session.captcha = captcha.text.toLowerCase();
  console.log(req.session.captcha)
  /*res.type('svg');
  res.status(200).send(captcha.data);*/
  res.type('svg');
  res.send(captcha.data)
});

/*
发送验证码短信(注册)
*/
router.get('/sendcode', function (req, res, next) {
  //1. 获取请求参数数据
  var phone = req.query.phone;
  UserModel.findOne({phone}, function (err, user) {
    if (user) {
      res.send({code: 1, msg: '手机号已被注册'});
      return;
    }else{
      //2. 处理数据
      //生成验证码(6位随机数)
      var code = sms_util.randomCode(6);
      //发送给指定的手机号
      console.log(`向${phone}发送验证码短信: ${code}`);
      sms_util.sendCode(phone, code, function (success) {//success表示是否成功
        if (success) {
          users[phone] = code
          console.log('保存验证码: ', phone, code)
          res.send({"code": 0})
        } else {
          //3. 返回响应数据
          res.send({"code": 1, msg: '短信验证码发送失败'})
        }
      })
    }
  })
})
router.get('/sendlogincode', function (req, res, next) {
  //1. 获取请求参数数据
  var phone = req.query.phone;
  //2. 处理数据
  //生成验证码(6位随机数)
  var code = sms_util.randomCode(6);
  //发送给指定的手机号
  console.log(`向${phone}发送验证码短信: ${code}`);
  sms_util.sendCode(phone, code, function (success) {//success表示是否成功
    if (success) {
      users[phone] = code
      console.log('保存验证码: ', phone, code)
      res.send({"code": 0})
    } else {
      //3. 返回响应数据
      res.send({"code": 1, msg: '短信验证码发送失败'})
    }
  })
})
 /*
短信登陆
*/
router.post('/login_sms', function (req, res, next) {
  var phone = req.body.phone;
  var code = req.body.code;
  var uid = sms_util.randomCode(9);
  console.log('/login_sms', phone, code,uid);
  if (users[phone] != code) {
    res.send({code: 1, msg: '手机号或验证码不正确'});
    return;
  }
  //删除保存的code
  delete users[phone];


  UserModel.findOne({phone}, function (err, user) {
    if (user) {
      req.session.userid = user._id
      console.log(req.session.userid)
      res.send({code: 0, data: user})
    } else {
      //存储数据
      const userModel = new UserModel({phone,sex:'保密',uid,name:uid,level:'1'})
      userModel.save(function (err, user) {
        req.session.userid = user._id
        console.log(req.session.userid)
        res.send({code: 0, data: user})
      })
    }
  })

})

/* 
注册
*/
router.post('/register', function (req, res, next) {
  var phone = req.body.phone;
  var code = req.body.code;
  var pwd = md5(req.body.pwd);
  var uid = sms_util.randomCode(9);
  console.log('/register', phone, code,pwd,uid);
  if (users[phone] != code) {
    res.send({code: 1, msg: '手机号或验证码不正确'});
    return;
  }
  //删除保存的code
  delete users[phone];


  //存储数据
  const userModel = new UserModel({phone,pwd,sex:'保密',uid,name:uid,level:'1'})
  userModel.save(function (err, user) {
    req.session.userid = user._id
    res.send({code: 0, data: user})
  })

})

/*
根据sesion中的userid, 查询对应的user
 */
router.get('/userinfo', function (req, res) {
  // 取出userid
  const userid = req.session.userid
  console.log(userid)
  // 查询
  UserModel.findOne({_id: userid}, _filter, function (err, user) {
    // 如果没有, 返回错误提示
    if (!user) {
      // 清除浏览器保存的userid的cookie
      delete req.session.userid

      res.send({code: 1, msg: '请先登陆'})
    } else {
      // 如果有, 返回user
      res.send({code: 0, data: user})
    }
  })
})

/* 
退出登录
*/
router.get('/logout', function (req, res) {
  // 清除浏览器保存的userid的cookie
  delete req.session.userid
  // 返回数据
  res.send({code: 0})
})

//更新
router.post('/update', (req, res) => {
  const user = req.body
  UserModel.findOneAndUpdate({_id: user._id}, user)
    .then(oldProduct => {
      res.send({code: 0,data:user})
    })
    .catch(error => {
      console.error('更新用户异常', error)
      res.send({code: 1, msg: '更新用户异常, 请重新尝试'})
    })
})

//添加评论
router.post('/addcomment', function (req, res, next) {
  var comment = req.body;
  console.log('/addcomment',comment);
  //存储数据
  const commentModel = new CommentModel(comment)
  commentModel.save(function (err,value) {
    if (value) {
      res.send({code: 0})
    }
  })

})
//根据article_id查询哪条视频的评论
router.get('/comment', async (req, res) => {
  // 取出userid
  const article_id = req.query.article_id
  // 查询
  try {
    const comments = await CommentModel.find({article_id})
    for (let i = 0; i < comments.length; i++) {
      const result = await UserModel.findOne({_id:comments[i]._doc.user_id})
      comments[i]._doc.userinfo = result._doc
      if (comments[i]._doc.parent_id) {
        const result2 = await CommentModel.findOne({_id:comments[i]._doc.parent_id})
        const result3 = await UserModel.findOne({_id:result2._doc.user_id})
        comments[i]._doc.parent_user_info = result3._doc  
      }
    }
    res.send({code:0,data:comments})
  } catch (error) {
    console.log(error)
  }
})

//视频收藏/取消
router.post('/collection',function(req, res, next){
  var user_id = req.body.user_id
  var video_id = req.body.video_id
  CollectionModel.findOne({user_id,video_id},function(err,collection){
    if (collection) {
      CollectionModel.remove({user_id,video_id},function(err,data) {
        if (data) {
          res.send({code:200,msg:'取消收藏成功'})
        }else{
          console.log(err)
        }
      })
    }else{
      const collectionModel = new CollectionModel({user_id,video_id})
      collectionModel.save(function (err,value) {
        if (value) {
          res.send({code:200,msg:'收藏成功'})
        }else{
          console.log(err);
        }
      })
    }
  })
})
//查询是否已收藏
router.get('/collection',function(req, res, next){
  var user_id = req.query.user_id
  var video_id = req.query.video_id
  CollectionModel.findOne({user_id,video_id}, _filter,function(err,collection){
    console.log(collection);
    if (collection) {
      res.send({code:0})
    }else{
      res.send({code:1})
    }
  })
})

//用户关注/取消
router.post('/follow',function(req, res, next){
  var user_id = req.body.user_id
  var sub_id = req.body.sub_id
  FollowModel.findOne({user_id,sub_id},function(err,follow){
    if (follow) {
      FollowModel.remove({user_id,sub_id},function(err,data) {
        if (data) {
          res.send({code:200,msg:'取消关注成功'})
        }else{
          console.log(err)
        }
      })
    }else{
      const followModel = new FollowModel({user_id,sub_id})
      followModel.save(function (err,value) {
        if (value) {
          res.send({code:200,msg:'关注成功'})
        }else{
          console.log(err);
        }
      })
    }
  })
})
//查询是否已关注
router.get('/follow',function(req, res, next){
  var user_id = req.query.user_id
  var sub_id = req.query.sub_id
  FollowModel.findOne({user_id,sub_id}, _filter,function(err,follow){
    console.log(follow);
    if (follow) {
      res.send({code:0})
    }else{
      res.send({code:1})
    }
  })
})
//查询登录用户所有已关注
router.get('/follows',function(req, res, next){
  var user_id = req.query.user_id
  FollowModel.find({user_id}, _filter,function(err,follows){
    console.log(follows);
    if (follows) {
      res.send({code:0,data:follows})
    }else{
      res.send({code:1,msg:'查询失败'})
    }
  })
})
/*
根据经纬度获取位置详情
 */
router.get('/position/:geohash', function (req, res) {
  const {geohash} = req.params
  ajax(`http://cangdu.org:8001/v2/pois/${geohash}`)
    .then(data => {
      res.send({code: 0, data})
    })
})

/*
获取首页分类列表
 */
router.get('/index_category', function (req, res) {
  setTimeout(function () {
    const data = require('../data/index_category.json')
    res.send({code: 0, data})
  }, 300)
})

/*
根据经纬度获取商铺列表
?latitude=40.10038&longitude=116.36867
 */
router.get('/shops', function (req, res) {
  const latitude = req.query.latitude
  const longitude = req.query.longitude

  setTimeout(function () {
    const data = require('../data/shops.json')
    res.send({code: 0, data})
  }, 300)
})

router.get('/search_shops', function (req, res) {
  const {geohash, keyword} = req.query
  ajax('http://cangdu.org:8001/v4/restaurants', {
    'extras[]': 'restaurant_activity',
    geohash,
    keyword,
    type: 'search'
  }).then(data => {
    res.send({code: 0, data})
  })
})

require('./file-upload')(router)
module.exports = router;