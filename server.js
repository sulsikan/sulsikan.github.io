//몽고DB 접속 코드
const mongoclient = require('mongodb').MongoClient;
const ObjId = require('mongodb').ObjectId;
const url = 'mongodb+srv://admin:1234@cluster0.dwpvhof.mongodb.net/?retryWrites=true&w=majority';
let mydb;
mongoclient
.connect(url)
.then((client) => {
    mydb = client.db("myboard");
})
.catch((err)=> {
    console.log(err);
});

const express = require('express');
const app = express();
const sha = require('sha256');

//쿠키값 암호화
let cookieParser = require('cookie-parser');
app.use(cookieParser('fnaslkjdglkag')); //임의의 암호값
app.get('/cookie', function(req, res){
    res.cookie('milk',{signed : true});  //쿠키 암호화
    res.send('product : '+req.signedCookies.milk); //쿠키 읽어오기
});

//session 기능 구현
let session = require('express-session');
app.use(session({
    secret: '1234dhwn',
    resave: false,
    saveUninitialized: true,
}));

//body-parser 라이브러리 추가
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended:true}));

// ejs 템플릿 사용 
app.set('view engin', 'ejs');

//이미지경로 설정
let multer = require('multer');
let storage = multer.diskStorage({
    destination : function(req, file, done){
        done(null, './public/image')
    },
    filename : function(req, file, done){
        done(null, file.originalname)
    }
});

//서버 실행
app.listen(8080, function(){
    console.log("포트 8080으로 서버 대기중 ...")
});

//메인페이지
app.get('/', function(req, res){
    if(req.session.user){
        console.log('세션 유지');
        res.render('index.ejs', {user:req.session.user});
    }else{
        res.render('index.ejs',{user:null});
    }
});

//myBlog사이트 로그인 창
app.get("/login", function (req,res){
    console.log(req.session);
    if(req.session.user){
        console.log('세션 유지');
        res.render('index.ejs', {user:req.session.user});
    }else{
        res.render('login.ejs');
    }
});

//인증세션 적용
app.post("/login", function (req, res) {
    mydb.collection('account').findOne({userid: req.body.userid})
    .then(result => {
        if(result.userpw==sha(req.body.userpw)){
            req.session.user = req.body;
            console.log('새로운 로그인');
            res.render('index.ejs', {user:req.session.user});
        }
    }).catch(err =>{
        res.render('err.ejs');
    });
});

//myBlog사이트 회원가입 창
app.get('/signup', function(req, res){
    res.render('signup.ejs');
});

//회원가입 기능 구현
app.post('/signup', function(req, res){
    let now = new Date();
    //now.toISOString()로 파라미터 값을 받아서 날짜를 받을 수 있다.
    console.log(req.body);

    mydb.collection('account').insertOne(
        {userid : req.body.userid, userpw : sha(req.body.userpw),usergroup : req.body.usergroup, useremail : req.body.useremail})
        .then(result =>{
            console.log(result);
            console.log('회원가입 성공')
        });
        res.redirect('/success');
});

//회원가입 성공창
app.get('/success', function(req, res){
    res.render('success.ejs');
});

//myBlog사이트 로그아웃 기능 구현
app.get('/logout', function(req, res){
    console.log('로그아웃')
    req.session.destroy();
    res.render('index.ejs', {user:null});
});

//블로그 게시글 리스트 창
app.get("/listmongo", function (req, res) {
    if(req.session.user){
        mydb.collection('post').find().toArray().then(result => {
            console.log(result);
            res.render('list_mongo.ejs', { data : result });
        });
    }else{
        res.render('login.ejs');
    }
});

//블로그 게시글 작성 창(몽고DB에 저장)
app.get('/entermongo', function(req, res){
    if(req.session.user){
        console.log('세션 유지');
        res.render('enter.ejs');
    }else{
        res.render('login.ejs');
    }
});

//게시글 작성 기능 구현(몽고DB에 post 방식으로 폼에 입력된 데이터를 전달)
app.post('/savemongo', function(req, res){
    console.log(req.session.user);
    let now = new Date();
    //now.toISOString()로 파라미터 값을 받아서 날짜를 받을 수 있다.
    console.log(req.body.title);
    console.log(req.body.content);

    mydb.collection('post').insertOne(
        {userid : req.session.user.userid, title : req.body.title, content : req.body.content, date : now.toLocaleDateString(), path : imagepath},
        function(err, result){
            console.log(err);
            console.log(result);
            console.log('데 이 터 추 가 성 공 ');
        });
        res.redirect('/listmongo');
});

//이미지 첨부
let upload = multer({storage:storage});
let imagepath = '';

app.post('/photo', upload.single('picture'), function(req,res){
    console.log(req.file.path);
    imagepath = '\\' + req.file.path;
});

//게시글 조회
app.get("/content/:id", function (req, res) {
    console.log(req.params.id);
    let new_id = new ObjId(req.params.id);
    mydb.collection('post').findOne({_id: new_id})
    .then(result => {
        console.log(result);
        res.render('content.ejs', { data : result });
    }).catch(err =>{
        console.log(err);
        res.status(500).send();
    });
});

//게시글 수정 창
app.get("/edit/:id", function (req, res) {
    console.log(req.params.id);
    let new_id = new ObjId(req.params.id);

    mydb.collection('post').findOne({_id: new_id})
    .then(result => {
        console.log(result);
        res.render('edit.ejs', { data : result });
    }).catch(err =>{
        console.log(err);
        res.status(500).send();
    });
});

//게시글 수정 기능 구현
app.post('/edit', function(req, res){
    console.log(req.body.title);
    console.log(req.body.content);
    let new_id = new ObjId(req.body.id);
    mydb.collection('post').updateOne({_id:new_id},
        {$set: {title : req.body.title, content : req.body.content, date : req.body.someDate}})
        .then(result =>{
            console.log('데이터 수정 성공');
            res.redirect('/listmongo');
        });
});

//몽고DB 데이터 삭제 기능 구현
app.post("/delete", function (req, res) {
    console.log(req.body);
    req.body._id = new ObjId(req.body._id);
    mydb.collection('post').deleteOne(req.body)
    .then(result=>{
        console.log('삭제 완료');
        res.status(200).send();
    })
    .catch(err =>{
        console.log(err);
        res.status(500).send();
    });
});

