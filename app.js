const express = require('express');
const mysql = require('mysql'); // mysqlの読み込み
const session = require('express-session'); // express-session
const bcrypt = require('bcrypt'); // bcrypt読み込み
const app = express();

app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));

// mysql.connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'masa2525',
    database: 'list_app'
});

// express-session
app.use(
    session({
        secret: 'my_secret_key',
        resave: false,
        saveUninitialized: false,
    })
);

app.use((req, res, next) => {
    // session情報のユーザーIDとundefinedを比較
    if (req.session.userId === undefined) {
        res.locals.username = "ゲスト";
        res.locals.isLoggedIn = false;
    } else {
        res.locals.username = req.session.username;
        res.locals.isLoggedIn = true;
    }
    next();
});

// top画面
app.get('/', (req, res) => {
    res.render('top.ejs');
});

// 一覧画面
app.get('/list', (req, res) => {
    connection.query(
        'select * from articles',
        (error, results) => {
            res.render('list.ejs', {articles: results});
        });
});

// 閲覧画面
app.get('/article/:id', (req, res) => {
    const id = req.params.id;
    connection.query(
        'select * from articles where id = ?',
        [id],
        (error, results) => {
            res.render('article.ejs', {article: results[0]});
        });
});

app.get('/login', (req, res) => {
    res.render('login.ejs');
});

app.post('/login', (req, res) => {
    // フォームから送信されるemail
    const email = req.body.email;
    // ユーザー情報取得
    connection.query(
        'select * from users where email = ?',
        [email],
        (error, results) => {
            // 配列resultsの要素数で処理分岐
            if (results.length > 0) {
                // login画面のパスワード
                const plain = req.body.password;
                // usersテーブルのハッシュ化パスワード
                const hash = results[0].password;

                // compareメソッドでパスワードを比較
                bcrypt.compare(plain, hash, (error, isEqual) => {
                    if (isEqual) {
                        // ユーザーIDをセッションに保存
                        req.session.userId = results[0].id;
                        // ユーザー名をセッション情報に保存
                        req.session.username = results[0].username;
                        res.redirect('/list');
                    } else {
                        res.redirect('/login');
                    }
                });
            } else {
                res.redirect('/login');
            }
        });
});

// ログアウト
app.get('/logout', (req, res) => {
    req.session.destroy((error) => {
        res.redirect('/list');
    });
});

// 新規投稿
app.get('/new', (req, res) => {
    res.render('new.ejs');
});

app.post('/create', (req, res) => {
    const title = req.body.title;
    const summary = req.body.summary;
    const content = req.body.content;
    const category = req.body.category;
    connection.query(
        'insert into articles (title, summary, content, category) values (?,?,?,?)',
        [title, summary, content, category],
        (error, results) => {
            res.redirect('/list');
        });
});

// 投稿削除
app.post('/delete/:id', (req, res) => {
    connection.query(
        'delete from articles where id = ?',
        [req.params.id],
        (error, results) => {            
            res.redirect('/list');
        });
});

// 編集画面
app.get(`/edit/:id`, (req, res) => {
    connection.query(
        'select * from articles where id = ?',
        [req.params.id],
        (error, results) => {
            res.render('edit.ejs', {article: results[0]});
        });
});

// 更新
app.post('/update/:id', (req, res) => {
    const title = req.body.title;
    const summary = req.body.summary;
    const content = req.body.content;
    const id = req.params.id;
    connection.query('update articles set title = ?, summary = ?, content = ? where id = ?',
    [title, summary, content, id],
    (error, results) => {
        res.redirect('/list');
    });
});

// 新規ユーザー登録画面
app.get('/signup', (req, res) => {
    res.render('signup.ejs', {errors: []});
});

// ユーザー登録
app.post('/signup', (req, res, next) => {
    // ユーザー登録時の値
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    // 空の配列
    const errors = [];

    // 空文字列か調べる
    if (username === '') {
        errors.push('ユーザー名が空です');
    }

    if (email === '') {
        errors.push('メールアドレスが空です');
    }
      
    if (password === '') {
        errors.push('パスワードが空です');
    }

    // errorsが0より大きい場合新規登録画面へリダイレクト
    if (errors.length > 0) {
        res.render('signup.ejs', {errors: errors});
    } else {
        next();
    }
  
},
(req, res, next) => {
    
    const email = req.body.email;

    const errors = [];

    connection.query(
        'select * from users where email = ?',
        [email],
        (error, results) => {
            if (results.length > 0) {
                errors.push('ユーザー登録に失敗しました');
                res.render('signup.ejs', {errors: errors});
            } else {
                next();
            }
        });
},
(req,res) => {

    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;

    // bcrypt.hashメソッドでpasswordをhash化
    bcrypt.hash(password, 10, (error, hash) => {
        connection.query(
            'insert into users (username, email, password) values (?,?,?)',
            [username, email, hash],
            (error, results) => {
                req.session.userId = results.insertId;
                req.session.username = username;
                res.redirect('/list');
            });
    });
});

app.listen(process.env.PORT || 3000);